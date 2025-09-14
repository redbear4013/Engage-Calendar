import { BaseScraper } from '../base-scraper'
import { RawEvent, RateLimitConfig, MacauScraper, ScraperError, ScraperErrorType } from '../types'
import { parseMacauDate, createSourceId } from '../../date-macau'
import type { AnyNode } from 'domhandler'

const BASE_URL = 'https://www.macaotourism.gov.mo'
const EVENTS_URL = 'https://www.macaotourism.gov.mo/en/events/calendar'

export class MGTOScraper extends BaseScraper implements MacauScraper {
  private readonly sourceId = 'mgto'
  private readonly domain = 'macaotourism.gov.mo'

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
    try {
      console.log('Fetching MGTO events from:', EVENTS_URL)
      
      const response = await this.makeRequest({
        url: EVENTS_URL,
        timeout: 15000
      })

      const $ = this.parseHtml(response.data)
      const events: RawEvent[] = []

      // MGTO has events in calendar structure, not just links
      // Look for event containers in calendar cells and event listings
      let eventElements = $()
      
      // Use the specific CSS selectors found in debug output
      const calendarEventSelectors = [
        '.cx-col-xl-3.cx-col-lg-4.cx-div', // Individual event containers from debug
        'div[class*="cx-col"]',            // Alternative cx-col containers
        '.cx-t01.cx-list--sm.-fade',       // Date containers
        'article',                         // Fallback to articles
        '.calendar-event',                 // Generic calendar events
        '.event-item'                      // Generic event items
      ]
      
      for (const selector of calendarEventSelectors) {
        const found = $(selector)
        if (found.length > 0) {
          // Filter to only elements that contain actual event information
          const filtered = found.filter((i, el) => {
            const text = $(el).text()
            // Must contain month abbreviation (more flexible matching) and not be navigation/language elements
            const hasDatePattern = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d+/i.test(text) ||
                                  /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d+-\d+/i.test(text) ||
                                  /\b(Major Event)\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(text) ||
                                  /\b(Public Holiday)\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(text)
            
            const isNotLanguageSelector = !text.includes('繁體中文') &&
                   !text.includes('简体中文') &&
                   !text.includes('Português') &&
                   !text.includes('English') &&
                   !text.includes('日本語') &&
                   !text.includes('한국어') &&
                   !text.includes('ภาษาไทย') &&
                   !text.includes('Bahasa Indonesia')
            
            const isSubstantialText = text.trim().length > 10
            
            
            return hasDatePattern && isNotLanguageSelector && isSubstantialText
          })
          
          if (filtered.length > 0) {
            eventElements = filtered
            console.log(`Found ${filtered.length} calendar events with selector: ${selector}`)
            break
          }
        }
      }

      // If no calendar events found, fallback to link-based approach
      if (eventElements.length === 0) {
        eventElements = $('a').filter((i, el) => {
          const href = $(el).attr('href') || ''
          const text = $(el).text()
          return href.includes('/events/') && 
                 /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d+/i.test(text) &&
                 !text.includes('繁體中文') &&
                 !text.includes('简体中文') &&
                 !text.includes('Português') &&
                 !text.includes('English') &&
                 !text.includes('日本語') &&
                 !text.includes('한국어') &&
                 !text.includes('ภาษาไทย') &&
                 !text.includes('Bahasa Indonesia')
        })
        console.log(`Fallback: found ${eventElements.length} potential event links`)
      }

      // Process found events
      for (let i = 0; i < Math.min(eventElements.length, 20); i++) {
        const $element = eventElements.eq(i)
        const eventData = await this.parseEventFromElement($, $element, i)
        
        if (eventData) {
          events.push(eventData)
        }
      }

      console.log(`MGTO scraper found ${events.length} events`)
      return events

    } catch (error) {
      console.error('MGTO scraper error:', error)
      throw new ScraperError(
        ScraperErrorType.PARSE_ERROR,
        `Failed to scrape MGTO events: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.sourceId,
        error instanceof Error ? error : undefined
      )
    }
  }

  private async parseEventFromElement($: cheerio.CheerioAPI, $element: cheerio.Cheerio<AnyNode>, index: number): Promise<RawEvent | null> {
    try {
      // Handle both link elements and article/div elements
      const isLink = $element.is('a')
      let eventUrl = ''
      let elementText = this.safeText($element)
      
      if (isLink) {
        const linkHref = this.safeAttr($element, 'href')
        if (!linkHref) return null
        eventUrl = this.createAbsoluteUrl(BASE_URL, linkHref)
      } else {
        // For article/div elements, try to find a link within them or use base URL
        const $innerLink = $element.find('a[href]').first()
        if ($innerLink.length > 0) {
          const linkHref = this.safeAttr($innerLink, 'href')
          eventUrl = linkHref ? this.createAbsoluteUrl(BASE_URL, linkHref) : `${BASE_URL}/events/calendar`
        } else {
          eventUrl = `${BASE_URL}/events/calendar`
        }
      }
      
      // Extract and clean event information - MGTO specific logic
      let title = ''
      let dateText = ''
      
      // Clean the element text by normalizing whitespace and newlines
      const cleanText = elementText.replace(/\s+/g, ' ').trim()
      
      // Debug logging for all events
      if (cleanText.toLowerCase().includes('sep')) {
        console.log(`🔍 MGTO Debug - Processing Sep event: "${cleanText}"`)
      }
      
      // MGTO events follow patterns like:
      // "Major Event Sep 5-28 23rd Macao City Fringe Festival"
      // "Major Event Sep 6, 13, 20, Oct 1 & 6 33rd Macao International Fireworks Display Contest"
      // "Sep 27 Celebration Activities for World Tourism Day"
      // "Public Holiday Apr 4 Ching Ming"
      
      // Pattern 1: "Major Event [Complex Date] [Title]" (handles comma-separated dates)
      let eventMatch = cleanText.match(/^Major Event\s+([A-Za-z]{3}[^A-Za-z]*(?:\d+[^A-Za-z]*)*(?:[A-Za-z]{3}[^A-Za-z]*\d+[^A-Za-z]*)*)\s+(.+)$/i)
      if (eventMatch) {
        dateText = eventMatch[1].trim()  // e.g., "Sep 5-28" or "Sep 6, 13, 20, Oct 1 & 6"
        title = eventMatch[2].trim()     // e.g., "23rd Macao City Fringe Festival"
        console.log(`🎯 MGTO Pattern 1 matched: "${cleanText}" → title="${title}", date="${dateText}"`);
      } else {
        // Pattern 2: "Major Event [Simple Date] [Title]" (fallback to simple pattern)
        eventMatch = cleanText.match(/^Major Event\s+(\w{3}\s+[\d\s,-]+)\s+(.+)$/i)
        if (eventMatch) {
          dateText = eventMatch[1].trim()
          title = eventMatch[2].trim()
          console.log(`🎯 MGTO Pattern 2 matched: "${cleanText}" → title="${title}", date="${dateText}"`);
        } else {
          // Pattern 3: "[Date] [Title]" (without Major Event prefix)  
          eventMatch = cleanText.match(/^(\w{3}\s+\d{1,2}(-\d{1,2})?)\s+(.+)$/i)
          if (eventMatch) {
            dateText = eventMatch[1]  // e.g., "Sep 27"
            title = eventMatch[3].trim()  // e.g., "Celebration Activities for World Tourism Day"
          } else {
            // Pattern 4: "Public Holiday [Date] [Title]"
            eventMatch = cleanText.match(/^Public Holiday\s+(\w{3}\s+[\d\s,-]+)\s+(.+)$/i)
            if (eventMatch) {
              dateText = eventMatch[1].trim()
              title = eventMatch[2].trim()
            } else {
              // Pattern 5: Fallback - look for date anywhere in text
              const dateMatch = cleanText.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+[\d\s,-]+/i)
              if (dateMatch) {
                dateText = dateMatch[0].trim()
                // Remove date and any prefixes to get clean title
                title = cleanText
                  .replace(/^Major Event\s+/i, '')
                  .replace(/^Public Holiday\s+/i, '')
                  .replace(dateMatch[0], '')
                  .replace(/^\s*[-\s]+/, '')
                  .trim()
              } else {
                // No date found, use full text but clean it
                title = cleanText
                  .replace(/^Major Event\s+/i, '')
                  .replace(/^Public Holiday\s+/i, '')
                  .trim()
              }
            }
          }
        }
      }

      // Look for date info in surrounding elements
      if (!dateText) {
        const $parent = $element.closest('.event-item, .calendar-event, .activity-item, td, li')
        const $dateElement = $parent.find('.date, .event-date, [class*="date"]').first()
        if ($dateElement.length > 0) {
          dateText = this.safeText($dateElement)
        }
      }

      // Parse date with enhanced logging
      console.log(`📅 Parsing date for "${title}": "${dateText}"`)
      const parsedDate = parseMacauDate(dateText)
      console.log(`📅 Date parsing result:`, parsedDate)
      
      // Generate description from surrounding context
      const $parent = $element.closest('.event-item, .calendar-event, .activity-item, td, li')
      let description = ''
      const $description = $parent.find('.description, .summary, .content, p').first()
      if ($description.length > 0) {
        description = this.safeText($description)
      }

      // Extract venue if available
      let venue = ''
      const $venue = $parent.find('.venue, .location, [class*="venue"], [class*="location"]').first()
      if ($venue.length > 0) {
        venue = this.safeText($venue)
      }

      // Validate title to exclude language selectors and navigation elements
      if (!this.isValidEventTitle(title)) {
        console.log(`❌ Event title validation failed for: "${title}"`)
        return null
      }

      // Check if we have a valid start date
      if (!parsedDate.start) {
        console.log(`❌ No valid start date for event: "${title}" with date text: "${dateText}"`)
        return null
      }

      // Determine categories based on content
      const categories = this.categorizeEvent(title, description)

      const event: RawEvent = {
        source: 'mgto',
        source_id: createSourceId(title, parsedDate.start, venue, this.domain),
        title: title || `MGTO Event ${index + 1}`,
        description: description || `Event from Macau Government Tourism Office`,
        start: parsedDate.start || new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000).toISOString(),
        end: parsedDate.end,
        venue: venue || undefined,
        city: 'Macau',
        url: eventUrl,
        image_url: this.extractImageUrl($, $element.closest('.event-item, .calendar-event, .activity-item, td, li'), BASE_URL),
        categories
      }

      console.log(`✅ Successfully created MGTO event: "${event.title}" (${event.start})`);
      return event

    } catch (error) {
      console.warn(`Failed to parse MGTO event ${index}:`, error)
      return null
    }
  }

  private categorizeEvent(title: string, description: string): string[] {
    const content = (title + ' ' + description).toLowerCase()
    const categories: string[] = ['local_events']

    if (content.includes('exhibition') || content.includes('museum') || content.includes('gallery')) {
      categories.push('exhibitions')
    }
    if (content.includes('festival') || content.includes('celebration') || content.includes('carnival')) {
      categories.push('festivals')
    }
    if (content.includes('concert') || content.includes('music') || content.includes('performance')) {
      categories.push('music')
    }
    if (content.includes('show') || content.includes('theatre') || content.includes('theater')) {
      categories.push('performing_arts')
    }
    if (content.includes('food') || content.includes('dining') || content.includes('culinary')) {
      categories.push('food')
    }
    if (content.includes('cultural') || content.includes('heritage') || content.includes('traditional')) {
      categories.push('cultural')
    }
    if (content.includes('sport') || content.includes('race') || content.includes('game')) {
      categories.push('sports')
    }

    return categories
  }
}