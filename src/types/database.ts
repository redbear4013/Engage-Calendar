export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          password_hash: string
          name: string | null
          city: string | null
          country: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          password_hash: string
          name?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          password_hash?: string
          name?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      events: {
        Row: {
          id: string
          source: 'rss' | 'newsapi' | 'web_scraper' | 'web_scraper'
          source_id: string
          title: string
          description: string | null
          long_description: string | null
          start_time_utc: string | null
          end_time_utc: string | null
          timezone: string | null
          venue_name: string | null
          city: string | null
          country: string | null
          lat: number | null
          lng: number | null
          categories: string[]
          tags: string[]
          image_url: string | null
          image_urls: string[] | null
          organizer_name: string | null
          external_url: string | null
          last_seen_at: string
        }
        Insert: {
          id?: string
          source: 'rss' | 'newsapi' | 'web_scraper'
          source_id: string
          title: string
          description?: string | null
          long_description?: string | null
          start_time_utc?: string | null
          end_time_utc?: string | null
          timezone?: string | null
          venue_name?: string | null
          city?: string | null
          country?: string | null
          lat?: number | null
          lng?: number | null
          categories?: string[]
          tags?: string[]
          image_url?: string | null
          image_urls?: string[] | null
          organizer_name?: string | null
          external_url?: string | null
          last_seen_at?: string
        }
        Update: {
          id?: string
          source?: 'rss' | 'newsapi'
          source_id?: string
          title?: string
          description?: string | null
          long_description?: string | null
          start_time_utc?: string | null
          end_time_utc?: string | null
          timezone?: string | null
          venue_name?: string | null
          city?: string | null
          country?: string | null
          lat?: number | null
          lng?: number | null
          categories?: string[]
          tags?: string[]
          image_url?: string | null
          image_urls?: string[] | null
          organizer_name?: string | null
          external_url?: string | null
          last_seen_at?: string
        }
      }
      saved_events: {
        Row: {
          id: string
          user_id: string
          event_id: string
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event_id: string
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          event_id?: string
          note?: string | null
          created_at?: string
        }
      }
      sources: {
        Row: {
          id: string
          type: 'rss' | 'newsapi' | 'web_scraper'
          name: string
          url: string | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          type: 'rss' | 'newsapi' | 'web_scraper'
          name: string
          url?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          type?: 'rss' | 'newsapi' | 'web_scraper'
          name?: string
          url?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      ingestion_logs: {
        Row: {
          id: string
          source_id: string | null
          status: 'started' | 'success' | 'failed'
          message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          source_id?: string | null
          status?: 'started' | 'success' | 'failed'
          message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          source_id?: string | null
          status?: 'started' | 'success' | 'failed'
          message?: string | null
          created_at?: string
        }
      }
    }
  }
}