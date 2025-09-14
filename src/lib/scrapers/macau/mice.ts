import { BaseScraper } from '../base-scraper'
import { RawEvent, RateLimitConfig, MacauScraper, ScraperError, ScraperErrorType } from '../types'
import { parseMacauDate, createSourceId } from '../../date-macau'
import type { AnyNode } from 'domhandler'

const BASE_URL = 'https://www.mice.gov.mo'
const EVENTS_URL = 'https://www.mice.gov.mo/en/events.aspx'

export class MICEScraper extends BaseScraper implements MacauScraper {
  private readonly sourceId = 'mice'
  private readonly domain = 'mice.gov.mo'

  constructor() {
    super({
      requestsPerSecond: 0.5, // Conservative for government site
      maxRetries: 3,
      retryDelayMs: 2000
    })
  }

  getSourceId(): 'mice' {
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
    try {
      console.log('Fetching MICE events from:', EVENTS_URL)
      
      const response = await this.makeRequest({
        url: EVENTS_URL,
        timeout: 15000
      })

      const $ = this.parseHtml(response.data)
      const events: RawEvent[] = []

      // MICE typically has structured event listings - look for table rows or list items
      const eventSelectors = [
        'tbody tr', // Table rows
        '.event-row',
        '.event-item',
        '.event-list tr',
        '.events-table tr',
        'tr[data-event]',
        '.event-listing tr'
      ]

      let eventRows = $()
      for (const selector of eventSelectors) {
        const found = $(selector)
        if (found.length > 1) { // Need more than header row
          eventRows = found.slice(1) // Skip header if table
          console.log(`Found ${found.length} event rows with selector: ${selector}`)
          break
        }
      }

      // Fallback to looking for any structured content that might be events
      if (eventRows.length === 0) {
        eventRows = $('.event, .item, .listing').filter((i, el) => {
          const text = $(el).text().toLowerCase()
          return text.includes('exhibition') || 
                 text.includes('convention') || 
                 text.includes('conference') || 
                 text.includes('meeting') ||
                 text.includes('expo') ||
                 text.includes('fair')
        })
        console.log(`Fallback: found ${eventRows.length} potential events`)
      }

      // Process each event row
      for (let i = 0; i < Math.min(eventRows.length, 20); i++) {
        const $row = eventRows.eq(i)
        const eventData = this.parseEventRow($, $row, i)
        
        if (eventData) {
          events.push(eventData)
        }
      }

      console.log(`MICE scraper found ${events.length} events`)
      return events

    } catch (error) {
      console.error('MICE scraper error:', error)
      throw new ScraperError(
        ScraperErrorType.PARSE_ERROR,
        `Failed to scrape MICE events: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.sourceId,
        error instanceof Error ? error : undefined
      )
    }
  }

  private parseEventRow($: cheerio.CheerioAPI, $row: cheerio.Cheerio<AnyNode>, index: number): RawEvent | null {
    try {
      let title = ''
      let dateText = ''
      let venue = ''
      let description = ''
      let eventUrl = EVENTS_URL

      // For table rows, try to extract from cells
      const $cells = $row.find('td')
      if ($cells.length >= 2) {
        // Common MICE table format: Date | Title | Venue
        // or Date Range | Title | Location | Status
        
        // First cell usually has date
        dateText = this.safeText($cells.eq(0))
        
        // Second cell usually has title
        const $titleCell = $cells.eq(1)
        title = this.safeText($titleCell)
        
        // Check if title cell has a link
        const $titleLink = $titleCell.find('a').first()
        if ($titleLink.length > 0) {
          eventUrl = this.createAbsoluteUrl(BASE_URL, this.safeAttr($titleLink, 'href') || '')
        }
        
        // Third cell might have venue
        if ($cells.length >= 3) {
          venue = this.safeText($cells.eq(2))
        }
        
        // Look for additional info in remaining cells
        if ($cells.length >= 4) {
          const additionalInfo = this.safeText($cells.eq(3))
          if (additionalInfo && !additionalInfo.toLowerCase().includes('status')) {
            description = additionalInfo
          }
        }
      } else {
        // Not a table row, treat as general content
        title = this.safeText($row)
        
        // Look for date patterns in the text
        const allText = title
        const dateMatch = allText.match(/(\d{1,2}[-\/]\d{1,2}[-\/]\d{4}|\d{1,2}\s+\w+\s+\d{4}|\w+\s+\d{1,2},?\s+\d{4})/i)
        if (dateMatch) {
          dateText = dateMatch[1]
          title = title.replace(dateMatch[0], '').trim()
        }
        
        // Look for links
        const $link = $row.find('a').first()
        if ($link.length > 0) {
          eventUrl = this.createAbsoluteUrl(BASE_URL, this.safeAttr($link, 'href') || '')
        }
      }

      // Clean and validate title
      if (!title || title.length < 3) {
        return null
      }

      // Parse MICE-specific date formats
      // MICE often uses formats like "27/11/2024 - 29/11/2024" or "27-29 November 2024"
      const parsedDate = this.parseMICEDate(dateText)

      // Set default venue for MICE events
      if (!venue) {
        venue = 'Macau Convention Centers'
      } else if (!venue.toLowerCase().includes('macau')) {
        venue = `${venue}, Macau`
      }

      // Validate title to exclude language selectors and navigation elements
      if (!this.isValidEventTitle(title)) {
        return null
      }

      // Generate description if none found
      if (!description) {
        description = `MICE event: ${title}`
      }

      // Categorize MICE events
      const categories = this.categorizeMICEEvent(title, description)

      const event: RawEvent = {
        source: 'mice',
        source_id: createSourceId(title, parsedDate.start, venue, this.domain),
        title: title,
        description: description,
        start: parsedDate.start || new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000).toISOString(),
        end: parsedDate.end,
        venue: venue,
        city: 'Macau',
        url: eventUrl,
        image_url: this.extractImageUrl($, $row, BASE_URL),
        categories
      }

      return event

    } catch (error) {
      console.warn(`Failed to parse MICE event ${index}:`, error)
      return null
    }
  }

  private parseMICEDate(dateText: string): { start: string | null; end?: string | null } {
    if (!dateText?.trim()) {
      return { start: null }
    }

    // MICE often uses specific date range formats
    // Try to handle "27/11/2024 - 29/11/2024" format first
    const ddmmyyyyRangeMatch = dateText.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s*-\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/i)
    if (ddmmyyyyRangeMatch) {
      const [, startDay, startMonth, startYear, endDay, endMonth, endYear] = ddmmyyyyRangeMatch
      const startDate = `${startYear}-${startMonth.padStart(2, '0')}-${startDay.padStart(2, '0')}T09:00:00+08:00`
      const endDate = `${endYear}-${endMonth.padStart(2, '0')}-${endDay.padStart(2, '0')}T18:00:00+08:00`
      
      return {
        start: new Date(startDate).toISOString(),
        end: new Date(endDate).toISOString()
      }
    }

    // Try single dd/mm/yyyy format
    const ddmmyyyyMatch = dateText.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/i)
    if (ddmmyyyyMatch) {
      const [, day, month, year] = ddmmyyyyMatch
      const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T09:00:00+08:00`
      
      return {
        start: new Date(date).toISOString(),
        end: new Date(new Date(date).getTime() + 8 * 60 * 60 * 1000).toISOString() // 8 hours later
      }
    }

    // Fallback to the general Macau date parser
    return parseMacauDate(dateText)
  }

  private categorizeMICEEvent(title: string, description: string): string[] {
    const content = (title + ' ' + description).toLowerCase()
    const categories: string[] = ['business', 'mice']

    if (content.includes('exhibition') || content.includes('expo') || content.includes('fair')) {
      categories.push('exhibition')
    }
    if (content.includes('convention') || content.includes('conference')) {
      categories.push('convention')
    }
    if (content.includes('meeting') || content.includes('summit')) {
      categories.push('meeting')
    }
    if (content.includes('trade') || content.includes('business')) {
      categories.push('trade')
    }
    if (content.includes('technology') || content.includes('tech') || content.includes('digital')) {
      categories.push('technology')
    }
    if (content.includes('medical') || content.includes('health') || content.includes('pharma')) {
      categories.push('healthcare')
    }
    if (content.includes('finance') || content.includes('banking') || content.includes('investment')) {
      categories.push('finance')
    }
    if (content.includes('gaming') || content.includes('casino') || content.includes('gambling')) {
      categories.push('gaming')
    }
    if (content.includes('tourism') || content.includes('travel') || content.includes('hospitality')) {
      categories.push('tourism')
    }
    if (content.includes('food') || content.includes('culinary') || content.includes('beverage')) {
      categories.push('food')
    }

    return categories
  }
}