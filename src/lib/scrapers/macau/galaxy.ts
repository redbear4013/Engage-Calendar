import { BaseScraper } from '../base-scraper'
import { RawEvent, RateLimitConfig, MacauScraper, ScraperError, ScraperErrorType } from '../types'
import { parseMacauDate, createSourceId } from '../../date-macau'

const BASE_URL = 'https://www.galaxymacau.com'
const EVENTS_URL = 'https://www.galaxymacau.com/ticketing/event-list/'
const TICKETING_URL = 'https://www.galaxyticketing.com'

export class GalaxyScraper extends BaseScraper implements MacauScraper {
  private readonly sourceId = 'galaxy'
  private readonly domain = 'galaxymacau.com'

  constructor() {
    super({
      requestsPerSecond: 1, // Moderate rate limit for casino site
      maxRetries: 3,
      retryDelayMs: 1500
    })
  }

  getSourceId(): 'galaxy' {
    return this.sourceId
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
      console.log('Fetching Galaxy events from:', EVENTS_URL)
      
      const response = await this.makeRequest({
        url: EVENTS_URL,
        timeout: 12000
      })

      const $ = this.parseHtml(response.data)
      const events: RawEvent[] = []

      // Galaxy typically has event cards or list items
      const eventSelectors = [
        '.event-card',
        '.event-item',
        '.event-list-item',
        '.show-card',
        '.ticket-item',
        '[data-event]',
        '.event-block',
        '.card[data-event-id]'
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

      // Fallback to any clickable items that might be events
      if (eventElements.length === 0) {
        eventElements = $('.card, .item, a').filter((i, el) => {
          const $el = $(el)
          const text = $el.text().toLowerCase()
          const href = $el.attr('href') || ''
          
          return text.includes('show') || 
                 text.includes('concert') || 
                 text.includes('event') || 
                 text.includes('performance') ||
                 href.includes('event') ||
                 href.includes('show') ||
                 href.includes('ticket')
        })
        console.log(`Fallback: found ${eventElements.length} potential events`)
      }

      // Process each event
      for (let i = 0; i < Math.min(eventElements.length, 15); i++) {
        const $element = eventElements.eq(i)
        const eventData = await this.parseEventElement($, $element, i)
        
        if (eventData) {
          events.push(eventData)
          
          // Try to enrich with detail page if available
          if (eventData.url && eventData.url !== EVENTS_URL) {
            const enriched = await this.enrichFromDetailPage(eventData)
            if (enriched) {
              events[events.length - 1] = enriched
            }
          }
        }
      }

      console.log(`Galaxy scraper found ${events.length} events`)
      return events

    } catch (error) {
      console.error('Galaxy scraper error:', error)
      throw new ScraperError(
        ScraperErrorType.PARSE_ERROR,
        `Failed to scrape Galaxy events: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.sourceId,
        error instanceof Error ? error : undefined
      )
    }
  }

  private async parseEventElement($: cheerio.CheerioAPI, $element: cheerio.Cheerio<cheerio.Element>, index: number): Promise<RawEvent | null> {
    try {
      let title = ''
      let eventUrl = ''
      let description = ''
      let dateText = ''
      let venue = 'Galaxy Macau'
      let ticketUrl = ''
      let imageUrl = ''

      // Extract title
      const titleSelectors = ['h1', 'h2', 'h3', '.title', '.event-title', '.show-title', '[class*="title"]', '.name']
      for (const selector of titleSelectors) {
        const $title = $element.find(selector).first()
        if ($title.length > 0 && this.safeText($title)) {
          title = this.safeText($title)
          break
        }
      }

      // If no title in children, check if element itself has title
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

      // Get event URL
      if (!eventUrl) {
        eventUrl = this.safeAttr($element, 'href') || 
                  this.safeAttr($element.find('a').first(), 'href') || 
                  this.safeAttr($element.find('[href]').first(), 'href') || ''
      }

      if (eventUrl) {
        eventUrl = this.createAbsoluteUrl(BASE_URL, eventUrl)
      } else {
        eventUrl = EVENTS_URL
      }

      // Extract description
      const descSelectors = ['.description', '.summary', '.content', '.excerpt', '.details', 'p']
      for (const selector of descSelectors) {
        const $desc = $element.find(selector).first()
        if ($desc.length > 0 && this.safeText($desc)) {
          description = this.safeText($desc)
          break
        }
      }

      // Extract date - Galaxy often shows dates next to titles or in separate date elements
      const dateSelectors = [
        '.date', '.event-date', '.show-date', '[class*="date"]', 
        '.when', '.time', '.datetime', '.schedule'
      ]
      for (const selector of dateSelectors) {
        const $date = $element.find(selector).first()
        if ($date.length > 0 && this.safeText($date)) {
          dateText = this.safeText($date)
          break
        }
      }

      // If no date found, look in surrounding text
      if (!dateText) {
        const allText = this.safeText($element)
        const dateMatch = allText.match(/(\d{1,2}[-\/]\d{1,2}[-\/]\d{4}|\d{1,2}\s+\w+\s+\d{4}|\w+\s+\d{1,2},?\s+\d{4})/i)
        if (dateMatch) {
          dateText = dateMatch[1]
        }
      }

      // Look for more specific venue information
      const venueSelectors = ['.venue', '.location', '.where', '[class*="venue"]', '[class*="location"]']
      for (const selector of venueSelectors) {
        const $venueEl = $element.find(selector).first()
        if ($venueEl.length > 0 && this.safeText($venueEl)) {
          const venueText = this.safeText($venueEl)
          if (venueText !== 'Galaxy Macau' && venueText.length > 0) {
            venue = `${venueText}, Galaxy Macau`
          }
          break
        }
      }

      // Look for ticket URLs
      const $ticketLink = $element.find('a[href*="ticket"], a[href*="booking"], a[href*="purchase"], .buy-ticket').first()
      if ($ticketLink.length > 0) {
        const href = this.safeAttr($ticketLink, 'href')
        if (href) {
          // Galaxy might link to their ticketing system
          if (href.startsWith('http')) {
            ticketUrl = href
          } else {
            ticketUrl = this.createAbsoluteUrl(BASE_URL, href)
          }
        }
      }

      // Look for images using base scraper helper
      imageUrl = this.extractImageUrl($, $element, BASE_URL) || ''

      // Validate title to exclude language selectors and navigation elements
      if (!this.isValidEventTitle(title)) {
        return null
      }

      // Parse date
      const parsedDate = parseMacauDate(dateText)

      // Categorize the event
      const categories = this.categorizeEvent(title, description)

      const event: RawEvent = {
        source: 'galaxy',
        source_id: createSourceId(title, parsedDate.start, venue, this.domain),
        title: title || `Galaxy Event ${index + 1}`,
        description: description || `Entertainment event at Galaxy Macau`,
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
      console.warn(`Failed to parse Galaxy event ${index}:`, error)
      return null
    }
  }

  private async enrichFromDetailPage(event: RawEvent): Promise<RawEvent | null> {
    try {
      if (!event.url || event.url === EVENTS_URL) {
        return null
      }

      console.log(`Enriching Galaxy event: ${event.title}`)
      const response = await this.makeRequest({
        url: event.url,
        timeout: 10000
      })

      const $ = this.parseHtml(response.data)

      // Look for enhanced information
      let enhancedDescription = event.description
      let enhancedVenue = event.venue
      let ticketUrl = event.ticket_url
      let enhancedImageUrl = event.image_url

      // Better description from detail page
      const detailSelectors = [
        '.event-description',
        '.show-description', 
        '.content-main',
        '.details',
        '.description',
        'meta[property="og:description"]'
      ]
      
      for (const selector of detailSelectors) {
        const $detail = $(selector).first()
        if ($detail.length > 0) {
          const text = selector.includes('meta') 
            ? this.safeAttr($detail, 'content') || ''
            : this.safeText($detail)
          
          if (text && text.length > (enhancedDescription?.length || 0)) {
            enhancedDescription = text
            break
          }
        }
      }

      // Look for venue details
      const venueSelectors = ['.venue-info', '.location-info', '.where', '.venue']
      for (const selector of venueSelectors) {
        const $venue = $(selector).first()
        if ($venue.length > 0) {
          const venueText = this.safeText($venue)
          if (venueText && !venueText.toLowerCase().includes('galaxy macau')) {
            enhancedVenue = `${venueText}, Galaxy Macau`
          }
          break
        }
      }

      // Look for Galaxy ticketing links
      const $galaxyTicket = $('a[href*="galaxyticketing"], a[href*="ticket"]').first()
      if ($galaxyTicket.length > 0) {
        const href = this.safeAttr($galaxyTicket, 'href')
        if (href) {
          ticketUrl = href.startsWith('http') ? href : this.createAbsoluteUrl(TICKETING_URL, href)
        }
      }

      // Look for better images on detail page
      if (!enhancedImageUrl) {
        enhancedImageUrl = this.extractDetailPageImage($, BASE_URL)
      }

      return {
        ...event,
        description: enhancedDescription,
        venue: enhancedVenue,
        ticket_url: ticketUrl,
        image_url: enhancedImageUrl
      }

    } catch (error) {
      console.warn('Failed to enrich Galaxy event details:', error)
      return null
    }
  }

  private categorizeEvent(title: string, description: string = ''): string[] {
    const content = (title + ' ' + description).toLowerCase()
    const categories: string[] = ['entertainment', 'galaxy']

    if (content.includes('concert') || content.includes('music') || content.includes('singer')) {
      categories.push('concert')
    }
    if (content.includes('show') || content.includes('performance') || content.includes('theatre')) {
      categories.push('show')
    }
    if (content.includes('comedy') || content.includes('comedian') || content.includes('standup')) {
      categories.push('comedy')
    }
    if (content.includes('magic') || content.includes('illusion')) {
      categories.push('magic')
    }
    if (content.includes('dance') || content.includes('ballet') || content.includes('dancing')) {
      categories.push('dance')
    }
    if (content.includes('dining') || content.includes('food') || content.includes('culinary')) {
      categories.push('dining')
    }
    if (content.includes('family') || content.includes('kids') || content.includes('children')) {
      categories.push('family')
    }
    if (content.includes('sport') || content.includes('game') || content.includes('tournament')) {
      categories.push('sports')
    }

    return categories
  }
}