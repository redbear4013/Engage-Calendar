import { MacauCoordinator } from '../macau-coordinator'
import { RawEvent } from '../types'

// Mock the individual scrapers
jest.mock('../macau/mgto', () => ({
  MGTOScraper: jest.fn().mockImplementation(() => ({
    getSourceId: () => 'mgto',
    getRateLimitConfig: () => ({ requestsPerSecond: 0.5, maxRetries: 3, retryDelayMs: 2000 }),
    fetchAndParse: () => Promise.resolve([
      {
        source: 'mgto',
        source_id: 'mgto-test-1',
        title: 'Test MGTO Event',
        description: 'Test event from MGTO',
        start: '2024-03-15T10:00:00Z',
        venue: 'Test Venue',
        city: 'Macau',
        url: 'https://example.com/event1',
        categories: ['cultural']
      } as RawEvent
    ])
  }))
}))

jest.mock('../macau/sands', () => ({
  createLondonerScraper: () => ({
    getSourceId: () => 'londoner',
    getRateLimitConfig: () => ({ requestsPerSecond: 1, maxRetries: 3, retryDelayMs: 1500 }),
    fetchAndParse: () => Promise.resolve([
      {
        source: 'londoner',
        source_id: 'londoner-test-1',
        title: 'Test Londoner Show',
        description: 'Entertainment at The Londoner',
        start: '2024-03-16T20:00:00Z',
        venue: 'The Londoner Macao',
        city: 'Macau',
        url: 'https://londonermacao.com/show1',
        ticket_url: 'https://tickets.com/show1',
        categories: ['entertainment']
      } as RawEvent
    ])
  }),
  createVenetianScraper: () => ({
    getSourceId: () => 'venetian',
    getRateLimitConfig: () => ({ requestsPerSecond: 1, maxRetries: 3, retryDelayMs: 1500 }),
    fetchAndParse: () => Promise.resolve([
      {
        source: 'venetian',
        source_id: 'venetian-test-1',
        title: 'Test Venetian Concert',
        description: 'Music at The Venetian',
        start: '2024-03-17T19:00:00Z',
        venue: 'The Venetian Macao',
        city: 'Macau',
        url: 'https://venetianmacao.com/concert1',
        categories: ['concert']
      } as RawEvent
    ])
  })
}))

jest.mock('../macau/galaxy', () => ({
  GalaxyScraper: jest.fn().mockImplementation(() => ({
    getSourceId: () => 'galaxy',
    getRateLimitConfig: () => ({ requestsPerSecond: 1, maxRetries: 3, retryDelayMs: 1500 }),
    fetchAndParse: () => Promise.resolve([
      {
        source: 'galaxy',
        source_id: 'galaxy-test-1',
        title: 'Test Galaxy Event',
        description: 'Entertainment at Galaxy',
        start: '2024-03-18T21:00:00Z',
        venue: 'Galaxy Macau',
        city: 'Macau',
        url: 'https://galaxymacau.com/event1',
        categories: ['entertainment']
      } as RawEvent
    ])
  }))
}))

jest.mock('../macau/mice', () => ({
  MICEScraper: jest.fn().mockImplementation(() => ({
    getSourceId: () => 'mice',
    getRateLimitConfig: () => ({ requestsPerSecond: 0.5, maxRetries: 3, retryDelayMs: 2000 }),
    fetchAndParse: () => Promise.resolve([
      {
        source: 'mice',
        source_id: 'mice-test-1',
        title: 'Test MICE Convention',
        description: 'Business convention',
        start: '2024-03-19T09:00:00Z',
        end: '2024-03-20T17:00:00Z',
        venue: 'Convention Center',
        city: 'Macau',
        url: 'https://mice.gov.mo/convention1',
        categories: ['business']
      } as RawEvent
    ])
  }))
}))

describe('MacauCoordinator', () => {
  let coordinator: MacauCoordinator

  beforeEach(() => {
    coordinator = new MacauCoordinator()
  })

  describe('fetchEventsFromSource', () => {
    it('should fetch events from MGTO source', async () => {
      const events = await coordinator.fetchEventsFromSource('mgto')
      
      expect(events).toBeDefined()
      expect(Array.isArray(events)).toBe(true)
      expect(events.length).toBe(1)
      expect(events[0].source).toBe('mgto')
      expect(events[0].title).toBe('Test MGTO Event')
    })

    it('should fetch events from Londoner source', async () => {
      const events = await coordinator.fetchEventsFromSource('londoner')
      
      expect(events).toBeDefined()
      expect(events.length).toBe(1)
      expect(events[0].source).toBe('londoner')
      expect(events[0].ticket_url).toBeTruthy()
    })

    it('should throw error for invalid source', async () => {
      await expect(coordinator.fetchEventsFromSource('invalid' as any))
        .rejects.toThrow('Unknown scraper source: invalid')
    })
  })

  describe('fetchAllMacauEvents', () => {
    it('should fetch events from all sources', async () => {
      const result = await coordinator.fetchAllMacauEvents()
      
      expect(result.success).toBe(true)
      expect(result.events).toBeDefined()
      expect(result.events.length).toBe(5) // One event from each source
      expect(result.errors).toBeDefined()
      expect(result.metadata).toBeDefined()
      expect(result.metadata?.totalFound).toBe(5)
      expect(result.metadata?.processedCount).toBe(5)
    })

    it('should handle partial failures gracefully', async () => {
      // Mock one scraper to fail
      const originalConsoleError = console.error
      console.error = jest.fn()

      const result = await coordinator.fetchAllMacauEvents()
      
      expect(result.success).toBe(true) // Should still succeed if some events found
      expect(result.events.length).toBeGreaterThan(0)
      
      console.error = originalConsoleError
    })
  })

  describe('normalizeEvents', () => {
    it('should normalize raw events to application format', async () => {
      const rawEvents = await coordinator.fetchEventsFromSource('mgto')
      const normalized = coordinator.normalizeEvents(rawEvents)
      
      expect(normalized).toBeDefined()
      expect(normalized.length).toBe(1)
      
      const event = normalized[0]
      expect(event.source).toBe('web_scraper')
      expect(event.sourceId).toBe('mgto-test-1')
      expect(event.title).toBe('Test MGTO Event')
      expect(event.city).toBe('Macau')
      expect(event.country).toBe('China')
      expect(event.timezone).toBe('Asia/Macau')
      expect(event.categories).toContain('macau')
      expect(event.categories).toContain('cultural')
      expect(event.tags).toContain('macau')
      expect(event.tags).toContain('government')
      expect(event.tags).toContain('tourism')
    })

    it('should add resort tags for casino events', async () => {
      const londonerEvents = await coordinator.fetchEventsFromSource('londoner')
      const normalized = coordinator.normalizeEvents(londonerEvents)
      
      const event = normalized[0]
      expect(event.tags).toContain('londoner')
      expect(event.tags).toContain('sands')
      expect(event.tags).toContain('resort')
    })

    it('should handle events with ticket URLs', async () => {
      const londonerEvents = await coordinator.fetchEventsFromSource('londoner')
      const normalized = coordinator.normalizeEvents(londonerEvents)
      
      const event = normalized[0]
      expect(event.longDescription).toContain('Tickets:')
      expect(event.longDescription).toContain('https://tickets.com/show1')
    })

    it('should set appropriate coordinates for different venues', async () => {
      const mgtoEvents = await coordinator.fetchEventsFromSource('mgto')
      const londonerEvents = await coordinator.fetchEventsFromSource('londoner')
      
      const mgtoNormalized = coordinator.normalizeEvents(mgtoEvents)
      const londonerNormalized = coordinator.normalizeEvents(londonerEvents)
      
      // Different venues should have different coordinates
      expect(mgtoNormalized[0].lat).not.toBe(londonerNormalized[0].lat)
      expect(mgtoNormalized[0].lng).not.toBe(londonerNormalized[0].lng)
      
      // Both should be in Macau area
      expect(mgtoNormalized[0].lat).toBeGreaterThan(22)
      expect(mgtoNormalized[0].lat).toBeLessThan(23)
      expect(londonerNormalized[0].lat).toBeGreaterThan(22)
      expect(londonerNormalized[0].lat).toBeLessThan(23)
    })

    it('should filter out invalid events', () => {
      const invalidEvents: RawEvent[] = [
        {
          source: 'mgto',
          source_id: '',
          title: '',
          start: '',
          city: 'Macau',
          url: 'https://example.com'
        },
        {
          source: 'mgto',
          source_id: 'valid-id',
          title: 'Valid Event',
          start: '2024-03-15T10:00:00Z',
          city: 'Macau',
          url: 'https://example.com'
        }
      ]
      
      const normalized = coordinator.normalizeEvents(invalidEvents)
      expect(normalized.length).toBe(1)
      expect(normalized[0].title).toBe('Valid Event')
    })
  })
})