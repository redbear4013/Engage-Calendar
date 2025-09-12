import { NextRequest, NextResponse } from 'next/server'
import { scrapeMacauDailyEvents } from '@/lib/macau-daily-scraper'

export async function POST(request: NextRequest) {
  try {
    console.log('Starting Macau Daily scraping...')
    
    const result = await scrapeMacauDailyEvents()
    
    if (result.success) {
      console.log(`Successfully scraped ${result.events.length} events from Macau Daily`)
      return NextResponse.json({
        success: true,
        events: result.events,
        count: result.events.length,
        message: `Successfully scraped ${result.events.length} events from Macau Daily`
      })
    } else {
      console.error('Macau Daily scraping failed:', result.errors)
      return NextResponse.json({
        success: false,
        errors: result.errors,
        message: 'Failed to scrape Macau Daily events'
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('Error in Macau Daily scraping endpoint:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Internal server error during Macau Daily scraping'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Macau Daily scraper endpoint. Use POST to scrape events.',
    usage: 'POST /api/scrape-macau-daily'
  })
}
