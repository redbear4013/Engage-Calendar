import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

/**
 * API route to clean up very old events from the database
 * This helps prevent the calendar from showing events from many months/years ago
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authorization (basic protection)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (!cronSecret || !authHeader || !authHeader.includes(cronSecret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseAdmin = createAdminClient()
    
    // Define cleanup threshold - remove events older than 60 days
    const cleanupThreshold = new Date()
    cleanupThreshold.setDate(cleanupThreshold.getDate() - 60)
    
    console.log(`Starting cleanup of events older than ${cleanupThreshold.toISOString()}`)

    // Delete old events
    const { data, error, count } = await supabaseAdmin
      .from('events')
      .delete({ count: 'exact' })
      .lt('start_time_utc', cleanupThreshold.toISOString())
    
    if (error) {
      console.error('Error cleaning up old events:', error)
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 })
    }

    const deletedCount = count || 0
    console.log(`Successfully deleted ${deletedCount} old events`)

    // Also cleanup very old ingestion logs (keep last 30 days)
    const logThreshold = new Date()
    logThreshold.setDate(logThreshold.getDate() - 30)
    
    const { error: logError, count: logCount } = await supabaseAdmin
      .from('ingestion_logs')
      .delete({ count: 'exact' })
      .lt('created_at', logThreshold.toISOString())
    
    if (logError) {
      console.warn('Error cleaning up old logs:', logError)
    } else {
      console.log(`Successfully deleted ${logCount || 0} old ingestion logs`)
    }

    return NextResponse.json({
      success: true,
      message: `Cleanup completed successfully`,
      deletedEvents: deletedCount,
      deletedLogs: logCount || 0,
      thresholdDate: cleanupThreshold.toISOString()
    })

  } catch (error) {
    console.error('Database cleanup error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Also support GET for manual testing
export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient()
    
    // Just check how many old events exist
    const cleanupThreshold = new Date()
    cleanupThreshold.setDate(cleanupThreshold.getDate() - 60)
    
    const { count, error } = await supabaseAdmin
      .from('events')
      .select('*', { count: 'exact', head: true })
      .lt('start_time_utc', cleanupThreshold.toISOString())
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      oldEventsCount: count || 0,
      thresholdDate: cleanupThreshold.toISOString(),
      message: `Found ${count || 0} events older than 60 days that could be cleaned up`
    })

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}