import { NextRequest, NextResponse } from 'next/server'
import { scrapeMacauDailyStructuredEvents } from '@/lib/macau-daily-structured-scraper'

export async function POST(request: NextRequest) {
  try {
    console.log('Starting Macau Daily Structured Scraper...')
    
    const result = await scrapeMacauDailyStructuredEvents()
    
    if (result.success) {
      console.log(`Successfully scraped ${result.events.length} structured events from Macau Daily`)
      return NextResponse.json({
        success: true,
        events: result.events,
        count: result.events.length,
        message: `Successfully scraped ${result.events.length} structured events from Macau Daily`,
        source: 'ChatGPT Analysis + Web Scraping',
        knownEvents: [
          '琴島森呼吸·健康生活季（3場次）',
          '2025 香港小姐競選決賽',
          '可口可樂盃青少年小球聯賽',
          '「都市沒藥」梁潔雯工筆畫展'
        ]
      })
    } else {
      console.error('Macau Daily structured scraping failed:', result.errors)
      return NextResponse.json({
        success: false,
        errors: result.errors,
        message: 'Failed to scrape Macau Daily structured events'
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('Error in Macau Daily structured scraping endpoint:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Internal server error during Macau Daily structured scraping'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Macau Daily Structured Scraper endpoint. Use POST to scrape events.',
    usage: 'POST /api/scrape-macau-daily-structured',
    description: 'This endpoint provides 6 real events identified by ChatGPT analysis:',
    knownEvents: [
      '琴島森呼吸·健康生活季（康養主題活動） - 3場次：8/30, 9/13, 9/20',
      '2025 香港小姐競選決賽 - 8/31 香港將軍澳電視城',
      '可口可樂盃青少年小球聯賽（開賽） - 9/17 澳門',
      '「都市沒藥」梁潔雯工筆畫展 - 展期至 9/13 澳門官樂怡基金會畫廊'
    ],
    features: [
      'Real event dates and locations',
      'Proper Chinese language support',
      'Accurate venue and city information',
      'Smart categorization based on content',
      'Fallback to known events if scraping fails'
    ]
  })
}
