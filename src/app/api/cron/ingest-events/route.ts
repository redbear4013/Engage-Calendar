import { NextRequest, NextResponse } from 'next/server'
import { ingestEventsFromAllSources, cleanupStaleEvents } from '@/lib/event-ingestion'

export async function GET(request: NextRequest) {
  try {
    // Verify the request is authorized (you might want to add API key verification)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'dev-secret'
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('Starting event ingestion...')
    const startTime = Date.now()

    // Check for sources query parameter
    const url = new URL(request.url)
    const sourcesParam = url.searchParams.get('sources')
    const sourceFilter = sourcesParam ? sourcesParam.split(',').map(s => s.trim()) : null

    // Ingest events from specified sources or all sources
    const result = await ingestEventsFromAllSources(sourceFilter)

    // Cleanup stale events (older than 30 days)
    const cleanupCount = await cleanupStaleEvents(30)

    const executionTime = Date.now() - startTime

    const response = {
      success: result.success,
      executionTime: `${executionTime}ms`,
      eventsProcessed: result.eventsProcessed,
      eventsAdded: result.eventsAdded,
      eventsUpdated: result.eventsUpdated,
      staleEventsRemoved: cleanupCount,
      errors: result.errors,
      timestamp: new Date().toISOString()
    }

    console.log('Event ingestion completed:', response)

    // Return appropriate HTTP status
    const status = result.success ? (result.errors.length > 0 ? 207 : 200) : 500

    return NextResponse.json(response, { status })

  } catch (error) {
    console.error('Event ingestion failed:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Allow POST requests as well for manual triggers
export async function POST(request: NextRequest) {
  try {
    // Verify the request is authorized
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'dev-secret'

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body to check for sources filtering
    let requestBody = null
    try {
      requestBody = await request.json()
    } catch {
      // Ignore JSON parsing errors - use default behavior
    }

    console.log('Starting event ingestion...')
    const startTime = Date.now()

    // Ingest events from specified sources or all sources
    const sourceFilter = requestBody?.sources || null
    const result = await ingestEventsFromAllSources(sourceFilter)

    // Cleanup stale events (older than 30 days)
    const cleanupCount = await cleanupStaleEvents(30)

    const executionTime = Date.now() - startTime

    const response = {
      success: result.success,
      executionTime: `${executionTime}ms`,
      eventsProcessed: result.eventsProcessed,
      eventsAdded: result.eventsAdded,
      eventsUpdated: result.eventsUpdated,
      staleEventsRemoved: cleanupCount,
      errors: result.errors,
      timestamp: new Date().toISOString()
    }

    console.log('Event ingestion completed:', response)

    // Return appropriate HTTP status
    const status = result.success ? (result.errors.length > 0 ? 207 : 200) : 500

    return NextResponse.json(response, { status })

  } catch (error) {
    console.error('Event ingestion failed:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}