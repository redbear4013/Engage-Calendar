import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('Adding Macau Daily source to database...')
    
    const supabase = createAdminClient()
    
    // Add the Macau Daily source
    const { data, error } = await supabase
      .from('sources')
      .insert({
        type: 'web_scraper',
        name: 'Macau Daily News',
        url: 'https://www.macaodaily.com/html/2025-08/28/node_2.htm',
        active: true
      })

    if (error) {
      console.error('Failed to add Macau Daily source:', error)
      return NextResponse.json({
        success: false,
        error: error.message,
        message: 'Failed to add Macau Daily source to database'
      }, { status: 500 })
    }

    console.log('Successfully added Macau Daily source to database')
    
    // Verify the source was added
    const { data: verifyData, error: verifyError } = await supabase
      .from('sources')
      .select('*')
      .eq('url', 'https://www.macaodaily.com/html/2025-08/28/node_2.htm')
      .single()

    if (verifyError) {
      console.error('Failed to verify source:', verifyError)
    }

    return NextResponse.json({
      success: true,
      message: 'Macau Daily source successfully added to database',
      source: verifyData || data,
      nextSteps: [
        'Source is now active and will be used by the event ingestion system',
        'Events will be automatically scraped and added to your calendar',
        'You can test the scraper using /api/scrape-macau-daily-structured',
        'Events will appear in the upcoming events panel on the right side of your calendar'
      ]
    })
    
  } catch (error) {
    console.error('Error adding Macau Daily source:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Internal server error while adding Macau Daily source'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = createAdminClient()
    
    // Check if Macau Daily source already exists
    const { data, error } = await supabase
      .from('sources')
      .select('*')
      .eq('url', 'https://www.macaodaily.com/html/2025-08/28/node_2.htm')
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error
    }

    if (data) {
      return NextResponse.json({
        message: 'Macau Daily source already exists in database',
        source: data,
        status: 'active',
        nextSteps: [
          'Source is ready to use',
          'Test the scraper: POST /api/scrape-macau-daily-structured',
          'Trigger event ingestion: POST /api/cron/ingest-events'
        ]
      })
    } else {
      return NextResponse.json({
        message: 'Macau Daily source not found in database',
        status: 'not_found',
        action: 'Use POST to add the source',
        usage: 'POST /api/add-macau-daily-source'
      })
    }
    
  } catch (error) {
    console.error('Error checking Macau Daily source:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to check Macau Daily source status'
    }, { status: 500 })
  }
}
