/**
 * Image fallback utilities for events
 * Provides category-specific default images when event images are not available
 */

export interface EventImageData {
  id: string
  url: string
  alt: string
  caption: string
}

/**
 * Get category-specific default image based on event categories and venue
 */
export function getCategoryDefaultImage(categories: string[] = [], venue?: string, title?: string): EventImageData {
  const content = `${categories.join(' ')} ${venue} ${title}`.toLowerCase()
  
  // Define category-specific images from Unsplash
  // Using specific search terms for better matching
  
  // Broadway and Theater shows
  if (content.includes('broadway') || content.includes('theater') || content.includes('theatre') || content.includes('musical')) {
    return {
      id: 'theater',
      url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=400&fit=crop&crop=center&auto=format&q=80',
      alt: 'Theater performance',
      caption: 'Theater & Shows'
    }
  }
  
  // Concerts and Music
  if (content.includes('concert') || content.includes('music') || content.includes('orchestra') || content.includes('singer')) {
    return {
      id: 'concert',
      url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=400&fit=crop&crop=center&auto=format&q=80',
      alt: 'Concert performance',
      caption: 'Music & Concerts'
    }
  }
  
  // Shows and Entertainment
  if (content.includes('show') || content.includes('entertainment') || content.includes('performance')) {
    return {
      id: 'show',
      url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=400&fit=crop&crop=center&auto=format&q=80',
      alt: 'Entertainment show',
      caption: 'Entertainment & Shows'
    }
  }
  
  // Comedy shows
  if (content.includes('comedy') || content.includes('comedian') || content.includes('standup')) {
    return {
      id: 'comedy',
      url: 'https://images.unsplash.com/photo-1576267423445-b2e0074d68a4?w=800&h=400&fit=crop&crop=center&auto=format&q=80',
      alt: 'Comedy show',
      caption: 'Comedy & Humor'
    }
  }
  
  // Magic shows
  if (content.includes('magic') || content.includes('illusion') || content.includes('magician')) {
    return {
      id: 'magic',
      url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=400&fit=crop&crop=center&auto=format&q=80',
      alt: 'Magic show',
      caption: 'Magic & Illusions'
    }
  }
  
  // Dance performances
  if (content.includes('dance') || content.includes('ballet') || content.includes('dancing')) {
    return {
      id: 'dance',
      url: 'https://images.unsplash.com/photo-1508700929628-666bc8bd84ea?w=800&h=400&fit=crop&crop=center&auto=format&q=80',
      alt: 'Dance performance',
      caption: 'Dance & Ballet'
    }
  }
  
  // Exhibitions and Museums
  if (content.includes('exhibition') || content.includes('museum') || content.includes('gallery') || content.includes('art')) {
    return {
      id: 'exhibition',
      url: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&h=400&fit=crop&crop=center&auto=format&q=80',
      alt: 'Art exhibition',
      caption: 'Exhibitions & Art'
    }
  }
  
  // Festivals and Cultural events
  if (content.includes('festival') || content.includes('cultural') || content.includes('celebration') || content.includes('carnival')) {
    return {
      id: 'festival',
      url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&h=400&fit=crop&crop=center&auto=format&q=80',
      alt: 'Cultural festival',
      caption: 'Festivals & Culture'
    }
  }
  
  // Food and Dining events
  if (content.includes('food') || content.includes('dining') || content.includes('culinary') || content.includes('restaurant')) {
    return {
      id: 'dining',
      url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=400&fit=crop&crop=center&auto=format&q=80',
      alt: 'Dining experience',
      caption: 'Food & Dining'
    }
  }
  
  // Sports events
  if (content.includes('sport') || content.includes('game') || content.includes('tournament') || content.includes('race')) {
    return {
      id: 'sports',
      url: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&h=400&fit=crop&crop=center&auto=format&q=80',
      alt: 'Sports event',
      caption: 'Sports & Games'
    }
  }
  
  // Business and Professional events
  if (content.includes('business') || content.includes('professional') || content.includes('mice') || content.includes('conference')) {
    return {
      id: 'business',
      url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=400&fit=crop&crop=center&auto=format&q=80',
      alt: 'Business event',
      caption: 'Business & Professional'
    }
  }
  
  // Casino and Resort venues
  if (content.includes('galaxy') || content.includes('venetian') || content.includes('londoner') || content.includes('sands')) {
    return {
      id: 'casino',
      url: 'https://images.unsplash.com/photo-1596838132731-3301c3fd4317?w=800&h=400&fit=crop&crop=center&auto=format&q=80',
      alt: 'Casino resort',
      caption: 'Resort Entertainment'
    }
  }
  
  // Government and Tourism (MGTO)
  if (content.includes('government') || content.includes('tourism') || content.includes('mgto')) {
    return {
      id: 'tourism',
      url: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&h=400&fit=crop&crop=center&auto=format&q=80',
      alt: 'Macau tourism',
      caption: 'Tourism & Culture'
    }
  }
  
  // Family events
  if (content.includes('family') || content.includes('kids') || content.includes('children')) {
    return {
      id: 'family',
      url: 'https://images.unsplash.com/photo-1511688878353-3a2f5be94cd7?w=800&h=400&fit=crop&crop=center&auto=format&q=80',
      alt: 'Family event',
      caption: 'Family Entertainment'
    }
  }
  
  // Nightlife and Clubs
  if (content.includes('nightlife') || content.includes('club') || content.includes('bar')) {
    return {
      id: 'nightlife',
      url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=400&fit=crop&crop=center&auto=format&q=80',
      alt: 'Nightlife event',
      caption: 'Nightlife & Entertainment'
    }
  }
  
  // Default fallback - Macau cityscape or general event
  return {
    id: 'default',
    url: 'https://images.unsplash.com/photo-1551918120-9739cb430c6d?w=800&h=400&fit=crop&crop=center&auto=format&q=80',
    alt: 'Event in Macau',
    caption: 'Event Preview'
  }
}

/**
 * Create image gallery from event data with intelligent fallbacks
 */
export function createEventImageGallery(
  imageUrl?: string | null,
  title?: string,
  categories?: string[],
  venue?: string
): EventImageData[] {
  const images: EventImageData[] = []
  
  // Add actual event image if available
  if (imageUrl && imageUrl.trim()) {
    images.push({
      id: 'event-image',
      url: imageUrl,
      alt: title || 'Event image',
      caption: 'Event photo'
    })
  }
  
  // Add a category-specific fallback only when no event image is available
  if (images.length === 0) {
    images.push(getCategoryDefaultImage(categories, venue, title))
  }
  
  return images
}

/**
 * Validate image URL and return fallback if invalid
 */
export function validateImageUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null
  
  // Basic URL validation
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null
    }
    
    // Check for common invalid patterns
    if (url.includes('placeholder') || 
        url.includes('default.') || 
        url.includes('no-image') ||
        url.includes('404') ||
        url.length < 10) {
      return null
    }
    
    return url
  } catch {
    return null
  }
}