import axios, { AxiosResponse } from 'axios'
import * as cheerio from 'cheerio'
import { RateLimitConfig, ScraperRequestConfig, ScraperError, ScraperErrorType } from './types'

/**
 * Base scraper utility with common functionality
 * Provides rate limiting, retries, and error handling
 */
export class BaseScraper {
  private lastRequestTime = 0
  private requestQueue: Promise<any> = Promise.resolve()

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
  safeText($element: cheerio.Cheerio<cheerio.Element>): string {
    return this.cleanText($element.first().text() || '')
  }

  /**
   * Extract attribute value safely from Cheerio element
   */
  safeAttr($element: cheerio.Cheerio<cheerio.Element>, attr: string): string | undefined {
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
   * Extract image URL from element using common selectors
   */
  protected extractImageUrl($: cheerio.CheerioAPI, $element: cheerio.Cheerio<cheerio.Element>, baseUrl: string): string | undefined {
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
    
    for (const selector of imageSelectors) {
      const $img = $element.find(selector).first()
      if ($img.length > 0) {
        let src = ''
        
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
        if (src && 
            !src.includes('placeholder') && 
            !src.includes('default') && 
            !src.includes('logo') &&
            !src.includes('icon') &&
            !src.endsWith('.svg') &&
            src.length > 10) {
          return this.createAbsoluteUrl(baseUrl, src)
        }
      }
    }
    
    return undefined
  }

  /**
   * Extract high-quality image from detail page meta tags and hero sections
   */
  protected extractDetailPageImage($: cheerio.CheerioAPI, baseUrl: string): string | undefined {
    const detailImageSelectors = [
      'meta[property="og:image"]',
      'meta[name="twitter:image"]',
      'meta[itemprop="image"]',
      '.hero-image img[src]',
      '.main-image img[src]',
      '.event-banner img[src]',
      '.featured-image img[src]',
      '.gallery img[src]:first',
      '.slideshow img[src]:first',
      '.event-header img[src]'
    ]
    
    for (const selector of detailImageSelectors) {
      const $img = $(selector).first()
      if ($img.length > 0) {
        let src = ''
        
        if (selector.includes('meta')) {
          src = this.safeAttr($img, 'content') || ''
        } else {
          src = this.safeAttr($img, 'src') || ''
        }
        
        if (src && 
            !src.includes('placeholder') && 
            !src.includes('default') && 
            !src.includes('logo') &&
            !src.includes('icon') &&
            src.length > 10) {
          return this.createAbsoluteUrl(baseUrl, src)
        }
      }
    }
    
    return undefined
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
}