import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient()
    
    // Check database connectivity
    const { data: dbTest, error: dbError } = await supabaseAdmin
      .from('sources')
      .select('count')
      .limit(1)

    if (dbError) {
      return NextResponse.json(
        {
          status: 'unhealthy',
          error: 'Database connection failed',
          details: dbError.message,
          timestamp: new Date().toISOString()
        },
        { status: 503 }
      )
    }

    // Get recent ingestion logs for each source
    const { data: sources, error: sourcesError } = await supabaseAdmin
      .from('sources')
      .select('id, name, type, active')
      .eq('active', true)

    if (sourcesError) {
      return NextResponse.json(
        {
          status: 'unhealthy',
          error: 'Failed to fetch sources',
          details: sourcesError.message,
          timestamp: new Date().toISOString()
        },
        { status: 503 }
      )
    }

    // Get last ingestion status for each source
    const sourceHealth = await Promise.all(
      (sources || []).map(async (source) => {
        const { data: lastLog, error: logError } = await supabaseAdmin
          .from('ingestion_logs')
          .select('status, message, created_at')
          .eq('source_id', source.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        return {
          source_id: source.id,
          source_name: source.name,
          source_type: source.type,
          active: source.active,
          last_ingestion: lastLog ? {
            status: lastLog.status,
            message: lastLog.message,
            timestamp: lastLog.created_at
          } : null,
          health_status: logError || !lastLog 
            ? 'unknown' 
            : lastLog.status === 'success' 
              ? 'healthy' 
              : 'unhealthy'
        }
      })
    )

    // Get event counts by source
    const { data: eventCounts, error: eventCountError } = await supabaseAdmin
      .from('events')
      .select('source')

    const eventCountsBySource = eventCounts?.reduce((acc: Record<string, number>, event: any) => {
      acc[event.source] = (acc[event.source] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    // Overall health assessment
    const healthySources = sourceHealth.filter(s => s.health_status === 'healthy').length
    const totalSources = sourceHealth.length
    const overallStatus = totalSources === 0 
      ? 'unknown' 
      : healthySources >= totalSources * 0.5 
        ? 'healthy' 
        : 'degraded'

    const response = {
      status: overallStatus,
      database: 'connected',
      sources: {
        total: totalSources,
        healthy: healthySources,
        degraded: totalSources - healthySources,
        details: sourceHealth
      },
      events: {
        total_count: Object.values(eventCountsBySource).reduce((sum: number, count: number) => sum + count, 0),
        by_source: eventCountsBySource
      },
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }

    const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 207 : 503

    return NextResponse.json(response, { status: statusCode })

  } catch (error) {
    console.error('Health check failed:', error)
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: 'Health check failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    )
  }
}