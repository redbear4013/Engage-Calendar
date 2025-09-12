/**
 * Raw event data structure returned by Macau scrapers
 * This is the uniform interface all scrapers must implement
 */
export interface RawEvent {
  source: 'mgto' | 'londoner' | 'venetian' | 'galaxy' | 'mice' | 'broadway' | 'ai_scraper' | 'fallback_scraper'
  source_id: string         // stable per event (hash or canonical id)
  title: string
  description?: string
  start: string             // ISO (UTC)
  end?: string              // ISO (UTC)
  venue?: string
  city: string              // Allow any city for AI scraper
  url: string               // detail page URL
  ticket_url?: string       // if available
  image_url?: string        // event image if available
  price_min?: number
  categories?: string[]
}

/**
 * Result structure returned by scraper functions
 */
export interface ScrapingResult {
  success: boolean
  events: RawEvent[]
  errors: string[]
  metadata?: {
    scrapedAt: string
    totalFound: number
    processedCount: number
  }
}

/**
 * Rate limiting configuration for scrapers
 */
export interface RateLimitConfig {
  requestsPerSecond: number
  maxRetries: number
  retryDelayMs: number
}

/**
 * Common scraper interface that all Macau scrapers must implement
 */
export interface MacauScraper {
  /**
   * Fetch and parse events from the source
   */
  fetchAndParse(): Promise<RawEvent[]>
  
  /**
   * Get the source identifier
   */
  getSourceId(): 'mgto' | 'londoner' | 'venetian' | 'galaxy' | 'mice' | 'broadway'
  
  /**
   * Get rate limiting configuration for this source
   */
  getRateLimitConfig(): RateLimitConfig
}

/**
 * HTTP request configuration for scrapers
 */
export interface ScraperRequestConfig {
  url: string
  headers?: Record<string, string>
  timeout?: number
  followRedirects?: boolean
}

/**
 * Common error types for scrapers
 */
export enum ScraperErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  PARSE_ERROR = 'PARSE_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  AI_EXTRACTION_ERROR = 'AI_EXTRACTION_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR'
}

export class ScraperError extends Error {
  constructor(
    public type: ScraperErrorType,
    message: string,
    public source: string,
    public cause?: Error
  ) {
    super(message)
    this.name = 'ScraperError'
  }
}