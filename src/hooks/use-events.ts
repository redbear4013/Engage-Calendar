'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { CalendarEvent } from '@/types'

interface UseEventsOptions {
  filters?: {
    searchQuery?: string
    categories?: string[]
    city?: string
    dateRange?: {
      start: Date
      end: Date
    }
  }
}

export function useEvents(options: UseEventsOptions = {}) {
  return useQuery({
    queryKey: ['events', options.filters],
    queryFn: async (): Promise<CalendarEvent[]> => {
      let query = supabase
        .from('events')
        .select(`
          *,
          saved_events!left(id, user_id)
        `)
        .order('start_time_utc', { ascending: true })

      // Apply filters
      if (options.filters?.searchQuery) {
        query = query.or(`title.ilike.%${options.filters.searchQuery}%,description.ilike.%${options.filters.searchQuery}%`)
      }

      if (options.filters?.categories && options.filters.categories.length > 0) {
        query = query.overlaps('categories', options.filters.categories)
      }

      if (options.filters?.city) {
        query = query.ilike('city', `%${options.filters.city}%`)
      }

      if (options.filters?.dateRange) {
        query = query
          .gte('start_time_utc', options.filters.dateRange.start.toISOString())
          .lte('start_time_utc', options.filters.dateRange.end.toISOString())
      } else {
        // Default: Only show events from 30 days ago to 1 year in the future
        // This prevents showing very old events while allowing some past events
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        
        const oneYearFromNow = new Date()
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1)
        
        query = query
          .gte('start_time_utc', thirtyDaysAgo.toISOString())
          .lte('start_time_utc', oneYearFromNow.toISOString())
      }

      const { data, error } = await query

      if (error) throw error

      // Transform the data to include saved status
      return data.map(event => ({
        id: event.id,
        source: event.source,
        sourceId: event.source_id,
        title: event.title,
        description: event.description,
        longDescription: event.long_description,
        startTime: event.start_time_utc,
        endTime: event.end_time_utc,
        timezone: event.timezone,
        venueName: event.venue_name,
        city: event.city,
        country: event.country,
        lat: event.lat,
        lng: event.lng,
        categories: event.categories || [],
        tags: event.tags || [],
        imageUrl: event.image_url,
        imageUrls: event.image_urls || [],
        organizerName: event.organizer_name,
        externalUrl: event.external_url,
        lastSeenAt: event.last_seen_at,
        isSaved: event.saved_events && event.saved_events.length > 0,
      }))
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}