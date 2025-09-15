import axios, { AxiosResponse } from 'axios'
import * as cheerio from 'cheerio'
import type { AnyNode } from 'domhandler'
import { chromium, Browser, Page } from 'playwright'
import { RateLimitConfig, ScraperRequestConfig, ScraperError, ScraperErrorType } from './types'

/**
 * Base scraper utility with common functionality
 * Provides rate limiting, retries, and error handling
 */
export class BaseScraper {
  private lastRequestTime = 0
  private requestQueue: Promise<any> = Promise.resolve()
  private browser: Browser | null = null

  constructor(private rateLimitConfig: RateLimitConfig) {}

  /**
   * Make a rate-limited HTTP request
   */
  async makeRequest(config: ScraperRequestConfig): Promise<AxiosResponse> {
    return this.requestQueue = this.requestQueue.then(async () => {
      await this.enforceRateLimit()
      return this.executeRequest(config)
    })
  }

  /**
   * Parse HTML content with Cheerio
   */
  parseHtml(html: string): cheerio.CheerioAPI {
    return cheerio.load(html)
  }

  /**
   * Create absolute URL from relative path
   */
  createAbsoluteUrl(baseUrl: string, path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path
    }
    
    const base = new URL(baseUrl)
    
    if (path.startsWith('/')) {
      return `${base.protocol}//${base.host}${path}`
    }
    
    return `${base.protocol}//${base.host}${base.pathname.replace(/\/[^/]*$/, '')}/${path}`
  }

  /**
   * Extract domain from URL for source ID generation
   */
  getDomainFromUrl(url: string): string {
    try {
      return new URL(url).hostname.replace('www.', '')
    } catch {
      return 'unknown-domain'
    }
  }

  /**
   * Clean and normalize text content
   */
  cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, ' ')
      .trim()
  }

  /**
   * Extract text content safely from Cheerio element
   */
  safeText($element: cheerio.Cheerio<AnyNode>): string {
    return this.cleanText($element.first().text() || '')
  }

  /**
   * Extract attribute value safely from Cheerio element
   */
  safeAttr($element: cheerio.Cheerio<AnyNode>, attr: string): string | undefined {
    const value = $element.first().attr(attr)
    return value ? value.trim() : undefined
  }

  /**
   * Enforce rate limiting between requests
   */
  private async enforceRateLimit(): Promise<void> {
    const minInterval = 1000 / this.rateLimitConfig.requestsPerSecond
    const timeSinceLastRequest = Date.now() - this.lastRequestTime
    
    if (timeSinceLastRequest < minInterval) {
      await new Promise(resolve => 
        setTimeout(resolve, minInterval - timeSinceLastRequest)
      )
    }
    
    this.lastRequestTime = Date.now()
  }

  /**
   * Execute HTTP request with retries
   */
  private async executeRequest(config: ScraperRequestConfig): Promise<AxiosResponse> {
    const { maxRetries, retryDelayMs } = this.rateLimitConfig
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await axios.get(config.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9,zh-TW;q=0.8,zh;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            ...config.headers
          },
          timeout: config.timeout || 10000,
          maxRedirects: config.followRedirects !== false ? 5 : 0,
          validateStatus: (status) => status < 500 // Retry on 5xx errors
        })

        if (response.status >= 400) {
          throw new ScraperError(
            ScraperErrorType.INVALID_RESPONSE,
            `HTTP ${response.status}: ${response.statusText}`,
            config.url
          )
        }

        return response
      } catch (error) {
        lastError = error as Error
        
        // Don't retry on 4xx errors or parsing errors
        if (axios.isAxiosError(error)) {
          if (error.response?.status && error.response.status < 500) {
            throw new ScraperError(
              ScraperErrorType.INVALID_RESPONSE,
              `HTTP ${error.response.status}: ${error.response.statusText}`,
              config.url,
              error
            )
          }
          
          if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            throw new ScraperError(
              ScraperErrorType.TIMEOUT_ERROR,
              'Request timeout',
              config.url,
              error
            )
          }
        }

        // Wait before retrying
        if (attempt < maxRetries) {
          await new Promise(resolve => 
            setTimeout(resolve, retryDelayMs * Math.pow(2, attempt))
          )
        }
      }
    }

    throw new ScraperError(
      ScraperErrorType.NETWORK_ERROR,
      `Failed after ${maxRetries + 1} attempts: ${lastError?.message}`,
      config.url,
      lastError || undefined
    )
  }

  /**
   * Extract multiple image URLs from an element using common selectors
   */
  protected extractImageUrls(
    $: cheerio.CheerioAPI,
    $element: cheerio.Cheerio<AnyNode>,
    baseUrl: string,
    maxImages = 3
  ): string[] {
    const imageSelectors = [
      'img[src]',
      '.image img[src]',
      '.event-image img[src]',
      '.thumbnail img[src]',
      '.poster img[src]',
      '.hero-image img[src]',
      '.main-image img[src]',
      '[style*="background-image"]'
    ]

    const images: string[] = []

    for (const selector of imageSelectors) {
      const $imgs = $element.find(selector)
      $imgs.each((_, el) => {
        if (images.length >= maxImages) return false

        let src = ''
        const $img = $(el)

        if (selector.includes('background-image')) {
          // Extract from CSS background-image
          const style = this.safeAttr($img, 'style') || ''
          const match = style.match(/background-image:\s*url\(['"]?([^'"()]+)['"]?\)/)
          if (match) {
            src = match[1]
          }
        } else {
          // Regular img src
          src = this.safeAttr($img, 'src') || ''
        }

        // Validate image URL
        if (
          src &&
          !src.includes('placeholder') &&
          !src.includes('default') &&
          !src.includes('logo') &&
          !src.includes('icon') &&
          !src.endsWith('.svg') &&
          src.length > 10
        ) {
          const absolute = this.createAbsoluteUrl(baseUrl, src)
          if (!images.includes(absolute)) {
            images.push(absolute)
          }
        }
      })

      if (images.length >= maxImages) break
    }

    return images
  }

  /**
   * Extract a single image URL for backward compatibility
   */
  protected extractImageUrl(
    $: cheerio.CheerioAPI,
    $element: cheerio.Cheerio<AnyNode>,
    baseUrl: string
  ): string | undefined {
    return this.extractImageUrls($, $element, baseUrl, 1)[0]
  }

  /**
   * Extract high-quality images from detail page meta tags and hero sections
   */
  protected extractDetailPageImages(
    $: cheerio.CheerioAPI,
    baseUrl: string,
    maxImages = 3
  ): string[] {
    const detailImageSelectors = [
      'meta[property="og:image"]',
      'meta[name="twitter:image"]',
      'meta[itemprop="image"]',
      '.hero-image img[src]',
      '.main-image img[src]',
      '.event-banner img[src]',
      '.featured-image img[src]',
      '.gallery img[src]',
      '.slideshow img[src]',
      '.event-header img[src]'
    ]

    const images: string[] = []

    for (const selector of detailImageSelectors) {
      const $imgs = $(selector)
      $imgs.each((_, el) => {
        if (images.length >= maxImages) return false

        let src = ''
        const $img = $(el)

        if (selector.includes('meta')) {
          src = this.safeAttr($img, 'content') || ''
        } else {
          src = this.safeAttr($img, 'src') || ''
        }

        if (
          src &&
          !src.includes('placeholder') &&
          !src.includes('default') &&
          !src.includes('logo') &&
          !src.includes('icon') &&
          src.length > 10
        ) {
          const absolute = this.createAbsoluteUrl(baseUrl, src)
          if (!images.includes(absolute)) {
            images.push(absolute)
          }
        }
      })

      if (images.length >= maxImages) break
    }

    return images
  }

  /**
   * Extract a single detail page image for backward compatibility
   */
  protected extractDetailPageImage(
    $: cheerio.CheerioAPI,
    baseUrl: string
  ): string | undefined {
    return this.extractDetailPageImages($, baseUrl, 1)[0]
  }

  /**
   * Validates if a title is likely a real event and not navigation/language elements
   */
  protected isValidEventTitle(title: string): boolean {
    if (!title || title.length < 3) {
      return false
    }
    
    const cleanTitle = title.trim().toLowerCase()
    
    // Language codes and language names to exclude
    const languageTerms = [
      'en', 'english', 'eng',
      'zh', 'chinese', '中文', '繁體中文', '简体中文',
      'pt', 'portuguese', 'português',
      'ภาษาไทย', 'thai', 'ไทย',
      'bahasa indonesia', 'indonesian', 'indonesia',
      'français', 'french', 'fr',
      'español', 'spanish', 'es',
      'deutsch', 'german', 'de',
      'italiano', 'italian', 'it',
      'русский', 'russian', 'ru',
      '日本語', 'japanese', 'jp', 'ja',
      '한국어', 'korean', 'ko', 'kr'
    ]
    
    // Common navigation and UI elements to exclude
    const navigationTerms = [
      'see details', 'see more', 'view details', 'learn more',
      'click here', 'read more', 'more info',
      'entertainment', 'shows', 'tickets', 'tickets & shows',
      'calendar', 'schedule', 'booking', // Removed 'events' to allow actual event names
      'home', 'about', 'contact', 'menu', 'search',
      'login', 'register', 'sign in', 'sign up',
      'privacy', 'terms', 'policy', 'cookies',
      'loading', 'please wait', 'error',
      'close', 'open', 'toggle', 'expand', 'collapse'
    ]
    
    // Check if title matches any exclusion patterns
    const allExcludedTerms = [...languageTerms, ...navigationTerms]
    
    for (const term of allExcludedTerms) {
      if (cleanTitle === term || cleanTitle.includes(term)) {
        return false
      }
    }
    
    // Exclude titles that are only numbers or special characters
    if (/^[\d\s\-_.,!@#$%^&*()]+$/.test(cleanTitle)) {
      return false
    }
    
    return true
  }

  /**
   * Initialize browser instance for JavaScript rendering
   */
  private async initializeBrowser(): Promise<Browser> {
    if (!this.browser) {
      try {
        this.browser = await chromium.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'] // For Linux environments
        })
      } catch (error) {
        throw new ScraperError(
          ScraperErrorType.NETWORK_ERROR,
          `Failed to initialize browser: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'browser',
          error instanceof Error ? error : undefined
        )
      }
    }
    return this.browser
  }

  /**
   * Make a browser-based request with JavaScript rendering
   */
  async makeBrowserRequest(config: ScraperRequestConfig & { 
    waitForSelector?: string 
    waitTimeout?: number
  }): Promise<string> {
    return this.requestQueue = this.requestQueue.then(async () => {
      await this.enforceRateLimit()
      return this.executeBrowserRequest(config)
    })
  }

  /**
   * Execute browser request with retries and error handling
   */
  private async executeBrowserRequest(config: ScraperRequestConfig & { 
    waitForSelector?: string 
    waitTimeout?: number
  }): Promise<string> {
    const { maxRetries, retryDelayMs } = this.rateLimitConfig
    let lastError: Error | null = null
    let page: Page | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const browser = await this.initializeBrowser()
        page = await browser.newPage()

        // Set user agent to mimic real browser
        await page.setExtraHTTPHeaders({
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        })

        // Navigate to page with timeout
        const response = await page.goto(config.url, {
          timeout: config.timeout || 30000,
          waitUntil: 'domcontentloaded'
        })

        if (!response || response.status() >= 400) {
          throw new ScraperError(
            ScraperErrorType.INVALID_RESPONSE,
            `HTTP ${response?.status()}: ${response?.statusText()}`,
            config.url
          )
        }

        // Wait for specific selector if provided
        if (config.waitForSelector) {
          try {
            await page.waitForSelector(config.waitForSelector, {
              timeout: config.waitTimeout || 10000
            })
          } catch (error) {
            console.warn(`Selector "${config.waitForSelector}" not found, continuing anyway`)
          }
        }

        // Get page content after JavaScript execution
        const content = await page.content()
        await page.close()

        return content

      } catch (error) {
        lastError = error as Error
        
        if (page) {
          await page.close().catch(() => {}) // Cleanup on error
        }

        // Don't retry on 4xx errors
        if (error instanceof Error && error.message.includes('HTTP 4')) {
          throw error
        }

        // Wait before retrying
        if (attempt < maxRetries) {
          await new Promise(resolve => 
            setTimeout(resolve, retryDelayMs * Math.pow(2, attempt))
          )
        }
      }
    }

    throw new ScraperError(
      ScraperErrorType.NETWORK_ERROR,
      `Browser request failed after ${maxRetries + 1} attempts: ${lastError?.message}`,
      config.url,
      lastError || undefined
    )
  }

  /**
   * Clean up browser instance
   */
  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }


  /**
   * Hybrid scraping: try traditional HTTP first, fallback to browser if needed
   */
  async makeHybridRequest(config: ScraperRequestConfig & {
    fallbackToBrowser?: boolean
    waitForSelector?: string
    minExpectedElements?: number
  }): Promise<{ content: string, usedBrowser: boolean }> {
    try {
      // First try traditional HTTP request
      const httpResponse = await this.makeRequest(config)
      const $ = this.parseHtml(httpResponse.data)
      
      // Check if we got meaningful content
      const hasContent = config.minExpectedElements ? 
        $('*').length >= config.minExpectedElements :
        httpResponse.data.length > 1000

      if (hasContent && !config.fallbackToBrowser) {
        return { content: httpResponse.data, usedBrowser: false }
      }

      // If content seems insufficient and browser fallback is enabled, use browser
      if (config.fallbackToBrowser) {
        console.log(`Traditional scraping found limited content, falling back to browser for: ${config.url}`)
        const browserContent = await this.makeBrowserRequest(config)
        return { content: browserContent, usedBrowser: true }
      }

      return { content: httpResponse.data, usedBrowser: false }

    } catch (error) {
      // If HTTP fails and browser fallback is enabled, try browser
      if (config.fallbackToBrowser) {
        console.log(`HTTP request failed, falling back to browser for: ${config.url}`)
        const browserContent = await this.makeBrowserRequest(config)
        return { content: browserContent, usedBrowser: true }
      }
      throw error
    }
  }
}