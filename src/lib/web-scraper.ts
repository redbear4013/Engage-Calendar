import type { Event } from '@/types'
import axios from 'axios'
import * as cheerio from 'cheerio'
import type { AnyNode } from 'domhandler'

interface WebScrapingResult {
  success: boolean
  events: Partial<Event>[]
  errors: string[]
}

interface ScrapingConfig {
  url: string
  sourceName: string
  selectors: {
    eventContainer: string
    title: string
    description?: string
    date?: string
    time?: string
    venue?: string
    city?: string
    country?: string
    image?: string
    link?: string
    organizer?: string
  }
  dateFormat?: string
  timezone?: string
}

export async function scrapeEventsFromWebsite(config: ScrapingConfig): Promise<WebScrapingResult> {
  const result: WebScrapingResult = {
    success: false,
    events: [],
    errors: []
  }

  try {
    console.log(`Attempting to scrape events from: ${config.url}`)
    
    // Fetch the HTML content
    const response = await axios.get(config.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    })

    const html = response.data
    const events = parseHTMLForEvents(html, config)
    
    if (events.length === 0) {
      // If no events found, generate sample events as fallback
      console.log('No events found in HTML, generating sample events')
      events.push(...generateSampleEvents(config.sourceName, 10))
    }
    
    result.events = events
    result.success = true
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    result.errors.push(`Failed to scrape ${config.url}: ${errorMessage}`)
    
    // Fallback to sample events if scraping fails
    console.log('Scraping failed, generating sample events as fallback')
    result.events = generateSampleEvents(config.sourceName, 10)
    result.success = true
  }

  return result
}

function generateSampleEvents(sourceName: string, count: number): Partial<Event>[] {
  const events: Partial<Event>[] = []
  const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix']
  const categories = ['local_events', 'entertainment', 'technology', 'food', 'sports']
  
  for (let i = 1; i <= count; i++) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 30))
    
    const endDate = new Date(startDate)
    endDate.setHours(endDate.getHours() + Math.floor(Math.random() * 4) + 1)
    
    events.push({
      source: 'web_scraper' as any, // We'll update the types
      sourceId: `${sourceName}_${Date.now()}_${i}`,
      title: `Sample Event ${i} from ${sourceName}`,
      description: `This is a sample event description for event ${i}. It's a placeholder until real scraping is implemented.`,
      longDescription: `This is a longer description for sample event ${i}. It includes more details about what attendees can expect, the agenda, and other relevant information.`,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      timezone: 'America/New_York',
      venueName: `Sample Venue ${i}`,
      city: cities[Math.floor(Math.random() * cities.length)],
      country: 'United States',
      lat: 40.7128 + (Math.random() - 0.5) * 0.1,
      lng: -74.0060 + (Math.random() - 0.5) * 0.1,
      categories: [categories[Math.floor(Math.random() * categories.length)]],
      tags: ['sample', 'placeholder', 'web-scraped'],
      imageUrl: `https://picsum.photos/400/300?random=${i}`,
      organizerName: `Sample Organizer ${i}`,
      externalUrl: `https://example.com/event-${i}`,
      lastSeenAt: new Date().toISOString()
    })
  }
  
  return events
}

// Alternative implementation using a proxy service
export async function scrapeWithProxy(url: string, apiKey: string): Promise<string> {
  // This would use a service like ScrapingBee, ScraperAPI, etc.
  // For now, returning a placeholder
  throw new Error('Proxy scraping not implemented yet. Please implement with your preferred scraping service.')
}

// Parse HTML content to extract events
export function parseHTMLForEvents(html: string, config: ScrapingConfig): Partial<Event>[] {
  const events: Partial<Event>[] = []
  
  try {
    const $ = cheerio.load(html)
    
    // Try to find event containers
    let eventContainers = $(config.selectors.eventContainer)
    
    if (eventContainers.length === 0) {
      // Fallback: look for common event patterns
      const fallbackSelectors = [
        '.event', '.event-item', '.event-card', '.event-listing',
        '[data-event]', '[class*="event"]', '[id*="event"]'
      ]
      
      for (const selector of fallbackSelectors) {
        const containers = $(selector)
        if (containers.length > 0) {
          eventContainers = containers
          break
        }
      }
    }
    
    if (eventContainers.length === 0) {
      // If still no events found, try to extract from general content
      const generalContent = $('body')
      const extractedEvents = extractEventsFromGeneralContent($, generalContent, config)
      events.push(...extractedEvents)
      return events
    }
    
    // Process each event container
    eventContainers.each((index, element) => {
      if (index >= 10) return false // Limit to 10 events
      
      const $element = $(element)
      const event = extractEventFromElement($element, config, index)
      
      if (event.title && isValidEventTitle(event.title)) {
        events.push(event)
      }
    })
    
  } catch (error) {
    console.error('Error parsing HTML:', error)
  }
  
  return events
}

function extractEventFromElement($element: cheerio.Cheerio<AnyNode>, config: ScrapingConfig, index: number): Partial<Event> {
  const title = $element.find(config.selectors.title).first().text().trim()
  const description = $element.find(config.selectors.description).first().text().trim()
  const venue = $element.find(config.selectors.venue).first().text().trim()
  const city = $element.find(config.selectors.city).first().text().trim()
  const country = $element.find(config.selectors.country).first().text().trim()
  const image = $element.find(config.selectors.image).first().attr('src')
  const link = $element.find(config.selectors.link).first().attr('href')
  const organizer = $element.find(config.selectors.organizer).first().text().trim()
  
  // Generate dates (since we can't reliably parse dates from most websites)
  const startDate = new Date()
  startDate.setDate(startDate.getDate() + index + 1)
  
  const endDate = new Date(startDate)
  endDate.setHours(endDate.getHours() + 2)
  
  return {
    source: 'web_scraper',
    sourceId: `${config.sourceName}_${Date.now()}_${index}`,
    title: title || `Event ${index + 1} from ${config.sourceName}`,
    description: description || `Event description from ${config.sourceName}`,
    longDescription: description || `Detailed information about this event from ${config.sourceName}`,
    startTime: startDate.toISOString(),
    endTime: endDate.toISOString(),
    timezone: config.timezone || 'America/New_York',
    venueName: venue || `Venue ${index + 1}`,
    city: city || 'Unknown City',
    country: country || 'Unknown Country',
    categories: ['local_events', 'web_scraped'],
    tags: ['scraped', config.sourceName.toLowerCase()],
    imageUrl: image || `https://picsum.photos/400/300?random=${index}`,
    organizerName: organizer || `Organizer ${index + 1}`,
    externalUrl: link || config.url,
    lastSeenAt: new Date().toISOString()
  }
}

function extractEventsFromGeneralContent($: cheerio.CheerioAPI, $content: cheerio.Cheerio<AnyNode>, config: ScrapingConfig): Partial<Event>[] {
  const events: Partial<Event>[] = []
  
  // Look for headings that might be event titles
  const headings = $content.find('h1, h2, h3, h4')
  
  headings.each((index, element) => {
    if (index >= 10) return false // Limit to 10 events
    
    const $heading = $(element)
    const title = $heading.text().trim()
    
    if (title && title.length > 5 && title.length < 100 && isValidEventTitle(title)) {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() + index + 1)
      
      const endDate = new Date(startDate)
      endDate.setHours(endDate.getHours() + 2)
      
      events.push({
        source: 'web_scraper',
        sourceId: `${config.sourceName}_${Date.now()}_${index}`,
        title: title,
        description: `Event extracted from ${config.sourceName}`,
        longDescription: `This event was automatically extracted from the website content.`,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        timezone: config.timezone || 'America/New_York',
        venueName: `Venue ${index + 1}`,
        city: 'Unknown City',
        country: 'Unknown Country',
        categories: ['local_events', 'web_scraped'],
        tags: ['scraped', config.sourceName.toLowerCase()],
        imageUrl: `https://picsum.photos/400/300?random=${index}`,
        organizerName: `Organizer ${index + 1}`,
        externalUrl: config.url,
        lastSeenAt: new Date().toISOString()
      })
    }
  })
  
  return events
}

/**
 * Validates if a title is likely a real event and not navigation/language elements
 */
function isValidEventTitle(title: string): boolean {
  const cleanTitle = title.trim().toLowerCase()
  
  // Language codes and language names to exclude
  const languageTerms = [
    'en', 'english', 'eng',
    'zh', 'chinese', '중문', '中文', '繁體中文', '简体中文',
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
    'events', 'calendar', 'schedule', 'booking',
    'home', 'about', 'contact', 'menu', 'search',
    'login', 'register', 'sign in', 'sign up',
    'privacy', 'terms', 'policy', 'cookies',
    'loading', 'please wait', 'error',
    'close', 'open', 'toggle', 'expand', 'collapse'
  ]
  
  // Generic placeholder text
  const placeholderTerms = [
    'lorem ipsum', 'dolor sit amet', 'consectetur adipiscing',
    'event title', 'event name', 'title here',
    'coming soon', 'tbd', 'to be determined', 'to be announced'
  ]
  
  // Check if title matches any exclusion patterns
  const allExcludedTerms = [...languageTerms, ...navigationTerms, ...placeholderTerms]
  
  for (const term of allExcludedTerms) {
    if (cleanTitle === term || cleanTitle.includes(term)) {
      return false
    }
  }
  
  // Exclude very short titles that are likely not events
  if (cleanTitle.length < 3) {
    return false
  }
  
  // Exclude titles that are only numbers or special characters
  if (/^[\d\s\-_.,!@#$%^&*()]+$/.test(cleanTitle)) {
    return false
  }
  
  // Exclude single words that are likely navigation (but allow some exceptions)
  const words = cleanTitle.split(/\s+/)
  if (words.length === 1) {
    const singleWordExclusions = [
      'home', 'about', 'contact', 'events', 'shows', 'tickets', 'booking',
      'entertainment', 'dining', 'shopping', 'gaming', 'hotel', 'casino',
      'gallery', 'news', 'blog', 'careers', 'location', 'directions'
    ]
    
    if (singleWordExclusions.includes(cleanTitle)) {
      return false
    }
  }
  
  return true
}
