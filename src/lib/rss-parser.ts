import Parser from 'rss-parser'
import type { Event } from '@/types'

const parser = new Parser({
  customFields: {
    item: [
      ['eventStart', 'eventStart'],
      ['eventEnd', 'eventEnd'],
      ['eventLocation', 'eventLocation'],
      ['eventDescription', 'eventDescription'],
    ],
  },
})

interface RSSItem {
  title?: string
  link?: string
  pubDate?: string
  contentSnippet?: string
  content?: string
  categories?: string[]
  eventStart?: string
  eventEnd?: string
  eventLocation?: string
  eventDescription?: string
  'content:encoded'?: string
  'media:content'?: any
  enclosure?: { url: string }
}

export async function parseRSSFeed(url: string, sourceName: string): Promise<Partial<Event>[]> {
  try {
    const feed = await parser.parseURL(url)
    const events: Partial<Event>[] = []

    if (!feed.items) {
      console.warn(`No items found in RSS feed: ${url}`)
      return events
    }

    for (const item of feed.items) {
      try {
        const event = await parseRSSItem(item as RSSItem, sourceName)
        if (event) {
          events.push(event)
        }
      } catch (error) {
        console.warn(`Failed to parse RSS item: ${item.title}`, error)
        continue
      }
    }

    return events
  } catch (error) {
    console.error(`Failed to parse RSS feed: ${url}`, error)
    throw new Error(`RSS parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function parseRSSItem(item: RSSItem, sourceName: string): Promise<Partial<Event> | null> {
  if (!item.title || !item.link) {
    return null
  }

  // Extract image URL from various sources
  let imageUrl: string | undefined
  if (item.enclosure?.url && isImageUrl(item.enclosure.url)) {
    imageUrl = item.enclosure.url
  } else if (item['media:content']?.$ && item['media:content'].$.url) {
    imageUrl = item['media:content'].$.url
  } else if (item.content || item['content:encoded']) {
    imageUrl = extractImageFromContent(item.content || item['content:encoded'] || '')
  }

  // Parse event timing
  const startTime = parseEventDate(item.eventStart || item.pubDate)
  const endTime = parseEventDate(item.eventEnd)

  // Extract location information
  const location = parseLocation(item.eventLocation)

  // Categorize the event
  const categories = categorizeEvent(item.title, item.contentSnippet || '', item.categories || [])

  // Generate tags from content
  const tags = generateTags(item.title, item.contentSnippet || '', item.categories || [])

  return {
    source: 'rss' as const,
    sourceId: item.link,
    title: item.title,
    description: item.contentSnippet || extractTextFromHTML(item.content || item['content:encoded'] || ''),
    longDescription: item.content || item['content:encoded'],
    startTime: startTime?.toISOString(),
    endTime: endTime?.toISOString(),
    venueName: location.venueName,
    city: location.city,
    country: location.country,
    categories,
    tags,
    imageUrl,
    organizerName: sourceName,
    externalUrl: item.link,
    lastSeenAt: new Date().toISOString(),
  }
}

function parseEventDate(dateString?: string): Date | undefined {
  if (!dateString) return undefined
  
  const date = new Date(dateString)
  return isNaN(date.getTime()) ? undefined : date
}

function parseLocation(locationString?: string): {
  venueName?: string
  city?: string
  country?: string
} {
  if (!locationString) return {}

  // Simple location parsing - can be enhanced with geocoding services
  const parts = locationString.split(',').map(s => s.trim())
  
  if (parts.length === 1) {
    return { venueName: parts[0] }
  } else if (parts.length === 2) {
    return { venueName: parts[0], city: parts[1] }
  } else if (parts.length >= 3) {
    return {
      venueName: parts[0],
      city: parts[1],
      country: parts[parts.length - 1]
    }
  }

  return {}
}

function categorizeEvent(title: string, description: string, categories: string[]): string[] {
  const content = `${title} ${description}`.toLowerCase()
  const detectedCategories: string[] = []

  // Map keywords to categories
  const categoryKeywords = {
    music: ['concert', 'music', 'band', 'dj', 'festival', 'live music', 'performance'],
    food_drink: ['food', 'restaurant', 'bar', 'wine', 'beer', 'tasting', 'dinner', 'lunch'],
    arts_culture: ['art', 'museum', 'gallery', 'theater', 'exhibition', 'culture', 'painting'],
    sports: ['sport', 'game', 'match', 'tournament', 'fitness', 'gym', 'running', 'cycling'],
    outdoors: ['hiking', 'outdoor', 'park', 'nature', 'camping', 'adventure', 'trail'],
    nightlife: ['party', 'club', 'nightlife', 'dance', 'pub', 'cocktail', 'nightclub'],
    community: ['meetup', 'community', 'volunteer', 'charity', 'social', 'networking'],
    business: ['business', 'conference', 'workshop', 'seminar', 'networking', 'professional'],
    family: ['family', 'kids', 'children', 'playground', 'zoo', 'aquarium', 'child-friendly'],
  }

  // Check content for category keywords
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => content.includes(keyword))) {
      detectedCategories.push(category)
    }
  }

  // Include original categories if they match our system
  const validCategories = Object.keys(categoryKeywords)
  const mappedCategories = categories
    .map(cat => cat.toLowerCase().replace(/\s+/g, '_'))
    .filter(cat => validCategories.includes(cat))

  const allCategories = [...new Set([...detectedCategories, ...mappedCategories])]
  return allCategories.length > 0 ? allCategories : ['local_events']
}

function generateTags(title: string, description: string, categories: string[]): string[] {
  const content = `${title} ${description}`.toLowerCase()
  const tags: string[] = []

  // Extract hashtags if any
  const hashtagRegex = /#(\w+)/g
  const hashtags = content.match(hashtagRegex)
  if (hashtags) {
    tags.push(...hashtags.map(tag => tag.substring(1)))
  }

  // Add categories as tags
  tags.push(...categories.map(cat => cat.toLowerCase().replace(/\s+/g, '_')))

  // Add some common event tags
  const commonTags = ['weekend', 'event', 'local']
  tags.push(...commonTags)

  return [...new Set(tags)].slice(0, 10) // Limit to 10 unique tags
}

function extractImageFromContent(content: string): string | undefined {
  const imgRegex = /<img[^>]+src="([^"]+)"/i
  const match = content.match(imgRegex)
  return match ? match[1] : undefined
}

function extractTextFromHTML(html: string): string {
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .substring(0, 500) // Limit description length
}

function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(url)
}