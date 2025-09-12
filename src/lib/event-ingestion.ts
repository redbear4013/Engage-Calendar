import { createAdminClient } from '@/lib/supabase'
import { parseRSSFeed } from '@/lib/rss-parser'
import { fetchNewsAPIEvents } from '@/lib/newsapi-client'
import { scrapeEventsFromWebsite } from '@/lib/web-scraper'
import { scrapeMacauDailyStructuredEvents } from '@/lib/macau-daily-structured-scraper'
import { macauCoordinator } from '@/lib/scrapers/macau-coordinator'
import type { Event } from '@/types'

interface IngestionResult {
  success: boolean
  eventsProcessed: number
  eventsAdded: number
  eventsUpdated: number
  errors: string[]
}

export async function ingestEventsFromAllSources(): Promise<IngestionResult> {
  const results: IngestionResult = {
    success: true,
    eventsProcessed: 0,
    eventsAdded: 0,
    eventsUpdated: 0,
    errors: []
  }

  try {
    const supabaseAdmin = createAdminClient()
    
    // Get all active sources
    const { data: sources, error } = await supabaseAdmin
      .from('sources')
      .select('*')
      .eq('active', true)

    if (error) {
      results.success = false
      results.errors.push(`Failed to fetch sources: ${error.message}`)
      return results
    }

    if (!sources || sources.length === 0) {
      results.errors.push('No active sources found')
      return results
    }

    // Process each source
    for (const source of sources) {
      await logIngestionStart(supabaseAdmin, source.id)

      try {
        let events: Partial<Event>[] = []

        if (source.type === 'rss' && source.url) {
          events = await parseRSSFeed(source.url, source.name)
        } else if (source.type === 'newsapi') {
          events = await fetchNewsAPIEvents()
        } else if (source.type === 'web_scraper') {
          // Handle different web scraper types
          if (source.url?.includes('macaodaily.com')) {
            // Existing Macau Daily scraper
            events = (await scrapeMacauDailyStructuredEvents()).events
          } else if (['mgto', 'londoner', 'venetian', 'galaxy', 'mice', 'broadway'].includes(source.id)) {
            // New Macau scrapers
            try {
              const rawEvents = await macauCoordinator.fetchEventsFromSource(
                source.id as 'mgto' | 'londoner' | 'venetian' | 'galaxy' | 'mice' | 'broadway'
              )
              events = macauCoordinator.normalizeEvents(rawEvents)
              console.log(`${source.id}: Normalized ${rawEvents.length} raw events to ${events.length} events`)
            } catch (error) {
              console.error(`Error with Macau scraper ${source.id}:`, error)
              throw error
            }
          } else if (source.url) {
            // Fallback to generic web scraper for other sources
            const scrapingConfig = {
              url: source.url,
              sourceName: source.name,
              selectors: {
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
            events = (await scrapeEventsFromWebsite(scrapingConfig)).events
          }
        }

        if (events.length === 0) {
          await logIngestionResult(supabaseAdmin, source.id, 'success', 'No events found')
          continue
        }

        // Process events in batches
        const batchSize = 10
        for (let i = 0; i < events.length; i += batchSize) {
          const batch = events.slice(i, i + batchSize)
          const batchResult = await processBatch(supabaseAdmin, batch)
          
          results.eventsProcessed += batchResult.processed
          results.eventsAdded += batchResult.added
          results.eventsUpdated += batchResult.updated
          results.errors.push(...batchResult.errors)
        }

        await logIngestionResult(
          supabaseAdmin,
          source.id, 
          'success', 
          `Processed ${events.length} events`
        )

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        results.success = false
        results.errors.push(`Source ${source.name}: ${errorMessage}`)
        await logIngestionResult(supabaseAdmin, source.id, 'failed', errorMessage)
      }
    }

    return results
  } catch (error) {
    results.success = false
    results.errors.push(`Ingestion failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return results
  }
}

async function processBatch(supabaseAdmin: any, events: Partial<Event>[]): Promise<{
  processed: number
  added: number
  updated: number
  errors: string[]
}> {
  const result = {
    processed: 0,
    added: 0,
    updated: 0,
    errors: []
  }

  for (const event of events) {
    try {
      if (!event.sourceId || !event.title) {
        result.errors.push('Event missing required fields')
        continue
      }

      // Check if event already exists
      const { data: existingEvent } = await supabaseAdmin
        .from('events')
        .select('id')
        .eq('source', event.source)
        .eq('source_id', event.sourceId)
        .single()

      if (existingEvent) {
        // Update existing event
        const { error } = await supabaseAdmin
          .from('events')
          .update({
            title: event.title,
            description: event.description,
            long_description: event.longDescription,
            start_time_utc: event.startTime,
            end_time_utc: event.endTime,
            timezone: event.timezone,
            venue_name: event.venueName,
            city: event.city,
            country: event.country,
            lat: event.lat,
            lng: event.lng,
            categories: event.categories,
            tags: event.tags,
            image_url: event.imageUrl,
            organizer_name: event.organizerName,
            external_url: event.externalUrl,
            last_seen_at: new Date().toISOString()
          })
          .eq('id', existingEvent.id)

        if (error) {
          result.errors.push(`Failed to update event: ${error.message}`)
        } else {
          result.updated++
        }
      } else {
        // Insert new event
        const { error } = await supabaseAdmin
          .from('events')
          .insert([{
            source: event.source!,
            source_id: event.sourceId,
            title: event.title,
            description: event.description,
            long_description: event.longDescription,
            start_time_utc: event.startTime,
            end_time_utc: event.endTime,
            timezone: event.timezone,
            venue_name: event.venueName,
            city: event.city,
            country: event.country,
            lat: event.lat,
            lng: event.lng,
            categories: event.categories || ['local_events'],
            tags: event.tags || [],
            image_url: event.imageUrl,
            organizer_name: event.organizerName,
            external_url: event.externalUrl,
            last_seen_at: event.lastSeenAt || new Date().toISOString()
          }])

        if (error) {
          if (error.code === '23505') { // Unique constraint violation
            result.errors.push(`Duplicate event skipped: ${event.title}`)
          } else {
            result.errors.push(`Failed to insert event: ${error.message}`)
          }
        } else {
          result.added++
        }
      }

      result.processed++
    } catch (error) {
      result.errors.push(`Event processing error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return result
}

async function logIngestionStart(supabaseAdmin: any, sourceId: string): Promise<void> {
  await supabaseAdmin
    .from('ingestion_logs')
    .insert([{
      source_id: sourceId,
      status: 'started',
      message: 'Ingestion started'
    }])
}

async function logIngestionResult(
  supabaseAdmin: any,
  sourceId: string, 
  status: 'success' | 'failed', 
  message: string
): Promise<void> {
  await supabaseAdmin
    .from('ingestion_logs')
    .insert([{
      source_id: sourceId,
      status,
      message
    }])
}

// Cleanup old events that haven't been seen in a while
export async function cleanupStaleEvents(daysSinceLastSeen: number = 30): Promise<number> {
  const supabaseAdmin = createAdminClient()
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastSeen)

  const { count, error } = await supabaseAdmin
    .from('events')
    .delete()
    .lt('last_seen_at', cutoffDate.toISOString())

  if (error) {
    throw new Error(`Failed to cleanup stale events: ${error.message}`)
  }

  return count || 0
}