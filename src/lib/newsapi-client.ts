import type { Event } from '@/types'

interface NewsAPIResponse {
  status: string
  totalResults: number
  articles: NewsAPIArticle[]
}

interface NewsAPIArticle {
  source: {
    id: string | null
    name: string
  }
  author: string | null
  title: string
  description: string
  url: string
  urlToImage: string | null
  publishedAt: string
  content: string | null
}

export async function fetchNewsAPIEvents(
  query: string = 'events OR festival OR concert OR exhibition',
  language: string = 'en',
  sortBy: string = 'publishedAt'
): Promise<Partial<Event>[]> {
  const apiKey = process.env.NEWS_API_KEY

  if (!apiKey) {
    console.warn('NewsAPI key not configured, skipping NewsAPI ingestion')
    return []
  }

  try {
    // Get events from the last 7 days
    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - 7)
    
    const params = new URLSearchParams({
      q: query,
      language,
      sortBy,
      from: fromDate.toISOString().split('T')[0],
      apiKey,
      pageSize: '100'
    })

    const response = await fetch(`https://newsapi.org/v2/everything?${params}`)
    
    if (!response.ok) {
      throw new Error(`NewsAPI request failed: ${response.status} ${response.statusText}`)
    }

    const data: NewsAPIResponse = await response.json()

    if (data.status !== 'ok') {
      throw new Error(`NewsAPI returned error status: ${data.status}`)
    }

    const events: Partial<Event>[] = []

    for (const article of data.articles) {
      try {
        const event = convertNewsArticleToEvent(article)
        if (event) {
          events.push(event)
        }
      } catch (error) {
        console.warn(`Failed to convert article to event: ${article.title}`, error)
        continue
      }
    }

    return events
  } catch (error) {
    console.error('NewsAPI fetch error:', error)
    throw new Error(`Failed to fetch from NewsAPI: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

function convertNewsArticleToEvent(article: NewsAPIArticle): Partial<Event> | null {
  // Filter articles that are likely to be about events
  if (!isEventRelated(article.title, article.description || '')) {
    return null
  }

  // Extract event information from article content
  const eventInfo = extractEventInfo(article.title, article.description || '', article.content || '')

  return {
    source: 'newsapi' as const,
    sourceId: article.url,
    title: cleanEventTitle(article.title),
    description: article.description || undefined,
    longDescription: article.content || undefined,
    startTime: eventInfo.startTime,
    endTime: eventInfo.endTime,
    venueName: eventInfo.venue,
    city: eventInfo.city,
    country: eventInfo.country,
    categories: categorizeNewsEvent(article.title, article.description || ''),
    tags: generateEventTags(article.title, article.description || ''),
    imageUrl: article.urlToImage || undefined,
    organizerName: article.source.name,
    externalUrl: article.url,
    lastSeenAt: new Date().toISOString(),
  }
}

function isEventRelated(title: string, description: string): boolean {
  const content = `${title} ${description}`.toLowerCase()
  
  const eventKeywords = [
    'event', 'festival', 'concert', 'exhibition', 'show', 'performance',
    'conference', 'workshop', 'seminar', 'meetup', 'gathering', 'celebration',
    'parade', 'fair', 'market', 'tournament', 'competition', 'opening',
    'premiere', 'launch', 'announcement', 'ceremony'
  ]

  const dateIndicators = [
    'this weekend', 'next week', 'saturday', 'sunday', 'today', 'tomorrow',
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday',
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ]

  const hasEventKeyword = eventKeywords.some(keyword => content.includes(keyword))
  const hasDateIndicator = dateIndicators.some(indicator => content.includes(indicator))

  // Must have event keyword, and preferably a date indicator
  return hasEventKeyword && (hasDateIndicator || content.includes('ticket') || content.includes('admission'))
}

function extractEventInfo(title: string, description: string, content: string): {
  startTime?: string
  endTime?: string
  venue?: string
  city?: string
  country?: string
} {
  const fullText = `${title} ${description} ${content}`.toLowerCase()
  
  const info: {
    startTime?: string
    endTime?: string
    venue?: string
    city?: string
    country?: string
  } = {}

  // Try to extract venue information
  const venuePatterns = [
    /(?:at|@)\s+([^,\n.]+(?:center|centre|hall|theatre|theater|arena|stadium|park|museum|gallery))/i,
    /(?:venue|location):\s*([^,\n.]+)/i
  ]

  for (const pattern of venuePatterns) {
    const match = fullText.match(pattern)
    if (match && match[1]) {
      info.venue = match[1].trim()
      break
    }
  }

  // Try to extract city information
  const cityPatterns = [
    /(?:in|at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z]{2})/,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z][a-z]+)/
  ]

  for (const pattern of cityPatterns) {
    const match = fullText.match(pattern)
    if (match && match[1] && match[2]) {
      info.city = match[1].trim()
      // If second part looks like a state code, assume US
      if (match[2].length === 2 && match[2].match(/^[A-Z]{2}$/)) {
        info.country = 'United States'
      } else {
        info.country = match[2].trim()
      }
      break
    }
  }

  // Try to extract date/time information (basic patterns)
  const datePatterns = [
    /(?:on|this|next)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
    /(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}/i,
    /\d{1,2}\/\d{1,2}\/\d{2,4}/,
    /\d{4}-\d{2}-\d{2}/
  ]

  for (const pattern of datePatterns) {
    const match = fullText.match(pattern)
    if (match) {
      try {
        const date = new Date(match[0])
        if (!isNaN(date.getTime())) {
          info.startTime = date.toISOString()
          break
        }
      } catch {
        // Ignore invalid dates
      }
    }
  }

  return info
}

function categorizeNewsEvent(title: string, description: string): string[] {
  const content = `${title} ${description}`.toLowerCase()
  const categories: string[] = []

  const categoryKeywords = {
    music: ['concert', 'music', 'band', 'festival', 'live music', 'performance', 'singer', 'album'],
    food_drink: ['food', 'restaurant', 'bar', 'wine', 'beer', 'tasting', 'culinary', 'chef'],
    arts_culture: ['art', 'museum', 'gallery', 'theater', 'exhibition', 'culture', 'painting', 'sculpture'],
    sports: ['sport', 'game', 'match', 'tournament', 'championship', 'team', 'league', 'olympics'],
    community: ['community', 'volunteer', 'charity', 'fundraising', 'nonprofit', 'awareness'],
    business: ['business', 'conference', 'summit', 'expo', 'trade', 'industry', 'professional'],
    family: ['family', 'kids', 'children', 'school', 'education', 'youth'],
  }

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => content.includes(keyword))) {
      categories.push(category)
    }
  }

  return categories.length > 0 ? categories : ['local_events']
}

function generateEventTags(title: string, description: string): string[] {
  const content = `${title} ${description}`.toLowerCase()
  const tags: string[] = []

  // Extract hashtags
  const hashtagRegex = /#(\w+)/g
  const hashtags = content.match(hashtagRegex)
  if (hashtags) {
    tags.push(...hashtags.map(tag => tag.substring(1)))
  }

  // Add some common tags based on content
  const tagKeywords = {
    'free': ['free', 'no cost', 'complimentary'],
    'weekend': ['weekend', 'saturday', 'sunday'],
    'family-friendly': ['family', 'kids', 'children'],
    'outdoor': ['outdoor', 'outside', 'park'],
    'indoor': ['indoor', 'inside', 'hall'],
    'live': ['live', 'performance', 'show'],
    'food': ['food', 'drink', 'dining'],
    'music': ['music', 'concert', 'band'],
  }

  for (const [tag, keywords] of Object.entries(tagKeywords)) {
    if (keywords.some(keyword => content.includes(keyword))) {
      tags.push(tag)
    }
  }

  // Add source tag
  tags.push('news', 'newsapi')

  return [...new Set(tags)].slice(0, 8)
}

function cleanEventTitle(title: string): string {
  // Remove common news prefixes and suffixes
  return title
    .replace(/^(BREAKING|UPDATE|LIVE|NEWS):\s*/i, '')
    .replace(/\s*-\s*[A-Z\s]+$/, '') // Remove " - NEWS SOURCE"
    .trim()
}