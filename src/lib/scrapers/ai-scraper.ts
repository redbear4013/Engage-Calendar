import Firecrawl from '@mendable/firecrawl-js'
import { RawEvent, RateLimitConfig, ScraperError, ScraperErrorType } from './types'
import { BaseScraper } from './base-scraper'

/**
 * AI-powered scraper using Firecrawl for intelligent content extraction
 * Falls back to traditional CSS selector approach if AI extraction fails
 */
export class AIScraper extends BaseScraper {
  private firecrawl: Firecrawl | null = null
  private fallbackEnabled = true

  constructor(rateLimitConfig: RateLimitConfig, fallbackEnabled = true) {
    super(rateLimitConfig)
    this.fallbackEnabled = fallbackEnabled
    
    // Initialize Firecrawl if API key is available
    const apiKey = process.env.FIRECRAWL_API_KEY
    if (apiKey) {
      this.firecrawl = new Firecrawl({ apiKey })
      console.log('✅ AI Scraper initialized with Firecrawl API')
    } else {
      console.warn('⚠️  FIRECRAWL_API_KEY not found, will use fallback scraping only')
    }
  }

  /**
   * AI-powered event extraction with structured prompting
   */
  async extractEventsWithAI(url: string, context: EventExtractionContext): Promise<RawEvent[]> {
    if (!this.firecrawl) {
      throw new ScraperError(
        ScraperErrorType.CONFIGURATION_ERROR,
        'Firecrawl not initialized - API key missing',
        url
      )
    }

    try {
      console.log(`🤖 AI extracting events from: ${url}`)
      
      // Use Firecrawl's extraction with structured schema
      const result = await this.firecrawl.scrape(url, {
        formats: ['extract', 'markdown'],
        extract: {
          schema: this.getEventExtractionSchema(),
          prompt: this.buildExtractionPrompt(context),
          systemPrompt: this.buildSystemPrompt(context)
        }
      })

      if (!result.extract || !result.extract.events) {
        console.warn('⚠️  AI extraction returned no events, trying fallback')
        return this.fallbackEnabled ? await this.fallbackExtraction(url) : []
      }

      // Transform AI-extracted events to RawEvent format
      const events = this.transformAIEvents(result.extract.events, url, context)
      console.log(`✅ AI extracted ${events.length} events successfully`)
      
      return events

    } catch (error) {
      console.error('❌ AI extraction failed:', error)
      
      if (this.fallbackEnabled) {
        console.log('🔄 Falling back to traditional scraping...')
        return await this.fallbackExtraction(url)
      }
      
      throw new ScraperError(
        ScraperErrorType.AI_EXTRACTION_ERROR,
        `AI extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        url,
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Get the JSON schema for event extraction
   */
  private getEventExtractionSchema(): any {
    return {
      type: "object",
      properties: {
        events: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "The event title or name"
              },
              description: {
                type: "string",
                description: "Event description or summary"
              },
              startDate: {
                type: "string",
                description: "Event start date in any recognizable format (e.g., 'Sep 5-28', 'September 27', 'Oct 1')"
              },
              endDate: {
                type: "string",
                description: "Event end date if different from start date"
              },
              venue: {
                type: "string",
                description: "Event venue or location"
              },
              category: {
                type: "string",
                description: "Event category (festival, concert, exhibition, cultural, etc.)"
              },
              url: {
                type: "string",
                description: "Direct URL to event details page if available"
              },
              imageUrl: {
                type: "string",
                description: "URL to event image or poster"
              },
              tags: {
                type: "array",
                items: { type: "string" },
                description: "Relevant tags or keywords for the event"
              }
            },
            required: ["title", "startDate"]
          }
        }
      },
      required: ["events"]
    }
  }

  /**
   * Build extraction prompt based on context
   */
  private buildExtractionPrompt(context: EventExtractionContext): string {
    const basePrompt = `Extract all event information from this webpage. Focus on finding:`
    
    const requirements = [
      "- Event titles and names",
      "- Start and end dates (handle complex formats like 'Sep 5-28', 'Sep 6, 13, 20, Oct 1 & 6')",
      "- Event descriptions and summaries", 
      "- Venue or location information",
      "- Event categories (festivals, concerts, exhibitions, etc.)",
      "- Any direct links to event detail pages",
      "- Event images or posters"
    ]

    let contextualHints = ""
    if (context.expectedDateRange) {
      contextualHints += `\n- Pay special attention to events in ${context.expectedDateRange}`
    }
    if (context.specificPrefixes) {
      contextualHints += `\n- Look for events with prefixes like: ${context.specificPrefixes.join(', ')}`
    }
    if (context.excludePatterns) {
      contextualHints += `\n- Exclude navigation elements, language selectors, and generic UI text`
    }

    return basePrompt + "\n" + requirements.join("\n") + contextualHints
  }

  /**
   * Build system prompt for better extraction quality
   */
  private buildSystemPrompt(context: EventExtractionContext): string {
    return `You are an expert event data extraction system. Your task is to identify and extract structured event information from web pages.

Key principles:
1. Only extract actual events, not navigation links or UI elements
2. Handle complex date formats intelligently (e.g., date ranges, multiple dates)
3. Preserve all relevant details including venues, categories, and descriptions
4. If event dates span multiple days or have multiple occurrences, capture that information
5. Focus on events that would be interesting to people planning weekend activities

Source context: ${context.sourceName || 'Unknown source'}`
  }

  /**
   * Transform AI-extracted events to RawEvent format
   */
  private transformAIEvents(aiEvents: any[], sourceUrl: string, context: EventExtractionContext): RawEvent[] {
    return aiEvents.map((event, index) => {
      // Parse dates using existing date parsing logic
      const parsedDate = this.parseDateFromAI(event.startDate, event.endDate)
      
      // Generate source ID
      const sourceId = this.createSourceId(event.title, parsedDate.start, event.venue)
      
      // Categorize event
      const categories = this.categorizeEventFromAI(event.title, event.description, event.category, event.tags)

      const rawEvent: RawEvent = {
        source: context.sourceId || 'ai_scraper',
        source_id: sourceId,
        title: event.title || `Event ${index + 1}`,
        description: event.description || '',
        start: parsedDate.start || new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000).toISOString(),
        end: parsedDate.end,
        venue: event.venue,
        city: context.city || 'Unknown',
        url: event.url || sourceUrl,
        image_url: event.imageUrl,
        categories
      }

      return rawEvent
    })
  }

  /**
   * Parse dates from AI extraction
   */
  private parseDateFromAI(startDate: string, endDate?: string): { start: string | null; end: string | null } {
    try {
      // Use existing date parsing logic from date-macau.ts
      // For now, return basic parsing - can be enhanced
      const start = startDate ? new Date(startDate).toISOString() : null
      const end = endDate ? new Date(endDate).toISOString() : null
      
      return { start, end }
    } catch (error) {
      console.warn('Date parsing failed for AI extracted event:', { startDate, endDate })
      return { start: null, end: null }
    }
  }

  /**
   * Categorize events from AI extraction
   */
  private categorizeEventFromAI(title: string, description: string, category?: string, tags?: string[]): string[] {
    const categories: string[] = ['local_events']
    
    // Use AI-provided category if available
    if (category) {
      const normalizedCategory = category.toLowerCase()
      if (normalizedCategory.includes('festival')) categories.push('festivals')
      if (normalizedCategory.includes('concert') || normalizedCategory.includes('music')) categories.push('music')
      if (normalizedCategory.includes('exhibition') || normalizedCategory.includes('art')) categories.push('exhibitions')
      if (normalizedCategory.includes('cultural')) categories.push('cultural')
      if (normalizedCategory.includes('food')) categories.push('food')
      if (normalizedCategory.includes('sport')) categories.push('sports')
    }

    // Use tags if available
    if (tags) {
      tags.forEach(tag => {
        const normalizedTag = tag.toLowerCase()
        if (normalizedTag.includes('festival') && !categories.includes('festivals')) {
          categories.push('festivals')
        }
        if ((normalizedTag.includes('music') || normalizedTag.includes('concert')) && !categories.includes('music')) {
          categories.push('music')
        }
      })
    }

    // Fallback to text-based categorization
    if (categories.length === 1) {
      const content = (title + ' ' + description).toLowerCase()
      if (content.includes('festival')) categories.push('festivals')
      if (content.includes('concert') || content.includes('music')) categories.push('music')
      if (content.includes('exhibition') || content.includes('art')) categories.push('exhibitions')
      if (content.includes('cultural')) categories.push('cultural')
      if (content.includes('food')) categories.push('food')
      if (content.includes('sport')) categories.push('sports')
    }

    return categories
  }

  /**
   * Create source ID for deduplication
   */
  private createSourceId(title: string, startDate: string | null, venue?: string): string {
    const key = `${title}-${startDate}-${venue || ''}`.toLowerCase()
    return Buffer.from(key).toString('base64').substring(0, 16)
  }

  /**
   * Fallback to traditional scraping when AI fails
   */
  private async fallbackExtraction(url: string): Promise<RawEvent[]> {
    console.log('🔄 Using traditional CSS selector fallback...')
    
    try {
      // Use the existing makeRequest method from BaseScraper
      const response = await this.makeRequest({ url })
      const $ = this.parseHtml(response.data)
      
      // Basic event extraction using common selectors
      const events: RawEvent[] = []
      const eventElements = $('.event, .event-item, .calendar-event, article, .activity-item')
      
      eventElements.each((i, el) => {
        const $el = $(el)
        const text = this.safeText($el)
        
        // Basic event detection
        if (text && text.length > 20 && this.isValidEventTitle(text)) {
          const title = text.substring(0, 100) // Limit title length
          const event: RawEvent = {
            source: 'fallback_scraper',
            source_id: this.createSourceId(title, new Date().toISOString()),
            title,
            description: text,
            start: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString(),
            end: null,
            venue: undefined,
            city: 'Unknown',
            url,
            image_url: undefined,
            categories: ['local_events']
          }
          events.push(event)
        }
      })

      console.log(`🔄 Fallback extracted ${events.length} events`)
      return events.slice(0, 10) // Limit to prevent spam
      
    } catch (error) {
      console.error('❌ Fallback extraction also failed:', error)
      return []
    }
  }
}

/**
 * Context interface for AI extraction
 */
export interface EventExtractionContext {
  sourceId: string
  sourceName?: string
  city?: string
  expectedDateRange?: string
  specificPrefixes?: string[]
  excludePatterns?: string[]
}