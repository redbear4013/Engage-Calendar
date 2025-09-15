export interface User {
  id: string
  email: string
  name?: string
  city?: string
  country?: string
  createdAt: string
  updatedAt: string
}

export interface Event {
  id: string
  source: 'rss' | 'newsapi' | 'web_scraper'
  sourceId: string
  title: string
  description?: string
  longDescription?: string
  startTime?: string
  endTime?: string
  timezone?: string
  venueName?: string
  city?: string
  country?: string
  lat?: number
  lng?: number
  categories: string[]
  tags: string[]
  imageUrl?: string
  imageUrls?: string[]
  organizerName?: string
  externalUrl?: string
  lastSeenAt: string
}

export interface SavedEvent {
  id: string
  userId: string
  eventId: string
  note?: string
  createdAt: string
  event?: Event
}

export interface CalendarEvent extends Event {
  isSaved: boolean
  note?: string
}

export interface CalendarFilters {
  categories: string[]
  dateRange?: {
    start: Date
    end: Date
  }
  city?: string
  searchQuery?: string
}

export interface CalendarView {
  type: 'month' | 'week' | 'day'
  date: Date
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  email: string
  password: string
  name: string
  city?: string
  country?: string
}

export interface SearchFilters {
  query?: string
  categories?: string[]
  city?: string
  dateRange?: {
    start: Date
    end: Date
  }
  tags?: string[]
}