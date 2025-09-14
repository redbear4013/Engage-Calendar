import { BaseScraper } from '../base-scraper'
import { RawEvent, RateLimitConfig, MacauScraper, ScraperError, ScraperErrorType } from '../types'
import { parseMacauDate, createSourceId } from '../../date-macau'
import type { AnyNode } from 'domhandler'

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
      console.log('🎭 Fetching Broadway Macau events from:', BROADWAY_URL)

      // Force browser automation - Broadway is a React SPA that requires JavaScript
      const response = await this.makeHybridRequest({
        url: BROADWAY_URL,
        timeout: 30000, // Reduced from 45s to 30s
        fallbackToBrowser: true,
        forceBrowser: true, // Skip HTTP attempt, go straight to browser
        waitForSelector: '[href*="/event/"], .events-grid', // Wait for event links OR grid to appear
        waitTimeout: 20000, // Reduced from 35s to 20s
        minExpectedElements: 15, // Slightly reduced threshold
        additionalWaitTime: 3000, // Reduced from 8s to 3s extra wait
        networkIdle: true, // Wait for API calls to complete
        executeScript: `
          // Wait for React app to fully initialize with timeout
          return new Promise(resolve => {
            let attempts = 0;
            const maxAttempts = 30; // Reduced from 50 to 30 attempts
            const startTime = Date.now();
            const maxWaitTime = 15000; // Maximum 15 seconds for this script

            const checkForEvents = () => {
              attempts++;
              const currentTime = Date.now();
              const eventLinks = document.querySelectorAll('a[href*="/event/"]');
              const eventsGrid = document.querySelector('.events-grid');

              console.log(\`Attempt \${attempts}: Found \${eventLinks.length} event links, events-grid: \${!!eventsGrid}\`);

              // Success condition: found event links OR time/attempt limits reached
              if (eventLinks.length > 0 || attempts >= maxAttempts || (currentTime - startTime) >= maxWaitTime) {
                resolve(eventLinks.length);
              } else {
                setTimeout(checkForEvents, 500); // Check every 500ms
              }
            };
            checkForEvents();
          });
        `
      })

      console.log(`🎭 Broadway: Used ${response.usedBrowser ? 'browser automation' : 'traditional HTTP'} for content extraction`)

      // Debug: Log content statistics
      if (process.env.NODE_ENV === 'development') {
        console.log(`🎭 Debug: Content length: ${response.content.length} characters`)
      }

      const $ = this.parseHtml(response.content)
      const events: RawEvent[] = []

      // Look for event containers - Broadway uses .events-grid as main container
      const eventSelectors = [
        // Primary: Individual event links within the grid (most precise)
        '.events-grid [href*="/event/"]', // Event links within the grid
        '.events-grid > *', // Individual event items within the grid
        '.events-grid', // Fallback: the entire grid (last resort)
        // Traditional selectors as fallback
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
      console.log(`🎭 Checking ${eventSelectors.length} selectors for events...`)

      for (const selector of eventSelectors) {
        const found = $(selector)
        console.log(`🎭 Selector "${selector}": found ${found.length} elements`)

        if (found.length > 0) {
          eventElements = found
          console.log(`🎭 ✅ Using selector "${selector}" with ${found.length} elements`)
          break
        }
      }

      console.log(`🎭 Total event elements selected: ${eventElements.length}`)

      // Special handling: if we found the events-grid but got it as a single element,
      // extract individual events from within it
      if (eventElements.length === 1 && eventElements.first().hasClass('events-grid')) {
        console.log(`🎭 Found events-grid container, extracting individual events from it...`)
        const $grid = eventElements.first()

        // Try to find individual event containers within the grid
        const individualEvents = $grid.find('[href*="/event/"]').closest('div, article, section').filter((i, el) => {
          const $el = $(el)
          const hasEventLink = $el.find('[href*="/event/"]').length > 0
          const hasText = $el.text().trim().length > 20
          return hasEventLink && hasText
        })

        if (individualEvents.length > 0) {
          eventElements = individualEvents
          console.log(`🎭 ✅ Extracted ${eventElements.length} individual events from events-grid`)
        } else {
          // Fallback: use the event links themselves as containers
          const eventLinks = $grid.find('[href*="/event/"]')
          if (eventLinks.length > 0) {
            eventElements = eventLinks
            console.log(`🎭 ✅ Using ${eventElements.length} event links from events-grid`)
          }
        }
      }

      // Broadway-specific fallback: look for event detail page links
      if (eventElements.length === 0) {
        // Debug: Check what content is available
        const allLinks = $('a')
        const allHeadings = $('h1, h2, h3, h4, h5, h6')
        const allParagraphs = $('p')
        const allText = $.text()

        console.log(`🎭 Debug: Found ${allLinks.length} total links, ${allHeadings.length} headings, ${allParagraphs.length} paragraphs`)
        console.log(`🎭 Debug: Page text contains "event": ${allText.toLowerCase().includes('event')}`)
        console.log(`🎭 Debug: Page text contains "concert": ${allText.toLowerCase().includes('concert')}`)
        console.log(`🎭 Debug: Page text contains "show": ${allText.toLowerCase().includes('show')}`)

        // Find all links to event detail pages (/event/...)
        const eventLinks = $('a[href*="/event/"]')
        console.log(`🎭 Found ${eventLinks.length} event detail links`)

        // Debug: Log the first few event links to understand the structure
        if (eventLinks.length > 0) {
          console.log(`🎭 Debug: First 3 event links:`)
          for (let i = 0; i < Math.min(3, eventLinks.length); i++) {
            const $link = eventLinks.eq(i)
            const href = $link.attr('href')
            const text = this.safeText($link).substring(0, 100)
            console.log(`🎭   ${i + 1}. "${text}" -> ${href}`)
          }
        }

        // Process event links if found (this should be the main path for Broadway)
        if (eventLinks.length > 0) {
          console.log(`🎭 Processing ${eventLinks.length} event detail links...`)

          // Group links by unique href to avoid duplicates (like "Learn More" links)
          const uniqueEventUrls = new Set()
          const uniqueEventLinks = []

          eventLinks.each((i, el) => {
            const $link = $(el)
            const href = $link.attr('href')
            const linkText = $link.text().trim()

            // Skip "Learn More" links and only keep main event title links
            if (href && !linkText.toLowerCase().includes('learn more') && !uniqueEventUrls.has(href)) {
              uniqueEventUrls.add(href)
              uniqueEventLinks.push(el)
            }
          })

          console.log(`🎭 Found ${uniqueEventLinks.length} unique event links after deduplication`)

          if (uniqueEventLinks.length > 0) {
            // For Broadway, use the parent containers of event links to get full event info
            const eventContainers = uniqueEventLinks.map(el => {
              const $link = $(el)
              // Find the closest event container (div with event info)
              let $container = $link.closest('div').has('a[href*="/event/"]')

              // If no good container found, look for parent with more content
              if (!$container.length || $container.text().trim().length < 20) {
                $container = $link.parent().parent() // Go up two levels
              }

              return $container.length > 0 ? $container[0] : el
            })

            eventElements = $(eventContainers)
            console.log(`🎭 Using ${eventElements.length} event containers from links`)
          }
        }

        // If no /event/ links, try to find any links that might be events
        if (eventLinks.length === 0) {
          console.log(`🎭 Looking for alternative event patterns...`)

          // Check for headings with event-like content
          const eventHeadings = allHeadings.filter((i, el) => {
            const text = $(el).text().toLowerCase()
            return text.includes('concert') || text.includes('show') || text.includes('live') ||
                   text.includes('tour') || text.includes('performance') || text.includes('fan meeting')
          })

          console.log(`🎭 Found ${eventHeadings.length} event-like headings`)

          if (eventHeadings.length > 0) {
            // Convert headings to their parent containers as event elements
            const parentElements = eventHeadings.map((i, el) => {
              return $(el).parent()[0]
            }).get()
            eventElements = $(parentElements)
            console.log(`🎭 Using ${eventElements.length} heading-based event containers`)
          }
        }

        // Only process event links if we found any
        if (eventLinks.length > 0) {
          // For each event link, find its parent container that has the event info
          const linkContainerElements = eventLinks.map((i, el) => {
            const $link = $(el)
            const href = $link.attr('href') || ''

            // Skip "Learn More" links and find the main event container
            if ($link.text().toLowerCase().includes('learn more')) {
              return null
            }

            // Find the parent container that has both heading and date info
            let $container = $link.closest('div, section, article')

            // Look for a container that has both a heading and date paragraph
            while ($container.length > 0) {
              const hasHeading = $container.find('h1, h2, h3, h4, h5, h6').length > 0
              const hasDate = $container.find('p').length > 0

              if (hasHeading && hasDate) {
                return $container[0]
              }

              $container = $container.parent()
            }

            return $link.parent()[0] // Fallback to immediate parent
          }).get().filter(el => el !== null)

          // Convert to jQuery object and remove duplicates
          eventElements = $(linkContainerElements).filter((i, el) => {
            return $(linkContainerElements).index(el) === i
          })

          console.log(`🎭 Broadway: found ${eventElements.length} event containers from detail links`)
        }
      }

      // Process each event element
      for (let i = 0; i < Math.min(eventElements.length, 20); i++) {
        const $element = eventElements.eq(i)
        console.log(`🎭 Processing event ${i + 1}/${eventElements.length}`)
        const eventData = await this.parseEventElement($, $element, i)

        if (eventData) {
          console.log(`🎭 ✅ Event ${i + 1} parsed successfully: "${eventData.title}"`)
          events.push(eventData)

          // Try to get more details from event detail page
          if (eventData.url && eventData.url !== BROADWAY_URL) {
            const detailedEvent = await this.enrichFromDetailPage(eventData)
            if (detailedEvent) {
              events[events.length - 1] = detailedEvent
            }
          }
        } else {
          console.log(`🎭 ❌ Event ${i + 1} failed parsing - event was null`)
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
    } finally {
      // Cleanup browser resources if they were used
      await this.cleanup()
    }
  }

  /**
   * Cleanup any resources used by the scraper
   */
  async cleanup(): Promise<void> {
    await super.cleanup()
  }

  private async parseEventElement($: cheerio.CheerioAPI, $element: cheerio.Cheerio<AnyNode>, index: number): Promise<RawEvent | null> {
    try {
      // Extract basic information
      let title = ''
      let eventUrl = ''
      let description = ''
      let dateText = ''
      let venue = 'Broadway Macau'
      let ticketUrl = ''
      let imageUrl = ''

      // Broadway-specific title extraction
      console.log(`🎭 Element HTML preview: ${this.safeText($element).substring(0, 200)}...`)

      // Check if the element itself is an event link (new approach for link-based extraction)
      if ($element.is('a[href*="/event/"]')) {
        title = this.safeText($element)
        eventUrl = this.safeAttr($element, 'href') || ''
        console.log(`🎭 Direct event link found: "${title}" -> ${eventUrl}`)
      } else {
        // Fallback: try to find the event detail link within the element and extract title from it
        const $eventLink = $element.find('a[href*="/event/"]:not(:contains("Learn More"))')
        if ($eventLink.length > 0) {
          // First try to get the title from the link text itself
          const linkText = this.safeText($eventLink).trim()
          eventUrl = this.safeAttr($eventLink, 'href') || ''

          if (linkText && linkText.length > 3 && !linkText.toLowerCase().includes('learn more') && !linkText.toLowerCase().includes('events and concerts')) {
            title = linkText
            console.log(`🎭 Event link text: "${title}" -> ${eventUrl}`)
          } else {
            // If link text is empty/generic, extract title from URL
            if (eventUrl) {
              const urlParts = eventUrl.split('/').filter(Boolean)
              const urlTitle = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2] || ''

              if (urlTitle) {
                // Convert URL slug to readable title
                title = urlTitle
                  .replace(/-/g, ' ')
                  .replace(/\b\w/g, l => l.toUpperCase())
                  .replace(/\d{4}/, match => match) // Keep years as-is
                  .trim()

                console.log(`🎭 Title from URL: "${title}" -> ${eventUrl}`)
              }
            }

            // Also try nearby headings or strong text as backup
            if (!title || title.length < 5) {
              const $nearbyTitle = $element.find('h1, h2, h3, h4, h5, h6, strong, .title, .event-title').first()
              if ($nearbyTitle.length > 0) {
                const nearbyText = this.safeText($nearbyTitle).trim()
                if (nearbyText && nearbyText.length > 3 && !nearbyText.toLowerCase().includes('events and concerts')) {
                  title = nearbyText
                  console.log(`🎭 Nearby title found: "${title}" -> ${eventUrl}`)
                }
              }
            }
          }
          console.log(`🎭 Event link in container: "${title}" -> ${eventUrl}`)
        }
      }

      // If no title from link, try heading elements (h1-h6)
      if (!title) {
        const titleSelectors = [
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
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
        // Look for event detail page link within this container
        const $eventDetailLink = $element.find('a[href*="/event/"]').first()
        if ($eventDetailLink.length > 0) {
          eventUrl = this.safeAttr($eventDetailLink, 'href') || ''
        } else {
          eventUrl = this.safeAttr($element, 'href') ||
                    this.safeAttr($element.find('a').first(), 'href') || ''
        }
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

      // Extract date information - Broadway stores dates in paragraph elements
      // Look for paragraph elements that contain date patterns like "September 13, 2025 8pm"
      const $paragraphs = $element.find('p')
      for (let i = 0; i < $paragraphs.length; i++) {
        const paragraphText = this.safeText($paragraphs.eq(i))

        // Check if paragraph contains date patterns
        const datePattern = /(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}/i
        const timePattern = /\d{1,2}(?::\d{2})?\s*(?:am|pm)/i

        if (datePattern.test(paragraphText) || timePattern.test(paragraphText)) {
          dateText = paragraphText
          break
        }
      }

      // Fallback to traditional date selectors
      if (!dateText) {
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
      console.log(`🎭 Validating event title: "${title}"`)
      if (!this.isValidEventTitle(title)) {
        console.log(`🎭 ❌ Title validation failed: isValidEventTitle returned false`)
        return null
      }

      // Additional Broadway-specific validation
      if (title.length < 3) {
        console.log(`🎭 ❌ Title too short: ${title.length} characters`)
        return null
      }

      if (title.toLowerCase().includes('broadway') && title.length < 10) {
        console.log(`🎭 ❌ Broadway-specific validation failed: contains 'broadway' but too short`)
        return null
      }

      console.log(`🎭 ✅ Title validation passed: "${title}"`)

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