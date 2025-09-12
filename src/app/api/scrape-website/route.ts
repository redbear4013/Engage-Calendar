import { NextRequest, NextResponse } from 'next/server'
import { scrapeEventsFromWebsite } from '@/lib/web-scraper'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url, sourceName, selectors } = body

    if (!url || !sourceName) {
      return NextResponse.json(
        { error: 'URL and sourceName are required' },
        { status: 400 }
      )
    }

    console.log(`Scraping website: ${url}`)

    const config = {
      url,
      sourceName,
      selectors: selectors || {
        eventContainer: '.event-item, .event, [data-event]',
        title: 'h1, h2, h3, .event-title, .title',
        description: '.description, .summary, .event-description',
        date: '.date, .event-date, [data-date]',
        time: '.time, .event-time, [data-time]',
        venue: '.venue, .location, .event-venue',
        city: '.city, .event-city, [data-city]',
        country: '.country, .event-country, [data-country]',
        image: 'img, .event-image, [data-image]',
        link: 'a, .event-link, [data-link]',
        organizer: '.organizer, .event-organizer, [data-organizer]'
      },
      timezone: 'America/New_York'
    }

    const result = await scrapeEventsFromWebsite(config)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Scraping failed', details: result.errors },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      events: result.events,
      count: result.events.length,
      source: url
    })

  } catch (error) {
    console.error('Web scraping failed:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { error: 'Use POST method for web scraping' },
    { status: 405 }
  )
}
