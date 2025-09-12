import { MGTOScraper } from './macau/mgto'
import { MGTOAIScraper } from './macau/mgto-ai'
import { createLondonerScraper, createVenetianScraper } from './macau/sands'
import { GalaxyScraper } from './macau/galaxy'
import { MICEScraper } from './macau/mice'
import { createBroadwayScraper } from './macau/broadway'
import { RawEvent, ScrapingResult, ScraperError, ScraperErrorType } from './types'
import type { Event } from '@/types'

/**
 * Coordinates all Macau scrapers and normalizes their output
 */
export class MacauCoordinator {
  private scrapers = new Map([
    ['mgto', this.createMGTOScraper()],
    ['londoner', createLondonerScraper()],
    ['venetian', createVenetianScraper()],
    ['galaxy', new GalaxyScraper()],
    ['mice', new MICEScraper()],
    ['broadway', createBroadwayScraper()]
  ])

  /**
   * Create MGTO scraper - use AI version if Firecrawl API key is available
   */
  private createMGTOScraper() {
    const hasFirecrawlKey = !!process.env.FIRECRAWL_API_KEY
    
    if (hasFirecrawlKey) {
      console.log('🤖 Using AI-powered MGTO scraper (Firecrawl available)')
      return new MGTOAIScraper()
    } else {
      console.log('🔧 Using traditional MGTO scraper (Firecrawl not available)')
      return new MGTOScraper()
    }
  }

  /**
   * Fetch events from a specific Macau source
   */
  async fetchEventsFromSource(sourceId: 'mgto' | 'londoner' | 'venetian' | 'galaxy' | 'mice' | 'broadway'): Promise<RawEvent[]> {
    const scraper = this.scrapers.get(sourceId)
    if (!scraper) {
      throw new ScraperError(
        ScraperErrorType.INVALID_RESPONSE,
        `Unknown scraper source: ${sourceId}`,
        sourceId
      )
    }

    try {
      const events = await scraper.fetchAndParse()
      console.log(`${sourceId} scraper returned ${events.length} events`)
      return events
    } catch (error) {
      console.error(`Error scraping ${sourceId}:`, error)
      throw error
    }
  }

  /**
   * Fetch events from all active Macau sources
   */
  async fetchAllMacauEvents(): Promise<ScrapingResult> {
    const results: ScrapingResult = {
      success: true,
      events: [],
      errors: [],
      metadata: {
        scrapedAt: new Date().toISOString(),
        totalFound: 0,
        processedCount: 0
      }
    }

    const scrapingPromises = Array.from(this.scrapers.entries()).map(async ([sourceId, scraper]) => {
      try {
        const events = await scraper.fetchAndParse()
        return { sourceId, events, error: null }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : `Unknown error in ${sourceId}`
        console.error(`Failed to scrape ${sourceId}:`, error)
        return { sourceId, events: [], error: errorMessage }
      }
    })

    // Wait for all scrapers to complete (or fail)
    const scrapingResults = await Promise.allSettled(scrapingPromises)
    
    for (const result of scrapingResults) {
      if (result.status === 'fulfilled') {
        const { sourceId, events, error } = result.value
        if (error) {
          results.errors.push(`${sourceId}: ${error}`)
        } else {
          results.events.push(...events)
          results.metadata!.totalFound += events.length
        }
      } else {
        results.errors.push(`Scraping failed: ${result.reason}`)
      }
    }

    results.metadata!.processedCount = results.events.length
    results.success = results.errors.length === 0 || results.events.length > 0

    console.log(`Macau coordinator: ${results.events.length} total events, ${results.errors.length} errors`)
    return results
  }

  /**
   * Normalize raw events to the application's Event format
   */
  normalizeEvents(rawEvents: RawEvent[]): Partial<Event>[] {
    return rawEvents.map(rawEvent => this.normalizeEvent(rawEvent)).filter(Boolean) as Partial<Event>[]
  }

  /**
   * Normalize a single raw event to the application's Event format
   */
  private normalizeEvent(rawEvent: RawEvent): Partial<Event> | null {
    try {
      // Validate required fields
      if (!rawEvent.title || !rawEvent.source_id || !rawEvent.start) {
        console.warn('Skipping event with missing required fields:', rawEvent)
        return null
      }

      // Ensure categories include Macau-specific tags
      const categories = [...(rawEvent.categories || ['local_events'])]
      if (!categories.includes('macau')) {
        categories.push('macau')
      }

      // Add resort tags for casino events
      const tags = ['macau']
      if (rawEvent.source === 'londoner') {
        tags.push('londoner', 'sands', 'resort')
      } else if (rawEvent.source === 'venetian') {
        tags.push('venetian', 'sands', 'resort')
      } else if (rawEvent.source === 'galaxy') {
        tags.push('galaxy', 'resort')
      } else if (rawEvent.source === 'mgto') {
        tags.push('government', 'tourism')
      } else if (rawEvent.source === 'mice') {
        tags.push('business', 'professional')
      } else if (rawEvent.source === 'broadway') {
        tags.push('broadway', 'entertainment', 'theater')
      }

      // Normalize venue name
      let venueName = rawEvent.venue
      if (venueName && !venueName.toLowerCase().includes('macau')) {
        venueName = `${venueName}, Macau`
      }

      const normalizedEvent: Partial<Event> = {
        source: 'web_scraper', // All Macau scrapers use web_scraper type
        sourceId: rawEvent.source_id,
        title: rawEvent.title,
        description: rawEvent.description,
        longDescription: rawEvent.description ? `${rawEvent.description}\n\nSource: ${this.getSourceDisplayName(rawEvent.source)}` : undefined,
        startTime: rawEvent.start,
        endTime: rawEvent.end,
        timezone: 'Asia/Macau',
        venueName: venueName,
        city: 'Macau',
        country: 'China',
        lat: this.getApproximateLatitude(rawEvent.source),
        lng: this.getApproximateLongitude(rawEvent.source),
        categories: categories,
        tags: tags,
        imageUrl: rawEvent.image_url,
        organizerName: this.getOrganizerName(rawEvent.source),
        externalUrl: rawEvent.url,
        lastSeenAt: new Date().toISOString()
      }

      // Add ticket URL to description if available
      if (rawEvent.ticket_url) {
        normalizedEvent.longDescription = (normalizedEvent.longDescription || '') + 
          `\n\nTickets: ${rawEvent.ticket_url}`
      }

      return normalizedEvent

    } catch (error) {
      console.error('Error normalizing event:', rawEvent, error)
      return null
    }
  }

  /**
   * Get display name for source
   */
  private getSourceDisplayName(source: RawEvent['source']): string {
    const names = {
      mgto: 'Macau Government Tourism Office',
      londoner: 'The Londoner Macao',
      venetian: 'The Venetian Macao',
      galaxy: 'Galaxy Macau',
      mice: 'Macau MICE Portal',
      broadway: 'Broadway Macau',
      ai_scraper: 'AI-Powered Scraper',
      fallback_scraper: 'Fallback CSS Scraper'
    }
    return names[source] || source
  }

  /**
   * Get organizer name based on source
   */
  private getOrganizerName(source: RawEvent['source']): string {
    const organizers = {
      mgto: 'Macau Government Tourism Office',
      londoner: 'The Londoner Macao',
      venetian: 'The Venetian Macao',
      galaxy: 'Galaxy Macau',
      mice: 'Macau MICE',
      broadway: 'Broadway Macau',
      ai_scraper: 'AI-Powered Scraper',
      fallback_scraper: 'Fallback Scraper'
    }
    return organizers[source] || 'Unknown'
  }

  /**
   * Get approximate latitude for venues (for map display)
   */
  private getApproximateLatitude(source: RawEvent['source']): number {
    const coordinates = {
      mgto: 22.1987, // Central Macau
      londoner: 22.1430, // Cotai Strip
      venetian: 22.1435, // Cotai Strip
      galaxy: 22.1390, // Cotai Strip
      mice: 22.1580, // Convention areas
      broadway: 22.1420, // Broadway Macau - Galaxy area
    }
    return coordinates[source] || 22.1987
  }

  /**
   * Get approximate longitude for venues (for map display)
   */
  private getApproximateLongitude(source: RawEvent['source']): number {
    const coordinates = {
      mgto: 113.5439, // Central Macau
      londoner: 113.5571, // Cotai Strip
      venetian: 113.5586, // Cotai Strip
      galaxy: 113.5560, // Cotai Strip
      mice: 113.5500, // Convention areas
      broadway: 113.5540, // Broadway Macau - Galaxy area
    }
    return coordinates[source] || 113.5439
  }
}

// Export a singleton instance
export const macauCoordinator = new MacauCoordinator()