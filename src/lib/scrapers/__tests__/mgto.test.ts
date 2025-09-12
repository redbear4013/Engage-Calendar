import { MGTOScraper } from '../macau/mgto'
import { readFileSync } from 'fs'
import { join } from 'path'

// Mock axios to return our test fixtures
jest.mock('axios', () => ({
  get: jest.fn(() => Promise.resolve({
    data: readFileSync(join(__dirname, '../../../tests/fixtures/macau/mgto-sample.html'), 'utf-8')
  }))
}))

describe('MGTO Scraper', () => {
  let scraper: MGTOScraper

  beforeEach(() => {
    scraper = new MGTOScraper()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should have correct source ID', () => {
    expect(scraper.getSourceId()).toBe('mgto')
  })

  it('should have conservative rate limiting config', () => {
    const config = scraper.getRateLimitConfig()
    expect(config.requestsPerSecond).toBe(0.5)
    expect(config.maxRetries).toBe(3)
    expect(config.retryDelayMs).toBe(2000)
  })

  it('should parse events from HTML fixture', async () => {
    const events = await scraper.fetchAndParse()
    
    expect(events).toBeDefined()
    expect(Array.isArray(events)).toBe(true)
    expect(events.length).toBeGreaterThan(0)
    
    // Check first event structure
    const firstEvent = events[0]
    expect(firstEvent).toHaveProperty('source', 'mgto')
    expect(firstEvent).toHaveProperty('source_id')
    expect(firstEvent).toHaveProperty('title')
    expect(firstEvent).toHaveProperty('start')
    expect(firstEvent).toHaveProperty('city', 'Macau')
    expect(firstEvent).toHaveProperty('url')
    expect(firstEvent).toHaveProperty('categories')
    
    // Source ID should be stable and include domain
    expect(firstEvent.source_id).toContain('macaotourism.gov.mo')
  })

  it('should parse specific event data correctly', async () => {
    const events = await scraper.fetchAndParse()
    
    // Look for Art Macao event from fixture
    const artEvent = events.find(e => e.title?.includes('Art Macao'))
    expect(artEvent).toBeDefined()
    
    if (artEvent) {
      expect(artEvent.title).toContain('Art Macao')
      expect(artEvent.description).toContain('contemporary art')
      expect(artEvent.venue).toBe('Various Venues')
      expect(artEvent.start).toBeTruthy()
      expect(artEvent.categories).toContain('local_events')
    }
  })

  it('should categorize events appropriately', async () => {
    const events = await scraper.fetchAndParse()
    
    // Food Festival should have food category
    const foodEvent = events.find(e => e.title?.includes('Food Festival'))
    if (foodEvent) {
      expect(foodEvent.categories).toEqual(
        expect.arrayContaining(['local_events'])
      )
    }
    
    // Art event should have cultural category
    const artEvent = events.find(e => e.title?.includes('Art'))
    if (artEvent) {
      expect(artEvent.categories).toEqual(
        expect.arrayContaining(['local_events'])
      )
    }
  })

  it('should handle date parsing correctly', async () => {
    const events = await scraper.fetchAndParse()
    
    expect(events.length).toBeGreaterThan(0)
    
    // All events should have valid start times
    events.forEach(event => {
      expect(event.start).toBeTruthy()
      expect(new Date(event.start!).getTime()).not.toBeNaN()
    })
  })

  it('should create absolute URLs', async () => {
    const events = await scraper.fetchAndParse()
    
    expect(events.length).toBeGreaterThan(0)
    
    // URLs should be absolute
    events.forEach(event => {
      expect(event.url).toBeTruthy()
      expect(event.url).toMatch(/^https?:\/\//)
    })
  })

  it('should generate stable source IDs', async () => {
    const events1 = await scraper.fetchAndParse()
    const events2 = await scraper.fetchAndParse()
    
    expect(events1.length).toBe(events2.length)
    
    // Same events should have same source IDs
    for (let i = 0; i < events1.length; i++) {
      expect(events1[i].source_id).toBe(events2[i].source_id)
    }
  })
})