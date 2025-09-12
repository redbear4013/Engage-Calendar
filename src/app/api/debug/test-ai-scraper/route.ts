import { NextRequest, NextResponse } from 'next/server'
import { MGTOAIScraper } from '@/lib/scrapers/macau/mgto-ai'

/**
 * Debug endpoint to test the new AI-powered MGTO scraper
 * Tests specifically for September events that were previously missed
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    console.log('🤖 Testing AI-powered MGTO scraper via API endpoint...')
    
    // Check if Firecrawl API key is available
    const hasFirecrawlKey = !!process.env.FIRECRAWL_API_KEY
    
    const scraper = new MGTOAIScraper()
    const events = await scraper.fetchAndParse()
    
    const duration = Date.now() - startTime
    
    // Look specifically for September events
    const septemberEvents = events.filter(event => {
      const title = event.title.toLowerCase()
      const desc = event.description?.toLowerCase() || ''
      return title.includes('sep') || title.includes('september') || 
             desc.includes('sep') || desc.includes('september')
    })
    
    // Test specific target events we're looking for
    const targetEvents = [
      { name: 'fringe festival', found: false },
      { name: 'fireworks display', found: false },
      { name: 'world tourism day', found: false }
    ]
    
    targetEvents.forEach(target => {
      target.found = events.some(event => 
        event.title.toLowerCase().includes(target.name) ||
        event.description?.toLowerCase().includes(target.name)
      )
    })
    
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      duration_ms: duration,
      firecrawl_available: hasFirecrawlKey,
      summary: {
        total_events: events.length,
        september_events: septemberEvents.length,
        target_events_found: targetEvents.filter(t => t.found).length,
        sources: [...new Set(events.map(e => e.source))],
        categories: [...new Set(events.flatMap(e => e.categories || []))]
      },
      target_detection: targetEvents,
      september_events: septemberEvents.map(event => ({
        title: event.title,
        start: event.start,
        end: event.end,
        venue: event.venue,
        categories: event.categories,
        url: event.url,
        description: event.description?.substring(0, 200) + (event.description?.length > 200 ? '...' : '')
      })),
      all_events: events.slice(0, 10).map(event => ({ // Limit to first 10 for API response size
        title: event.title,
        start: event.start,
        source: event.source,
        categories: event.categories
      }))
    }
    
    if (septemberEvents.length === 0) {
      console.warn('⚠️  No September events found by AI scraper')
      response.warnings = [
        'No September events detected',
        'Expected events: "23rd Macao City Fringe Festival", "33rd Macao International Fireworks Display Contest", "World Tourism Day"'
      ]
    } else {
      console.log(`✅ AI scraper found ${septemberEvents.length} September events`)
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('❌ AI scraper test failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
      firecrawl_available: !!process.env.FIRECRAWL_API_KEY,
      debugging_info: {
        error_type: error instanceof Error ? error.constructor.name : typeof error,
        stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5) : undefined,
        suggestions: [
          'Check network connectivity',
          'Verify MGTO website is accessible',
          'Check if Firecrawl API key is valid (if using AI mode)',
          'Review server logs for detailed error information'
        ]
      }
    }, { status: 500 })
  }
}

/**
 * POST endpoint to trigger AI scraper test manually
 */
export async function POST(request: NextRequest) {
  return GET(request) // Same logic for both GET and POST
}