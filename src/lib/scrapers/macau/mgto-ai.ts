import { AIScraper, EventExtractionContext } from '../ai-scraper'
import { RawEvent, MacauScraper, RateLimitConfig } from '../types'
import { parseMacauDate, createSourceId } from '../../date-macau'

const MGTO_URL = 'https://www.macaotourism.gov.mo/en/events/calendar'
const BASE_URL = 'https://www.macaotourism.gov.mo'

/**
 * AI-powered MGTO scraper using Firecrawl for intelligent event extraction
 * Specifically designed to handle the complex date formats and layout of MGTO website
 */
export class MGTOAIScraper extends AIScraper implements MacauScraper {
  private readonly sourceId = 'mgto'

  constructor() {
    super({
      requestsPerSecond: 0.5, // Conservative rate limit for government site
      maxRetries: 3,
      retryDelayMs: 2000
    })
  }

  getSourceId(): 'mgto' {
    return this.sourceId
  }

  getRateLimitConfig(): RateLimitConfig {
    return {
      requestsPerSecond: 0.5,
      maxRetries: 3,
      retryDelayMs: 2000
    }
  }

  async fetchAndParse(): Promise<RawEvent[]> {
    console.log('🤖 AI-powered MGTO scraper starting...')
    
    const context: EventExtractionContext = {
      sourceId: this.sourceId,
      sourceName: 'Macau Government Tourism Office',
      city: 'Macau',
      expectedDateRange: 'September 2024 to future months',
      specificPrefixes: ['Major Event', 'Public Holiday'],
      excludePatterns: ['language selectors', 'navigation elements']
    }

    try {
      // Use AI extraction first
      const events = await this.extractEventsWithAI(MGTO_URL, context)
      
      // Post-process events with Macau-specific logic
      const processedEvents = await this.postProcessMGTOEvents(events)
      
      console.log(`✅ MGTO AI scraper completed: ${processedEvents.length} events`)
      return processedEvents

    } catch (error) {
      console.error('❌ MGTO AI scraper failed:', error)
      
      // If AI completely fails, try to get at least some events via fallback
      console.log('🔄 Attempting enhanced fallback for MGTO...')
      return await this.enhancedMGTOFallback()
    }
  }

  /**
   * Post-process AI-extracted events with Macau-specific enhancements
   */
  private async postProcessMGTOEvents(events: RawEvent[]): Promise<RawEvent[]> {
    return events.map(event => {
      // Debug logging for major September events
      if (event.title.includes('Fringe Festival') || event.title.includes('Fireworks Display Contest')) {
        console.log(`🎯 Processing major event: "${event.title}"`)
        console.log(`   Original start: ${event.start}`)
      }
      
      // Re-parse dates using Macau-specific date parser
      let enhancedEvent = { ...event }
      
      // Try to extract better date information from title if available
      const titleDateMatch = event.title.match(/(\w{3}\s+\d{1,2}(-\d{1,2})?|\w{3}\s+\d{1,2},\s*\d{1,2})/i)
      if (titleDateMatch) {
        const dateText = titleDateMatch[0]
        console.log(`🗓️  Re-parsing date from title: "${dateText}" for event: "${event.title}"`)
        const parsedDate = parseMacauDate(dateText)
        if (parsedDate.start) {
          enhancedEvent.start = parsedDate.start
          enhancedEvent.end = parsedDate.end
          console.log(`✅ Date re-parsed successfully: ${parsedDate.start}`)
        } else {
          console.log(`❌ Date re-parsing failed for: "${dateText}"`)
        }
      }

      // Generate better source_id using Macau-specific logic
      enhancedEvent.source_id = createSourceId(
        event.title, 
        enhancedEvent.start, 
        event.venue, 
        'macaotourism.gov.mo'
      )

      // Enhance categories with MGTO-specific categorization
      enhancedEvent.categories = this.categorizeMGTOEvent(event.title, event.description || '')

      // Ensure URL is absolute
      if (enhancedEvent.url && !enhancedEvent.url.startsWith('http')) {
        enhancedEvent.url = this.createAbsoluteUrl(BASE_URL, enhancedEvent.url)
      }
      
      // Debug logging for final event processing
      if (event.title.includes('Fringe Festival') || event.title.includes('Fireworks Display Contest')) {
        console.log(`🎯 Final processed event: "${enhancedEvent.title}", start: ${enhancedEvent.start}`)
      }

      return enhancedEvent
    })
  }

  /**
   * Enhanced fallback specifically for MGTO site structure
   */
  private async enhancedMGTOFallback(): Promise<RawEvent[]> {
    try {
      console.log('🔧 Enhanced MGTO fallback: attempting targeted CSS extraction...')
      
      const response = await this.makeRequest({ url: MGTO_URL, timeout: 15000 })
      const $ = this.parseHtml(response.data)
      const events: RawEvent[] = []

      // Use the specific selectors we know work for MGTO
      const eventSelectors = [
        '.cx-col-xl-3.cx-col-lg-4.cx-div',
        'div[class*="cx-col"]',
        '.cx-t01.cx-list--sm.-fade'
      ]

      for (const selector of eventSelectors) {
        const elements = $(selector)
        console.log(`🔍 Found ${elements.length} elements with selector: ${selector}`)
        
        elements.each((i, el) => {
          const $el = $(el)
          const text = this.safeText($el)
          
          // Look specifically for September events that were missed
          if (text && this.containsSeptemberEvents(text)) {
            const event = this.parseEnhancedMGTOEvent(text, i, MGTO_URL)
            if (event) {
              events.push(event)
              console.log(`✅ Enhanced fallback found: ${event.title}`)
            }
          }
        })

        if (events.length > 0) break // Stop at first successful selector
      }

      return events.slice(0, 20) // Limit results

    } catch (error) {
      console.error('❌ Enhanced MGTO fallback also failed:', error)
      return []
    }
  }

  /**
   * Check if text contains September events
   */
  private containsSeptemberEvents(text: string): boolean {
    const cleanText = text.toLowerCase()
    return (
      cleanText.includes('sep') || 
      cleanText.includes('september')
    ) && (
      cleanText.includes('festival') ||
      cleanText.includes('fringe') ||
      cleanText.includes('fireworks') ||
      cleanText.includes('tourism') ||
      cleanText.includes('celebration') ||
      cleanText.includes('major event')
    )
  }

  /**
   * Parse MGTO event using enhanced logic
   */
  private parseEnhancedMGTOEvent(text: string, index: number, url: string): RawEvent | null {
    try {
      const cleanText = text.replace(/\s+/g, ' ').trim()
      
      // Enhanced regex patterns for MGTO-specific formats
      const patterns = [
        // Pattern 1: "Major Event Sep 5-28 23rd Macao City Fringe Festival"
        /^Major Event\s+([A-Za-z]{3}\s+[^A-Za-z]*(?:\d+[^A-Za-z]*)*(?:[A-Za-z]{3}[^A-Za-z]*\d+[^A-Za-z]*)*)\s+(.+)$/i,
        // Pattern 2: "Sep 27 Celebration Activities for World Tourism Day"
        /^((?:Sep|Sept|September)\s+\d{1,2}(-\d{1,2})?)\s+(.+)$/i,
        // Pattern 3: "Public Holiday Sep 15 Mid-Autumn Festival"
        /^Public Holiday\s+([A-Za-z]{3}\s+\d{1,2})\s+(.+)$/i
      ]

      let dateText = ''
      let title = ''

      for (const pattern of patterns) {
        const match = cleanText.match(pattern)
        if (match) {
          dateText = match[1].trim()
          title = match[2] ? match[2].trim() : match[3]?.trim() || ''
          console.log(`🎯 Enhanced pattern matched: "${cleanText}" → title="${title}", date="${dateText}"`)
          break
        }
      }

      if (!title || !this.isValidEventTitle(title)) {
        return null
      }

      // Parse date with Macau timezone handling
      const parsedDate = parseMacauDate(dateText)
      
      const event: RawEvent = {
        source: 'mgto',
        source_id: createSourceId(title, parsedDate.start, undefined, 'macaotourism.gov.mo'),
        title: title,
        description: `Event from Macau Government Tourism Office: ${cleanText}`,
        start: parsedDate.start || new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000).toISOString(),
        end: parsedDate.end,
        venue: undefined,
        city: 'Macau',
        url: url,
        image_url: undefined,
        categories: this.categorizeMGTOEvent(title, cleanText)
      }

      return event

    } catch (error) {
      console.warn(`Failed to parse enhanced MGTO event ${index}:`, error)
      return null
    }
  }

  /**
   * MGTO-specific event categorization
   */
  private categorizeMGTOEvent(title: string, description: string): string[] {
    const content = (title + ' ' + description).toLowerCase()
    const categories: string[] = ['local_events']

    // MGTO-specific categories
    if (content.includes('fringe') || content.includes('festival') || content.includes('carnival')) {
      categories.push('festivals')
    }
    if (content.includes('fireworks') || content.includes('display')) {
      categories.push('festivals', 'entertainment')
    }
    if (content.includes('tourism') || content.includes('celebration')) {
      categories.push('cultural')
    }
    if (content.includes('exhibition') || content.includes('museum')) {
      categories.push('exhibitions')
    }
    if (content.includes('concert') || content.includes('music') || content.includes('performance')) {
      categories.push('music')
    }
    if (content.includes('cultural') || content.includes('heritage') || content.includes('traditional')) {
      categories.push('cultural')
    }
    if (content.includes('holiday') || content.includes('public holiday')) {
      categories.push('cultural', 'public_holidays')
    }

    return categories
  }
}