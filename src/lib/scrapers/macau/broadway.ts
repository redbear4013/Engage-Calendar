import { BaseScraper } from '../base-scraper'
import { RawEvent, RateLimitConfig, MacauScraper, ScraperError, ScraperErrorType } from '../types'
import { parseMacauDate, createSourceId } from '../../date-macau'

const BROADWAY_URL = 'https://www.broadwaymacau.com.mo/upcoming-events-and-concerts/'

export class BroadwayScraper extends BaseScraper implements MacauScraper {
  constructor() {
    super({
      requestsPerSecond: 1, // Moderate rate limit for entertainment venue
      maxRetries: 3,
      retryDelayMs: 1500
    })
  }

  getSourceId(): 'broadway' {
    return 'broadway'
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
      console.log('Fetching Broadway Macau events from:', BROADWAY_URL)
      
      const response = await this.makeRequest({
        url: BROADWAY_URL,
        timeout: 12000
      })

      const $ = this.parseHtml(response.data)
      const events: RawEvent[] = []

      // Look for event containers - Broadway typically uses event cards or listings
      const eventSelectors = [
        '.event-card',
        '.event-item',
        '.show-item',
        '.concert-item',
        '.event-listing',
        '[data-event]',
        '.card[href]',
        '.event-block',
        '.show-card',
        '.upcoming-event',
        'article.event',
        '.event-wrapper'
      ]

      let eventElements = $()
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
          const parent = $(el).parent().text().toLowerCase()
          
          return (href.includes('event') || 
                 href.includes('show') || 
                 href.includes('concert') ||
                 href.includes('performance') ||
                 text.includes('show') ||
                 text.includes('concert') ||
                 text.includes('performance') ||
                 text.includes('event') ||
                 parent.includes('upcoming') ||
                 parent.includes('event')) &&
                 text.length > 5 && // Exclude very short navigation texts
                 !href.includes('#') && // Exclude anchor links
                 href !== '/' // Exclude home links
        })
        console.log(`Fallback: found ${eventElements.length} potential event links`)
      }

      // Process each event element
      for (let i = 0; i < Math.min(eventElements.length, 20); i++) {
        const $element = eventElements.eq(i)
        const eventData = await this.parseEventElement($, $element, i)
        
        if (eventData) {
          events.push(eventData)
          
          // Try to get more details from event detail page
          if (eventData.url && eventData.url !== BROADWAY_URL) {
            const detailedEvent = await this.enrichFromDetailPage(eventData)
            if (detailedEvent) {
              events[events.length - 1] = detailedEvent
            }
          }
        }
      }

      console.log(`Broadway scraper found ${events.length} events`)
      return events

    } catch (error) {
      console.error('Broadway scraper error:', error)
      throw new ScraperError(
        ScraperErrorType.PARSE_ERROR,
        `Failed to scrape Broadway Macau events: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'broadway',
        error instanceof Error ? error : undefined
      )
    }
  }

  private async parseEventElement($: cheerio.CheerioAPI, $element: cheerio.Cheerio<cheerio.Element>, index: number): Promise<RawEvent | null> {
    try {
      // Extract basic information
      let title = ''
      let eventUrl = ''
      let description = ''
      let dateText = ''
      let venue = 'Broadway Macau'
      let ticketUrl = ''
      let imageUrl = ''

      // Try to find title
      const titleSelectors = [
        'h1', 'h2', 'h3', 'h4', 
        '.title', '.event-title', '.show-title', '.concert-title',
        '[class*="title"]', '[class*="name"]',
        '.event-name', '.show-name'
      ]
      
      for (const selector of titleSelectors) {
        const $title = $element.find(selector).first()
        if ($title.length > 0) {
          title = this.safeText($title)
          if (title.length > 3) break // Only accept meaningful titles
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
            title = this.safeText($element)
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
        eventUrl = this.createAbsoluteUrl('https://www.broadwaymacau.com.mo', eventUrl)
      } else {
        eventUrl = BROADWAY_URL
      }

      // Extract description
      const descSelectors = [
        '.description', '.summary', '.content', '.excerpt', 
        '.event-description', '.show-description', '.details',
        'p', '.text'
      ]
      for (const selector of descSelectors) {
        const $desc = $element.find(selector).first()
        if ($desc.length > 0) {
          description = this.safeText($desc)
          if (description.length > 10) break // Only meaningful descriptions
        }
      }

      // Extract date information
      const dateSelectors = [
        '.date', '.event-date', '.show-date', '.concert-date',
        '[class*="date"]', '.when', '.time', '.schedule',
        '.event-time', '.show-time'
      ]
      for (const selector of dateSelectors) {
        const $date = $element.find(selector).first()
        if ($date.length > 0) {
          dateText = this.safeText($date)
          if (dateText.length > 3) break
        }
      }

      // Extract venue info (might have specific venue within Broadway)
      const venueSelectors = [
        '.venue', '.location', '.where', '.theater', '.hall',
        '[class*="venue"]', '[class*="location"]', '[class*="theater"]'
      ]
      for (const selector of venueSelectors) {
        const $venueEl = $element.find(selector).first()
        if ($venueEl.length > 0) {
          const venueText = this.safeText($venueEl)
          if (venueText && venueText.toLowerCase() !== 'broadway') {
            venue = `${venueText}, Broadway Macau`
            break
          }
        }
      }

      // Look for ticket links
      const $ticketLink = $element.find('a[href*="ticket"], a[href*="booking"], a[href*="purchase"], a[href*="buy"]').first()
      if ($ticketLink.length > 0) {
        ticketUrl = this.createAbsoluteUrl('https://www.broadwaymacau.com.mo', this.safeAttr($ticketLink, 'href') || '')
      }

      // Extract image URL using base scraper helper
      imageUrl = this.extractImageUrl($, $element, 'https://www.broadwaymacau.com.mo') || ''

      // Parse the date
      const parsedDate = parseMacauDate(dateText)

      // Validate title to exclude language selectors and navigation elements
      if (!this.isValidEventTitle(title)) {
        return null
      }

      // Additional Broadway-specific validation
      if (title.length < 3 || 
          title.toLowerCase().includes('broadway') && title.length < 10) {
        return null
      }

      // Determine categories based on Broadway's typical offerings
      const categories = this.categorizeEvent(title, description)

      const event: RawEvent = {
        source: 'broadway',
        source_id: createSourceId(title, parsedDate.start, venue, 'broadwaymacau.com.mo'),
        title: title,
        description: description || `Event at Broadway Macau`,
        start: parsedDate.start || new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000).toISOString(),
        end: parsedDate.end,
        venue: venue,
        city: 'Macau',
        url: eventUrl,
        ticket_url: ticketUrl || undefined,
        image_url: imageUrl || undefined,
        categories
      }

      return event

    } catch (error) {
      console.warn(`Failed to parse Broadway event ${index}:`, error)
      return null
    }
  }

  private async enrichFromDetailPage(event: RawEvent): Promise<RawEvent | null> {
    try {
      if (!event.url || event.url === BROADWAY_URL) {
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
      let enhancedImageUrl = event.image_url

      // Try to find better description
      const descriptionSelectors = [
        '.event-description',
        '.show-description',
        '.content-main',
        '.description',
        '.details',
        '.event-details',
        '.full-description',
        'meta[property="og:description"]',
        'meta[name="description"]'
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

      // Look for date and time information
      const dateTimeSelectors = [
        '.event-datetime', '.show-datetime', '.performance-time',
        '.date-time', '.schedule', '.when'
      ]
      
      for (const selector of dateTimeSelectors) {
        const $dateTime = $(selector).first()
        if ($dateTime.length > 0) {
          const dateText = this.safeText($dateTime)
          const parsedDate = parseMacauDate(dateText)
          if (parsedDate.start) {
            enhancedDate = parsedDate.start
            break
          }
        }
      }

      // Look for venue details
      const venueSelectors = [
        '.venue-details', '.location-details', '.where',
        '.theater', '.hall', '.performance-venue'
      ]
      
      for (const selector of venueSelectors) {
        const $venue = $(selector).first()
        if ($venue.length > 0) {
          const venueText = this.safeText($venue)
          if (venueText && !venueText.toLowerCase().includes('broadway')) {
            enhancedVenue = `${venueText}, Broadway Macau`
            break
          }
        }
      }

      // Look for ticket booking links
      const ticketSelectors = [
        'a[href*="ticket"]', 'a[href*="booking"]', 
        'a[href*="purchase"]', 'a[href*="buy"]',
        '.ticket-link', '.booking-link', '.buy-tickets'
      ]
      
      for (const selector of ticketSelectors) {
        const $ticket = $(selector).first()
        if ($ticket.length > 0) {
          const href = this.safeAttr($ticket, 'href')
          if (href) {
            ticketUrl = this.createAbsoluteUrl('https://www.broadwaymacau.com.mo', href)
            break
          }
        }
      }

      // Look for better quality images on detail page using base scraper helper
      if (!enhancedImageUrl) {
        enhancedImageUrl = this.extractDetailPageImage($, 'https://www.broadwaymacau.com.mo')
      }

      return {
        ...event,
        description: enhancedDescription,
        start: enhancedDate,
        venue: enhancedVenue,
        ticket_url: ticketUrl,
        image_url: enhancedImageUrl
      }

    } catch (error) {
      console.warn(`Failed to enrich Broadway event details:`, error)
      return null
    }
  }

  private categorizeEvent(title: string, description: string = ''): string[] {
    const content = (title + ' ' + description).toLowerCase()
    const categories: string[] = ['entertainment', 'broadway']

    // Musical and concert categories
    if (content.includes('concert') || content.includes('music') || 
        content.includes('orchestra') || content.includes('symphony') ||
        content.includes('recital')) {
      categories.push('concert')
    }
    
    // Theater and show categories
    if (content.includes('show') || content.includes('performance') || 
        content.includes('theatre') || content.includes('theater') ||
        content.includes('musical') || content.includes('opera')) {
      categories.push('show')
    }
    
    // Comedy shows
    if (content.includes('comedy') || content.includes('comedian') ||
        content.includes('stand-up') || content.includes('standup')) {
      categories.push('comedy')
    }
    
    // Magic shows
    if (content.includes('magic') || content.includes('illusion') ||
        content.includes('magician')) {
      categories.push('magic')
    }
    
    // Dance performances
    if (content.includes('dance') || content.includes('ballet') ||
        content.includes('choreography') || content.includes('dancer')) {
      categories.push('dance')
    }
    
    // Special events
    if (content.includes('exhibition') || content.includes('expo') ||
        content.includes('festival') || content.includes('celebration')) {
      categories.push('special-event')
    }
    
    // Children's shows
    if (content.includes('children') || content.includes('kids') ||
        content.includes('family') || content.includes('child')) {
      categories.push('family')
    }

    return categories
  }
}

// Factory function for easy instantiation
export function createBroadwayScraper(): BroadwayScraper {
  return new BroadwayScraper()
}