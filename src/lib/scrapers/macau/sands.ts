import { BaseScraper } from '../base-scraper'
import { RawEvent, RateLimitConfig, MacauScraper, ScraperError, ScraperErrorType } from '../types'
import { parseMacauDate, createSourceId } from '../../date-macau'

const LONDONER_URL = 'https://www.londonermacao.com/macau-events-shows'
const VENETIAN_URL = 'https://www.venetianmacao.com/entertainment.html'

export class SandsScraper extends BaseScraper implements MacauScraper {
  constructor(
    private venue: 'londoner' | 'venetian',
    private baseUrl: string,
    private eventsUrl: string
  ) {
    super({
      requestsPerSecond: 1, // Moderate rate limit for casino sites
      maxRetries: 3,
      retryDelayMs: 1500
    })
  }

  getSourceId(): 'londoner' | 'venetian' {
    return this.venue
  }

  getRateLimitConfig(): RateLimitConfig {
    return {
      requestsPerSecond: 1,
      maxRetries: 3,
      retryDelayMs: 1500
    }
  }

  async fetchAndParse(): Promise<RawEvent[]> {
    try {
      console.log(`Fetching ${this.venue} events from:`, this.eventsUrl)
      
      const response = await this.makeRequest({
        url: this.eventsUrl,
        timeout: 12000
      })

      const $ = this.parseHtml(response.data)
      const events: RawEvent[] = []

      // Look for event containers - focus on date-containing elements
      let eventElements = $()
      
      // For Venetian/Londoner sites, look for ALL entertainment events
      if (this.eventsUrl.includes('venetian') || this.eventsUrl.includes('londoner')) {
        console.log(`🔍 ${this.venue}: Starting comprehensive event detection...`)
        
        // Look for div elements containing ANY date patterns or entertainment content
        let allDivs = $('div').filter((i, el) => {
          const text = $(el).text()
          const hasDate = /\b\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\b/i.test(text)
          const hasShowInfo = /(?:show|concert|performance|live|tour|arena|from\s+mop)/i.test(text)
          const hasTimeInfo = /\d{1,2}:\d{2}(?:am|pm)/i.test(text)
          
          if (hasDate || hasShowInfo || hasTimeInfo) {
            console.log(`📅 ${this.venue}: Found potential event element with text: "${text.substring(0, 100)}..."`)
            console.log(`   - Has Date: ${hasDate}, Has Show Info: ${hasShowInfo}, Has Time: ${hasTimeInfo}`)
          }
          
          return hasDate || hasShowInfo || hasTimeInfo
        })
        
        // Deduplicate by finding unique events (by event title)
        const uniqueEvents = new Map()
        allDivs.each((i, el) => {
          const text = $(el).text().trim()
          const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
          
          // Find the title line (first substantial line that's not venue/date/price)
          let title = ''
          for (const line of lines) {
            if (!line.includes('Venetian Arena') && 
                !line.includes('Londoner') && 
                !/^\d{1,2}\s+\w+\s+\d{4}/.test(line) &&
                !/^From\s+MOP/.test(line) &&
                !line.includes('See Details') &&
                line.length > 10) {
              title = line
              break
            }
          }
          
          if (title && !uniqueEvents.has(title)) {
            // Find the most detailed element for this title (one with most text)
            const existing = uniqueEvents.get(title)
            if (!existing || text.length > existing.text.length) {
              uniqueEvents.set(title, { element: el, text })
            }
          }
        })
        
        // Convert back to cheerio elements
        eventElements = $()
        uniqueEvents.forEach(({ element }) => {
          eventElements = eventElements.add(element)
        })
        
        console.log(`🎯 ${this.venue}: Found ${allDivs.length} potential event elements, deduplicated to ${eventElements.length} unique events`)
        
        // Log details about each unique event found
        uniqueEvents.forEach((eventData, title) => {
          console.log(`📋 ${this.venue}: Unique event - Title: "${title}"`)
        })
        
        // If no September events, look for any events with dates
        if (eventElements.length === 0) {
          eventElements = $('div').filter((i, el) => {
            const text = $(el).text()
            return /\b\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/i.test(text)
          })
          console.log(`Fallback: found ${eventElements.length} events with any dates`)
        }
      } else {
        // For other Sands properties, use generic selectors
        const eventSelectors = [
          '.event-card',
          '.event-item',
          '.show-item',
          '.entertainment-item',
          '.event-listing',
          '[data-event]',
          '.card[href]',
          '.event-block'
        ]

        for (const selector of eventSelectors) {
          const found = $(selector)
          if (found.length > 0) {
            eventElements = found
            console.log(`Found ${found.length} events with selector: ${selector}`)
            break
          }
        }

        // Fallback to looking for links that might be events
        if (eventElements.length === 0) {
          eventElements = $('a').filter((i, el) => {
            const href = $(el).attr('href') || ''
            const text = $(el).text().toLowerCase()
            return href.includes('show') || 
                   href.includes('event') || 
                   href.includes('entertainment') ||
                   text.includes('show') ||
                   text.includes('concert') ||
                   text.includes('performance')
          })
          console.log(`Fallback: found ${eventElements.length} potential event links`)
        }
      }

      // Process each event element
      console.log(`🔄 ${this.venue}: Processing ${Math.min(eventElements.length, 15)} event elements...`)
      for (let i = 0; i < Math.min(eventElements.length, 15); i++) {
        const $element = eventElements.eq(i)
        console.log(`📝 ${this.venue}: Processing event ${i + 1}/${Math.min(eventElements.length, 15)}...`)
        
        const eventData = await this.parseEventElement($, $element, i)
        
        if (eventData) {
          console.log(`✅ ${this.venue}: Event ${i + 1} parsed successfully: "${eventData.title}"`)
          events.push(eventData)
          
          // Try to get more details from event detail page
          if (eventData.url && eventData.url !== this.eventsUrl) {
            console.log(`🔍 ${this.venue}: Enriching details for: "${eventData.title}"`)
            const detailedEvent = await this.enrichFromDetailPage(eventData)
            if (detailedEvent) {
              events[events.length - 1] = detailedEvent
              console.log(`✨ ${this.venue}: Enhanced event details for: "${detailedEvent.title}"`)
            }
          }
        } else {
          console.log(`❌ ${this.venue}: Event ${i + 1} failed parsing - event was null`)
        }
      }

      console.log(`${this.venue} scraper found ${events.length} events`)
      return events

    } catch (error) {
      console.error(`${this.venue} scraper error:`, error)
      throw new ScraperError(
        ScraperErrorType.PARSE_ERROR,
        `Failed to scrape ${this.venue} events: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.venue,
        error instanceof Error ? error : undefined
      )
    }
  }

  private async parseEventElement($: cheerio.CheerioAPI, $element: cheerio.Cheerio<cheerio.Element>, index: number): Promise<RawEvent | null> {
    try {
      console.log(`🔬 ${this.venue}: Parsing event ${index + 1} - element text: "${$element.text().substring(0, 200)}..."`)
      
      // Extract basic information
      let title = ''
      let eventUrl = ''
      let description = ''
      let dateText = ''
      let venue = ''
      let ticketUrl = ''

      // Try to find title
      const titleSelectors = ['h1', 'h2', 'h3', '.title', '.event-title', '.show-title', '[class*="title"]']
      for (const selector of titleSelectors) {
        const $title = $element.find(selector).first()
        if ($title.length > 0) {
          title = this.safeText($title)
          break
        }
      }

      // If no title found in children, use element text or link text
      if (!title) {
        if ($element.is('a')) {
          title = this.safeText($element)
          eventUrl = this.safeAttr($element, 'href') || ''
        } else {
          const $link = $element.find('a').first()
          if ($link.length > 0) {
            title = this.safeText($link)
            eventUrl = this.safeAttr($link, 'href') || ''
          } else {
            const elementText = this.safeText($element)
            console.log(`📝 ${this.venue}: Extracting title from element text: "${elementText.substring(0, 300)}..."`)
            
            // For Venetian events, extract title from the beginning of the text before venue/date info
            if (this.eventsUrl.includes('venetian') || this.eventsUrl.includes('londoner')) {
              // Split by newlines and take the first substantial line as title
              const lines = elementText.split('\n').map(l => l.trim()).filter(l => l.length > 0)
              console.log(`📝 ${this.venue}: Split into ${lines.length} lines:`, lines.slice(0, 5))
              
              for (const line of lines) {
                // Skip lines that are just venue names or dates
                const skipVenue = line.includes('Venetian Arena') || line.includes('Londoner')
                const skipDate = /^\d{1,2}\s+\w+\s+\d{4}/.test(line)
                const skipPrice = /^From\s+MOP/.test(line)
                const tooShort = line.length <= 10
                
                console.log(`📝 ${this.venue}: Checking line "${line}" - skip venue: ${skipVenue}, skip date: ${skipDate}, skip price: ${skipPrice}, too short: ${tooShort}`)
                
                if (!skipVenue && !skipDate && !skipPrice && !tooShort) {
                  title = line
                  console.log(`📝 ${this.venue}: Selected title from line: "${title}"`)
                  break
                }
              }
            }
            if (!title) {
              title = elementText
              console.log(`📝 ${this.venue}: Using full element text as title: "${title.substring(0, 100)}..."`)
            }
          }
        }
      }

      // Get event URL if not already found
      if (!eventUrl) {
        eventUrl = this.safeAttr($element, 'href') || 
                  this.safeAttr($element.find('a').first(), 'href') || ''
      }

      // Convert to absolute URL
      if (eventUrl) {
        eventUrl = this.createAbsoluteUrl(this.baseUrl, eventUrl)
      } else {
        eventUrl = this.eventsUrl
      }

      // Extract description
      const descSelectors = ['.description', '.summary', '.content', '.excerpt', 'p']
      for (const selector of descSelectors) {
        const $desc = $element.find(selector).first()
        if ($desc.length > 0) {
          description = this.safeText($desc)
          break
        }
      }

      // Extract date information
      const dateSelectors = ['.date', '.event-date', '.show-date', '[class*="date"]', '.when', '.time']
      for (const selector of dateSelectors) {
        const $date = $element.find(selector).first()
        if ($date.length > 0) {
          dateText = this.safeText($date)
          break
        }
      }
      
      // For Venetian/Londoner, extract dates directly from element text if no specific date element found
      if (!dateText && (this.eventsUrl.includes('venetian') || this.eventsUrl.includes('londoner'))) {
        const elementText = this.safeText($element)
        console.log(`📅 ${this.venue}: Extracting date from element text: "${elementText.substring(0, 200)}..."`)
        
        // Enhanced date patterns for various entertainment formats
        const datePatterns = [
          // Standard format: "20 September 2025, 8:00pm"
          /\b(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}(?:,\s*\d{1,2}:\d{2}(?:am|pm)?)?)/i,
          
          // Range format: "27 - 28 September 2025, 6:00pm" 
          /\b(\d{1,2}\s*-\s*\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}(?:,\s*\d{1,2}:\d{2}(?:am|pm)?)?)/i,
          
          // Short format: "10 October 2025"
          /\b(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/i,
          
          // Daily format: "Daily 11:00am – 7:00pm"
          /(Daily\s+\d{1,2}:\d{2}(?:am|pm)?\s*[–-]\s*\d{1,2}:\d{2}(?:am|pm)?)/i,
        ]
        
        for (const pattern of datePatterns) {
          const dateMatch = elementText.match(pattern)
          if (dateMatch) {
            dateText = dateMatch[1]
            console.log(`📅 ${this.venue}: Found date pattern: "${dateText}"`)
            break
          }
        }
        
        if (!dateText) {
          console.log(`📅 ${this.venue}: No date pattern found in element text`)
        }
      }

      // Extract venue info
      const venueSelectors = ['.venue', '.location', '.where', '[class*="venue"]', '[class*="location"]']
      for (const selector of venueSelectors) {
        const $venue = $element.find(selector).first()
        if ($venue.length > 0) {
          venue = this.safeText($venue)
          break
        }
      }

      // Look for ticket links
      const $ticketLink = $element.find('a[href*="ticket"], a[href*="booking"], a[href*="purchase"]').first()
      if ($ticketLink.length > 0) {
        ticketUrl = this.createAbsoluteUrl(this.baseUrl, this.safeAttr($ticketLink, 'href') || '')
      }

      // Parse the date
      console.log(`📅 ${this.venue}: Parsing date "${dateText}" for event "${title}"`)
      const parsedDate = parseMacauDate(dateText)
      console.log(`📅 ${this.venue}: Date parsing result:`, parsedDate)

      // Validate title to exclude language selectors and navigation elements
      console.log(`🔍 ${this.venue}: Validating title: "${title}"`)
      const titleValid = this.isValidVenetianEventTitle(title)
      console.log(`🔍 ${this.venue}: Title validation result: ${titleValid}`)
      
      if (!titleValid) {
        console.log(`❌ ${this.venue}: Event rejected due to invalid title: "${title}"`)
        return null
      }

      // Set default venue if none found
      if (!venue) {
        venue = this.venue === 'londoner' ? 'The Londoner Macao' : 'The Venetian Macao'
      }

      // Determine categories
      const categories = this.categorizeEvent(title, description, this.venue)

      const event: RawEvent = {
        source: this.venue,
        source_id: createSourceId(title, parsedDate.start, venue, this.getDomainFromUrl(this.baseUrl)),
        title: title || `${this.venue} Event ${index + 1}`,
        description: description || `Entertainment event at ${venue}`,
        start: parsedDate.start || new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000).toISOString(),
        end: parsedDate.end,
        venue: venue,
        city: 'Macau',
        url: eventUrl,
        ticket_url: ticketUrl || undefined,
        image_url: this.extractImageUrl($, $element, this.baseUrl),
        categories
      }

      return event

    } catch (error) {
      console.warn(`Failed to parse ${this.venue} event ${index}:`, error)
      return null
    }
  }

  private async enrichFromDetailPage(event: RawEvent): Promise<RawEvent | null> {
    try {
      if (!event.url || event.url === this.eventsUrl) {
        return null
      }

      console.log(`Fetching details for: ${event.title}`)
      const response = await this.makeRequest({
        url: event.url,
        timeout: 10000
      })

      const $ = this.parseHtml(response.data)

      // Look for more detailed information on the event page
      let enhancedDescription = event.description
      let enhancedDate = event.start
      let enhancedVenue = event.venue
      let ticketUrl = event.ticket_url

      // Try to find better description
      const descriptionSelectors = [
        '.event-description',
        '.content-main',
        '.description',
        '.details',
        'meta[property="og:description"]'
      ]
      
      for (const selector of descriptionSelectors) {
        const $desc = $(selector).first()
        if ($desc.length > 0) {
          const text = selector.includes('meta') 
            ? this.safeAttr($desc, 'content') || ''
            : this.safeText($desc)
          
          if (text && text.length > (enhancedDescription?.length || 0)) {
            enhancedDescription = text
            break
          }
        }
      }

      // Look for "DATE & TIME" and "VENUE" sections common in Sands properties
      const $dateTimeSection = $('h3, h4, .section-title').filter((i, el) => {
        return $(el).text().toLowerCase().includes('date') && $(el).text().toLowerCase().includes('time')
      }).first()
      
      if ($dateTimeSection.length > 0) {
        const $dateContent = $dateTimeSection.nextAll('p, div').first()
        if ($dateContent.length > 0) {
          const dateText = this.safeText($dateContent)
          const parsedDate = parseMacauDate(dateText)
          if (parsedDate.start) {
            enhancedDate = parsedDate.start
          }
        }
      }

      const $venueSection = $('h3, h4, .section-title').filter((i, el) => {
        return $(el).text().toLowerCase().includes('venue') || $(el).text().toLowerCase().includes('location')
      }).first()
      
      if ($venueSection.length > 0) {
        const $venueContent = $venueSection.nextAll('p, div').first()
        if ($venueContent.length > 0) {
          const venueText = this.safeText($venueContent)
          if (venueText) {
            enhancedVenue = venueText
          }
        }
      }

      // Look for CotaiTicketing or other ticket links
      const $cotaiLink = $('a[href*="cotaiticket"]').first()
      if ($cotaiLink.length > 0) {
        ticketUrl = this.safeAttr($cotaiLink, 'href') || ticketUrl
      }

      return {
        ...event,
        description: enhancedDescription,
        start: enhancedDate,
        venue: enhancedVenue,
        ticket_url: ticketUrl,
        image_url: this.extractDetailPageImage($, this.baseUrl) || event.image_url
      }

    } catch (error) {
      console.warn(`Failed to enrich ${this.venue} event details:`, error)
      return null
    }
  }

  /**
   * Enhanced title validation specifically for Venetian entertainment events
   */
  private isValidVenetianEventTitle(title: string): boolean {
    if (!title || title.length < 3) {
      return false
    }
    
    const cleanTitle = title.trim().toLowerCase()
    
    // Specific patterns that indicate invalid titles for Venetian
    const invalidPatterns = [
      // Generic venue information (not events)
      /^the venetian arena.*from mop/i,
      /^cotai expo.*from mop/i,
      /^as you tour the canals/i,
      /^\d+ things you didn't know/i,
      /^show venues$/i,
      /^the venetian arena \(new\)$/i,
      
      // Pure navigation/descriptive content
      /feel free to watch with amazement/i,
      /take a selfie with a giant stilt walker/i,
      
      // Language selectors
      /^(en|zh|pt|english|chinese|português)$/i,
      
      // Generic navigation terms
      /^(home|about|contact|menu|search|close|open)$/i,
    ]
    
    // Check invalid patterns
    for (const pattern of invalidPatterns) {
      if (pattern.test(cleanTitle)) {
        return false
      }
    }
    
    // Valid entertainment event indicators
    const validEventIndicators = [
      /concert/i,
      /tour/i,
      /live/i,
      /show/i,
      /games/i,
      /fan day/i,
      /superNature/i,
      /nba/i,
      /teamlab/i,
      /macao/i,
      /macau/i,
      /pleasure/i,
      /afterglow/i,
      /stephy/i,
      /twice/i,
    ]
    
    // If title contains valid event indicators, it's probably legitimate
    for (const indicator of validEventIndicators) {
      if (indicator.test(title)) {
        return true
      }
    }
    
    // For other titles, use basic validation (no language terms, not too short)
    return this.isValidEventTitle(title)
  }

  private categorizeEvent(title: string, description: string = '', venue: string): string[] {
    const content = (title + ' ' + description).toLowerCase()
    const categories: string[] = ['entertainment', venue === 'londoner' ? 'londoner' : 'venetian']

    if (content.includes('concert') || content.includes('music') || content.includes('orchestra')) {
      categories.push('concert')
    }
    if (content.includes('show') || content.includes('performance') || content.includes('theatre')) {
      categories.push('show')
    }
    if (content.includes('comedy') || content.includes('comedian')) {
      categories.push('comedy')
    }
    if (content.includes('magic') || content.includes('illusion')) {
      categories.push('magic')
    }
    if (content.includes('dance') || content.includes('ballet')) {
      categories.push('dance')
    }
    if (content.includes('dining') || content.includes('food') || content.includes('restaurant')) {
      categories.push('dining')
    }
    if (content.includes('nightlife') || content.includes('club') || content.includes('bar')) {
      categories.push('nightlife')
    }

    return categories
  }
}

// Factory functions for easy instantiation
export function createLondonerScraper(): SandsScraper {
  return new SandsScraper('londoner', 'https://www.londonermacao.com', LONDONER_URL)
}

export function createVenetianScraper(): SandsScraper {
  return new SandsScraper('venetian', 'https://www.venetianmacao.com', VENETIAN_URL)
}