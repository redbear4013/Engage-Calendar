# Weekend Planner App - External API Integrations

## Overview

The Weekend Planner App integrates with multiple external APIs to provide comprehensive event data and services. This document outlines integration patterns, error handling strategies, and resilience mechanisms to ensure reliable and performant API interactions.

### Integration Strategy
- **API-First Approach**: All integrations follow standardized patterns
- **Circuit Breaker Pattern**: Prevents cascade failures
- **Rate Limiting**: Respects external API limits
- **Caching Strategy**: Reduces API calls and improves performance
- **Graceful Degradation**: Maintains functionality during outages

## External API Partners

### Phase 1 Integrations (MVP)

#### 1. Eventbrite API
**Purpose**: Event discovery and ticket information
**Documentation**: https://www.eventbrite.com/platform/api
**Rate Limits**: 1,000 requests per hour per API key

#### 2. Meetup API  
**Purpose**: Local group events and community activities
**Documentation**: https://www.meetup.com/api/guide
**Rate Limits**: 200 requests per hour per API key

#### 3. Google Maps API
**Purpose**: Location services, distance calculation, and directions
**Documentation**: https://developers.google.com/maps/documentation
**Rate Limits**: Various limits per service

### Phase 2 Integrations (Future)

#### 4. Google Calendar API
**Purpose**: Two-way calendar synchronization
**Rate Limits**: 1,000,000 queries per day

#### 5. Facebook Events API
**Purpose**: Public event discovery
**Rate Limits**: Various based on app review status

## Integration Architecture

### Service Structure
```
external-api-service/
├── src/
│   ├── providers/              # API provider implementations
│   │   ├── EventbriteProvider.ts
│   │   ├── MeetupProvider.ts
│   │   ├── GoogleMapsProvider.ts
│   │   └── BaseProvider.ts
│   ├── services/
│   │   ├── ExternalAPIService.ts
│   │   ├── RateLimitService.ts
│   │   ├── CacheService.ts
│   │   └── CircuitBreakerService.ts
│   ├── utils/
│   │   ├── apiClient.ts
│   │   ├── dataMappers.ts
│   │   └── errorHandling.ts
│   ├── models/
│   │   ├── ExternalEvent.ts
│   │   └── APIResponse.ts
│   └── middleware/
│       ├── rateLimitMiddleware.ts
│       └── cachingMiddleware.ts
```

## Base Provider Implementation

### BaseProvider.ts
```typescript
import { CircuitBreaker } from '../utils/CircuitBreaker';
import { RateLimitService } from '../services/RateLimitService';
import { CacheService } from '../services/CacheService';
import { APIError, RateLimitError } from '../utils/errorHandling';

export abstract class BaseProvider {
  protected circuitBreaker: CircuitBreaker;
  protected rateLimitService: RateLimitService;
  protected cacheService: CacheService;
  
  constructor(
    protected providerName: string,
    protected apiKey: string,
    protected baseURL: string,
    protected rateLimit: { requests: number; window: number }
  ) {
    this.circuitBreaker = new CircuitBreaker(
      5, // failure threshold
      60000, // timeout (1 minute)
      30000 // retry timeout (30 seconds)
    );
    
    this.rateLimitService = new RateLimitService();
    this.cacheService = new CacheService();
  }

  protected async makeRequest<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const cacheKey = this.generateCacheKey(url, options);
    
    // Check rate limits
    await this.checkRateLimit();
    
    // Try cache first if cacheable
    if (options.cacheable !== false) {
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    // Make request with circuit breaker
    const response = await this.circuitBreaker.execute(async () => {
      const result = await this.httpRequest(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      
      this.logAPICall(endpoint, result.status, result.data);
      return result;
    });

    // Cache successful responses
    if (response.status === 200 && options.cacheable !== false) {
      await this.cacheService.set(
        cacheKey, 
        JSON.stringify(response.data),
        options.cacheTTL || 900 // 15 minutes default
      );
    }

    return response.data;
  }

  private async checkRateLimit(): Promise<void> {
    const canProceed = await this.rateLimitService.checkLimit(
      this.providerName,
      this.rateLimit.requests,
      this.rateLimit.window
    );
    
    if (!canProceed) {
      throw new RateLimitError(this.providerName);
    }
  }

  private generateCacheKey(url: string, options: RequestOptions): string {
    const key = `${this.providerName}:${url}:${JSON.stringify(options.params || {})}`;
    return Buffer.from(key).toString('base64');
  }

  private async httpRequest(url: string, options: any): Promise<any> {
    // Implementation using axios or fetch
    // Include retry logic, timeout handling, etc.
  }

  private async logAPICall(endpoint: string, status: number, data: any): Promise<void> {
    // Log to external_api_logs table
    await this.logAPICallToDB({
      api_name: this.providerName,
      endpoint,
      status_code: status,
      response_time: Date.now(), // Should be measured properly
      created_at: new Date()
    });
  }

  abstract transformEvent(externalEvent: any): StandardEvent;
  abstract searchEvents(params: SearchParams): Promise<StandardEvent[]>;
  abstract getEventById(id: string): Promise<StandardEvent | null>;
}
```

## Eventbrite Integration

### EventbriteProvider.ts
```typescript
import { BaseProvider } from './BaseProvider';
import { SearchParams, StandardEvent, EventbriteEvent } from '../types';

export class EventbriteProvider extends BaseProvider {
  constructor(apiKey: string) {
    super(
      'eventbrite',
      apiKey,
      'https://www.eventbriteapi.com/v3',
      { requests: 1000, window: 3600000 } // 1000 requests per hour
    );
  }

  async searchEvents(params: SearchParams): Promise<StandardEvent[]> {
    const eventbriteParams = this.mapSearchParams(params);
    
    try {
      const response = await this.makeRequest<EventbriteSearchResponse>(
        '/events/search/',
        {
          params: eventbriteParams,
          cacheable: true,
          cacheTTL: 900 // 15 minutes
        }
      );

      return response.events.map(event => this.transformEvent(event));
    } catch (error) {
      this.handleProviderError(error);
      return [];
    }
  }

  async getEventById(id: string): Promise<StandardEvent | null> {
    try {
      const response = await this.makeRequest<EventbriteEvent>(
        `/events/${id}/`,
        {
          params: { 
            expand: 'venue,ticket_availability,category'
          },
          cacheable: true,
          cacheTTL: 3600 // 1 hour
        }
      );

      return this.transformEvent(response);
    } catch (error) {
      if (error.status === 404) {
        return null;
      }
      this.handleProviderError(error);
      return null;
    }
  }

  async getEventsByLocation(
    latitude: number, 
    longitude: number, 
    radius: number
  ): Promise<StandardEvent[]> {
    const params = {
      'location.latitude': latitude,
      'location.longitude': longitude,
      'location.within': `${radius}mi`,
      'start_date.range_start': new Date().toISOString(),
      'sort_by': 'distance',
      'expand': 'venue,category'
    };

    try {
      const response = await this.makeRequest<EventbriteSearchResponse>(
        '/events/search/',
        { params, cacheable: true, cacheTTL: 600 } // 10 minutes
      );

      return response.events.map(event => this.transformEvent(event));
    } catch (error) {
      this.handleProviderError(error);
      return [];
    }
  }

  transformEvent(eventbriteEvent: EventbriteEvent): StandardEvent {
    return {
      id: `eventbrite_${eventbriteEvent.id}`,
      external_id: eventbriteEvent.id,
      source: 'eventbrite',
      title: eventbriteEvent.name.text,
      description: eventbriteEvent.description?.text || '',
      long_description: eventbriteEvent.description?.html || '',
      start_time: eventbriteEvent.start.utc,
      end_time: eventbriteEvent.end.utc,
      location: this.transformLocation(eventbriteEvent.venue),
      price: this.extractPrice(eventbriteEvent),
      currency: eventbriteEvent.currency || 'USD',
      max_attendees: eventbriteEvent.capacity,
      current_attendees: eventbriteEvent.capacity - (eventbriteEvent.ticket_availability?.quantity_remaining || 0),
      external_url: eventbriteEvent.url,
      ticket_url: eventbriteEvent.url,
      cover_image: eventbriteEvent.logo?.url,
      organizer_name: eventbriteEvent.organizer?.name,
      organizer_url: eventbriteEvent.organizer?.url,
      categories: this.mapCategories(eventbriteEvent.category),
      tags: this.extractTags(eventbriteEvent),
      status: this.mapStatus(eventbriteEvent.status),
      last_synced: new Date().toISOString()
    };
  }

  private mapSearchParams(params: SearchParams): any {
    const eventbriteParams: any = {
      'start_date.range_start': params.start_date || new Date().toISOString(),
      'sort_by': params.sort_by === 'date' ? 'date' : 'relevance',
      'page_size': Math.min(params.limit || 50, 50)
    };

    if (params.query) {
      eventbriteParams.q = params.query;
    }

    if (params.location) {
      eventbriteParams['location.address'] = `${params.location.city}, ${params.location.state}`;
      eventbriteParams['location.within'] = `${params.max_distance || 25}mi`;
    }

    if (params.categories?.length > 0) {
      eventbriteParams.categories = this.mapCategoriesToEventbrite(params.categories);
    }

    if (params.price_max) {
      eventbriteParams['price'] = 'free,paid';
      eventbriteParams['price.range_end'] = `${params.price_max}00`; // Convert to cents
    }

    return eventbriteParams;
  }

  private transformLocation(venue: any): any {
    if (!venue) return null;
    
    return {
      name: venue.name,
      address: this.formatAddress(venue.address),
      city: venue.address?.city,
      state: venue.address?.region,
      country: venue.address?.country,
      postal_code: venue.address?.postal_code,
      latitude: parseFloat(venue.address?.latitude) || null,
      longitude: parseFloat(venue.address?.longitude) || null
    };
  }

  private extractPrice(event: EventbriteEvent): number {
    if (!event.ticket_classes || event.ticket_classes.length === 0) {
      return 0;
    }

    const prices = event.ticket_classes
      .filter(ticket => ticket.cost && ticket.cost.value)
      .map(ticket => parseFloat(ticket.cost.value) / 100); // Convert from cents

    return prices.length > 0 ? Math.min(...prices) : 0;
  }

  private mapCategories(category: any): string[] {
    if (!category) return ['local_events'];
    
    const categoryMap: { [key: string]: string } = {
      '103': 'local_events', // Music
      '108': 'personal_activities', // Health & Wellness
      '102': 'educational_content', // Science & Technology
      '101': 'local_events', // Business & Professional
      '105': 'personal_activities', // Performing & Visual Arts
      // Add more mappings as needed
    };

    return [categoryMap[category.id] || 'local_events'];
  }

  private extractTags(event: EventbriteEvent): string[] {
    const tags = [];
    
    if (event.category) {
      tags.push(event.category.name.toLowerCase().replace(/\s+/g, '_'));
    }
    
    if (event.subcategory) {
      tags.push(event.subcategory.name.toLowerCase().replace(/\s+/g, '_'));
    }

    // Extract tags from description
    const description = event.description?.text || '';
    const hashtagMatch = description.match(/#\w+/g);
    if (hashtagMatch) {
      tags.push(...hashtagMatch.map(tag => tag.substring(1).toLowerCase()));
    }

    return tags.slice(0, 10); // Limit tags
  }

  private mapStatus(status: string): string {
    switch (status) {
      case 'live': return 'active';
      case 'draft': return 'inactive';
      case 'canceled': return 'cancelled';
      case 'ended': return 'completed';
      default: return 'active';
    }
  }

  private formatAddress(address: any): string {
    if (!address) return '';
    
    const parts = [
      address.address_1,
      address.address_2,
      address.city,
      address.region,
      address.postal_code
    ].filter(Boolean);
    
    return parts.join(', ');
  }

  private handleProviderError(error: any): void {
    console.error(`Eventbrite API Error:`, error);
    
    if (error.status === 429) {
      throw new RateLimitError('eventbrite');
    }
    
    if (error.status >= 500) {
      throw new APIError('eventbrite', 'Service temporarily unavailable');
    }
    
    // Log error but don't throw for client errors (4xx)
    // This allows graceful degradation
  }

  private mapCategoriesToEventbrite(categories: string[]): string {
    const eventbriteCategories: { [key: string]: string } = {
      'local_events': '103,101,104', // Music, Business, Food & Drink
      'personal_activities': '108,105,107', // Health, Arts, Sports & Fitness  
      'educational_content': '102,199', // Science & Tech, Other
    };

    return categories
      .map(cat => eventbriteCategories[cat])
      .filter(Boolean)
      .join(',');
  }
}
```

## Meetup Integration

### MeetupProvider.ts
```typescript
import { BaseProvider } from './BaseProvider';
import { SearchParams, StandardEvent, MeetupEvent } from '../types';

export class MeetupProvider extends BaseProvider {
  constructor(apiKey: string) {
    super(
      'meetup',
      apiKey,
      'https://api.meetup.com',
      { requests: 200, window: 3600000 } // 200 requests per hour
    );
  }

  async searchEvents(params: SearchParams): Promise<StandardEvent[]> {
    const meetupParams = this.mapSearchParams(params);
    
    try {
      const response = await this.makeRequest<MeetupSearchResponse>(
        '/find/events',
        {
          params: meetupParams,
          cacheable: true,
          cacheTTL: 900
        }
      );

      return response.events.map(event => this.transformEvent(event));
    } catch (error) {
      this.handleProviderError(error);
      return [];
    }
  }

  async getEventById(id: string): Promise<StandardEvent | null> {
    try {
      const response = await this.makeRequest<MeetupEvent>(
        `/events/${id}`,
        {
          cacheable: true,
          cacheTTL: 3600
        }
      );

      return this.transformEvent(response);
    } catch (error) {
      if (error.status === 404) {
        return null;
      }
      this.handleProviderError(error);
      return null;
    }
  }

  async getEventsByGroup(groupId: string, limit: number = 20): Promise<StandardEvent[]> {
    try {
      const response = await this.makeRequest<MeetupSearchResponse>(
        `/${groupId}/events`,
        {
          params: {
            page: limit,
            status: 'upcoming'
          },
          cacheable: true,
          cacheTTL: 1800 // 30 minutes
        }
      );

      return response.events.map(event => this.transformEvent(event));
    } catch (error) {
      this.handleProviderError(error);
      return [];
    }
  }

  transformEvent(meetupEvent: MeetupEvent): StandardEvent {
    return {
      id: `meetup_${meetupEvent.id}`,
      external_id: meetupEvent.id,
      source: 'meetup',
      title: meetupEvent.name,
      description: meetupEvent.description || '',
      long_description: meetupEvent.description || '',
      start_time: new Date(meetupEvent.time).toISOString(),
      end_time: meetupEvent.duration 
        ? new Date(meetupEvent.time + meetupEvent.duration).toISOString()
        : new Date(meetupEvent.time + 2 * 60 * 60 * 1000).toISOString(), // Default 2 hours
      location: this.transformLocation(meetupEvent.venue),
      price: meetupEvent.fee?.amount || 0,
      currency: meetupEvent.fee?.currency || 'USD',
      max_attendees: meetupEvent.rsvp_limit || null,
      current_attendees: meetupEvent.yes_rsvp_count || 0,
      external_url: meetupEvent.link,
      cover_image: meetupEvent.featured_photo?.photo_link,
      organizer_name: meetupEvent.group?.name,
      organizer_url: `https://www.meetup.com/${meetupEvent.group?.urlname}`,
      categories: this.mapCategories(meetupEvent.group?.category),
      tags: this.extractTags(meetupEvent),
      status: this.mapStatus(meetupEvent.status),
      last_synced: new Date().toISOString()
    };
  }

  private mapSearchParams(params: SearchParams): any {
    const meetupParams: any = {
      page: params.limit || 50
    };

    if (params.query) {
      meetupParams.text = params.query;
    }

    if (params.location && params.location.latitude && params.location.longitude) {
      meetupParams.lat = params.location.latitude;
      meetupParams.lon = params.location.longitude;
      meetupParams.radius = params.max_distance || 25;
    } else if (params.location) {
      meetupParams.location = `${params.location.city}, ${params.location.state}`;
    }

    if (params.categories?.length > 0) {
      meetupParams.category = this.mapCategoriesToMeetup(params.categories);
    }

    return meetupParams;
  }

  private transformLocation(venue: any): any {
    if (!venue) return null;
    
    return {
      name: venue.name,
      address: `${venue.address_1 || ''} ${venue.address_2 || ''}`.trim(),
      city: venue.city,
      state: venue.state,
      country: venue.country,
      postal_code: venue.zip,
      latitude: venue.lat,
      longitude: venue.lon
    };
  }

  private mapCategories(category: any): string[] {
    if (!category) return ['local_events'];
    
    const categoryMap: { [key: string]: string } = {
      '34': 'educational_content', // Tech
      '15': 'personal_activities', // Health & Wellness
      '31': 'personal_activities', // Fitness
      '2': 'local_events', // Career & Business
      '8': 'local_events', // Food & Drink
      '16': 'educational_content', // Learning
      // Add more mappings
    };

    return [categoryMap[category.id] || 'local_events'];
  }

  private extractTags(event: MeetupEvent): string[] {
    const tags = [];
    
    if (event.group?.category) {
      tags.push(event.group.category.name.toLowerCase().replace(/\s+/g, '_'));
    }

    // Extract from topics if available
    if (event.group?.topics) {
      tags.push(...event.group.topics.slice(0, 5).map((topic: any) => 
        topic.name.toLowerCase().replace(/\s+/g, '_')
      ));
    }

    return tags.slice(0, 10);
  }

  private mapStatus(status: string): string {
    switch (status) {
      case 'upcoming': return 'active';
      case 'past': return 'completed';
      case 'cancelled': return 'cancelled';
      default: return 'active';
    }
  }

  private handleProviderError(error: any): void {
    console.error(`Meetup API Error:`, error);
    
    if (error.status === 429) {
      throw new RateLimitError('meetup');
    }
    
    if (error.status >= 500) {
      throw new APIError('meetup', 'Service temporarily unavailable');
    }
  }

  private mapCategoriesToMeetup(categories: string[]): string {
    const meetupCategories: { [key: string]: string } = {
      'local_events': '2,8,20', // Career/Business, Food/Drink, Social
      'personal_activities': '15,31,9', // Health/Wellness, Fitness, Arts
      'educational_content': '34,16,18', // Tech, Learning, Philosophy
    };

    return categories
      .map(cat => meetupCategories[cat])
      .filter(Boolean)
      .join(',');
  }
}
```

## Google Maps Integration

### GoogleMapsProvider.ts
```typescript
import { BaseProvider } from './BaseProvider';

export class GoogleMapsProvider extends BaseProvider {
  constructor(apiKey: string) {
    super(
      'google_maps',
      apiKey,
      'https://maps.googleapis.com/maps/api',
      { requests: 2500, window: 1000 } // 2500 requests per second (generous limit)
    );
  }

  async geocodeAddress(address: string): Promise<GeocodingResult | null> {
    try {
      const response = await this.makeRequest<GoogleGeocodingResponse>(
        '/geocode/json',
        {
          params: {
            address: address,
            key: this.apiKey
          },
          cacheable: true,
          cacheTTL: 86400 // 24 hours - addresses don't change often
        }
      );

      if (response.status === 'OK' && response.results.length > 0) {
        return this.transformGeocodingResult(response.results[0]);
      }

      return null;
    } catch (error) {
      this.handleProviderError(error);
      return null;
    }
  }

  async calculateDistance(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number }
  ): Promise<DistanceResult | null> {
    try {
      const response = await this.makeRequest<GoogleDistanceResponse>(
        '/distancematrix/json',
        {
          params: {
            origins: `${origin.lat},${origin.lng}`,
            destinations: `${destination.lat},${destination.lng}`,
            units: 'imperial',
            key: this.apiKey
          },
          cacheable: true,
          cacheTTL: 3600 // 1 hour
        }
      );

      if (response.status === 'OK' && 
          response.rows.length > 0 && 
          response.rows[0].elements.length > 0) {
        const element = response.rows[0].elements[0];
        if (element.status === 'OK') {
          return {
            distance_miles: this.convertMetersToMiles(element.distance.value),
            distance_text: element.distance.text,
            duration_minutes: Math.round(element.duration.value / 60),
            duration_text: element.duration.text
          };
        }
      }

      return null;
    } catch (error) {
      this.handleProviderError(error);
      return null;
    }
  }

  async findNearbyPlaces(
    location: { lat: number; lng: number },
    radius: number,
    type: string
  ): Promise<PlaceResult[]> {
    try {
      const response = await this.makeRequest<GooglePlacesResponse>(
        '/place/nearbysearch/json',
        {
          params: {
            location: `${location.lat},${location.lng}`,
            radius: this.convertMilesToMeters(radius),
            type: type,
            key: this.apiKey
          },
          cacheable: true,
          cacheTTL: 1800 // 30 minutes
        }
      );

      if (response.status === 'OK') {
        return response.results.map(place => this.transformPlaceResult(place));
      }

      return [];
    } catch (error) {
      this.handleProviderError(error);
      return [];
    }
  }

  private transformGeocodingResult(result: any): GeocodingResult {
    const location = result.geometry.location;
    const addressComponents = result.address_components;

    return {
      formatted_address: result.formatted_address,
      latitude: location.lat,
      longitude: location.lng,
      city: this.extractAddressComponent(addressComponents, 'locality'),
      state: this.extractAddressComponent(addressComponents, 'administrative_area_level_1'),
      country: this.extractAddressComponent(addressComponents, 'country'),
      postal_code: this.extractAddressComponent(addressComponents, 'postal_code')
    };
  }

  private transformPlaceResult(place: any): PlaceResult {
    return {
      place_id: place.place_id,
      name: place.name,
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      address: place.vicinity,
      rating: place.rating,
      price_level: place.price_level,
      types: place.types
    };
  }

  private extractAddressComponent(components: any[], type: string): string | null {
    const component = components.find(comp => comp.types.includes(type));
    return component ? component.long_name : null;
  }

  private convertMetersToMiles(meters: number): number {
    return Math.round((meters * 0.000621371) * 10) / 10; // Round to 1 decimal
  }

  private convertMilesToMeters(miles: number): number {
    return Math.round(miles * 1609.34);
  }

  private handleProviderError(error: any): void {
    console.error(`Google Maps API Error:`, error);
    
    if (error.status === 429) {
      throw new RateLimitError('google_maps');
    }
    
    if (error.status >= 500) {
      throw new APIError('google_maps', 'Service temporarily unavailable');
    }
  }
}
```

## Circuit Breaker Implementation

### CircuitBreaker.ts
```typescript
export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export class CircuitBreaker {
  private failureCount = 0;
  private state = CircuitBreakerState.CLOSED;
  private lastFailureTime?: Date;
  private successCount = 0;

  constructor(
    private failureThreshold: number = 5,
    private timeout: number = 60000, // 1 minute
    private retryTimeout: number = 30000 // 30 seconds
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (this.shouldAttemptRetry()) {
        this.state = CircuitBreakerState.HALF_OPEN;
        this.successCount = 0;
      } else {
        throw new Error(`Circuit breaker is OPEN. Last failure: ${this.lastFailureTime}`);
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private shouldAttemptRetry(): boolean {
    return this.lastFailureTime && 
           (Date.now() - this.lastFailureTime.getTime()) > this.retryTimeout;
  }

  private onSuccess(): void {
    this.failureCount = 0;
    
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= 3) { // Require 3 successes to close
        this.state = CircuitBreakerState.CLOSED;
      }
    } else {
      this.state = CircuitBreakerState.CLOSED;
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = CircuitBreakerState.OPEN;
    }
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime
    };
  }
}
```

## Rate Limiting Service

### RateLimitService.ts
```typescript
import { Redis } from 'ioredis';

export class RateLimitService {
  private redis: Redis;
  
  constructor(redisClient: Redis) {
    this.redis = redisClient;
  }

  async checkLimit(
    provider: string, 
    maxRequests: number, 
    windowMs: number
  ): Promise<boolean> {
    const key = `rate_limit:${provider}`;
    const window = Math.floor(Date.now() / windowMs);
    const windowKey = `${key}:${window}`;
    
    const current = await this.redis.incr(windowKey);
    
    if (current === 1) {
      // Set expiration for the window
      await this.redis.expire(windowKey, Math.ceil(windowMs / 1000));
    }
    
    return current <= maxRequests;
  }

  async getRemainingRequests(
    provider: string,
    maxRequests: number,
    windowMs: number
  ): Promise<number> {
    const key = `rate_limit:${provider}`;
    const window = Math.floor(Date.now() / windowMs);
    const windowKey = `${key}:${window}`;
    
    const current = await this.redis.get(windowKey);
    const used = current ? parseInt(current) : 0;
    
    return Math.max(0, maxRequests - used);
  }

  async getResetTime(provider: string, windowMs: number): Promise<Date> {
    const currentWindow = Math.floor(Date.now() / windowMs);
    const nextWindow = (currentWindow + 1) * windowMs;
    return new Date(nextWindow);
  }
}
```

## Error Handling

### Error Types
```typescript
export class APIError extends Error {
  constructor(
    public provider: string,
    message: string,
    public statusCode?: number,
    public originalError?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class RateLimitError extends APIError {
  constructor(provider: string, retryAfter?: number) {
    super(provider, `Rate limit exceeded for ${provider}`, 429);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
  
  retryAfter?: number;
}

export class CircuitBreakerError extends Error {
  constructor(provider: string) {
    super(`Circuit breaker is open for ${provider}`);
    this.name = 'CircuitBreakerError';
    this.provider = provider;
  }
  
  provider: string;
}
```

### Global Error Handler
```typescript
export class ExternalAPIErrorHandler {
  static handle(error: any, provider: string): StandardEvent[] {
    console.error(`${provider} API Error:`, error);
    
    if (error instanceof RateLimitError) {
      // Log rate limit hit, return cached data if available
      this.logRateLimit(provider, error.retryAfter);
      return this.getCachedFallback(provider);
    }
    
    if (error instanceof CircuitBreakerError) {
      // Circuit breaker is open, use fallback data
      this.logCircuitBreakerOpen(provider);
      return this.getFallbackData(provider);
    }
    
    if (error instanceof APIError && error.statusCode >= 500) {
      // Server error, use cached/fallback data
      this.logServerError(provider, error.statusCode);
      return this.getCachedFallback(provider);
    }
    
    // Client errors (4xx) - log but don't fail completely
    if (error instanceof APIError && error.statusCode < 500) {
      this.logClientError(provider, error.statusCode, error.message);
      return [];
    }
    
    // Unknown error
    this.logUnknownError(provider, error);
    return [];
  }

  private static getCachedFallback(provider: string): StandardEvent[] {
    // Try to return cached data from Redis
    // Implementation depends on caching strategy
    return [];
  }

  private static getFallbackData(provider: string): StandardEvent[] {
    // Return curated fallback events or empty array
    // Could be popular events from database
    return [];
  }

  private static logRateLimit(provider: string, retryAfter?: number): void {
    console.warn(`Rate limit hit for ${provider}. Retry after: ${retryAfter}s`);
  }

  private static logCircuitBreakerOpen(provider: string): void {
    console.warn(`Circuit breaker open for ${provider}`);
  }

  private static logServerError(provider: string, statusCode: number): void {
    console.error(`Server error ${statusCode} from ${provider}`);
  }

  private static logClientError(provider: string, statusCode: number, message: string): void {
    console.warn(`Client error ${statusCode} from ${provider}: ${message}`);
  }

  private static logUnknownError(provider: string, error: any): void {
    console.error(`Unknown error from ${provider}:`, error);
  }
}
```

## Data Transformation and Standardization

### StandardEvent Interface
```typescript
export interface StandardEvent {
  id: string;
  external_id: string;
  source: string;
  title: string;
  description: string;
  long_description: string;
  start_time: string; // ISO 8601
  end_time: string; // ISO 8601
  location: StandardLocation | null;
  price: number;
  currency: string;
  max_attendees: number | null;
  current_attendees: number;
  external_url: string;
  ticket_url?: string;
  cover_image?: string;
  organizer_name?: string;
  organizer_url?: string;
  categories: string[];
  tags: string[];
  status: 'active' | 'cancelled' | 'completed' | 'postponed';
  last_synced: string;
}

export interface StandardLocation {
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code?: string;
  latitude: number | null;
  longitude: number | null;
}
```

## Caching Strategy

### CacheService.ts
```typescript
import { Redis } from 'ioredis';

export class CacheService {
  private redis: Redis;
  
  constructor(redisClient: Redis) {
    this.redis = redisClient;
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.redis.get(key);
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.setex(key, ttlSeconds, value);
    } catch (error) {
      console.error('Cache set error:', error);
      // Don't throw - caching is not critical
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }
}
```

## Monitoring and Observability

### API Metrics Collection
```typescript
export class APIMetricsCollector {
  static async recordAPICall(
    provider: string,
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number,
    requestSize?: number,
    responseSize?: number
  ): Promise<void> {
    const metrics = {
      provider,
      endpoint,
      method,
      status_code: statusCode,
      response_time_ms: responseTime,
      request_size_bytes: requestSize,
      response_size_bytes: responseSize,
      timestamp: new Date(),
      success: statusCode >= 200 && statusCode < 300
    };

    // Store metrics in database
    await this.storeMetrics(metrics);
    
    // Send to monitoring service (e.g., DataDog, New Relic)
    await this.sendToMonitoring(metrics);
  }

  static async getProviderHealth(provider: string, timeRange: number = 3600): Promise<ProviderHealth> {
    const since = new Date(Date.now() - timeRange * 1000);
    
    const metrics = await this.getMetricsSince(provider, since);
    
    const totalRequests = metrics.length;
    const successfulRequests = metrics.filter(m => m.success).length;
    const avgResponseTime = metrics.reduce((sum, m) => sum + m.response_time_ms, 0) / totalRequests;
    
    return {
      provider,
      total_requests: totalRequests,
      success_rate: totalRequests > 0 ? successfulRequests / totalRequests : 0,
      avg_response_time_ms: avgResponseTime,
      last_error: metrics.find(m => !m.success)?.timestamp
    };
  }

  private static async storeMetrics(metrics: any): Promise<void> {
    // Store in external_api_logs table
  }

  private static async sendToMonitoring(metrics: any): Promise<void> {
    // Send to external monitoring service
  }

  private static async getMetricsSince(provider: string, since: Date): Promise<any[]> {
    // Retrieve metrics from database
    return [];
  }
}
```

## Integration Testing

### External API Test Strategy
```typescript
// Integration test for external APIs
describe('External API Integration', () => {
  let eventbriteProvider: EventbriteProvider;
  let meetupProvider: MeetupProvider;
  let googleMapsProvider: GoogleMapsProvider;

  beforeEach(() => {
    eventbriteProvider = new EventbriteProvider(process.env.EVENTBRITE_API_KEY!);
    meetupProvider = new MeetupProvider(process.env.MEETUP_API_KEY!);
    googleMapsProvider = new GoogleMapsProvider(process.env.GOOGLE_MAPS_API_KEY!);
  });

  describe('Eventbrite Provider', () => {
    it('should search events successfully', async () => {
      const params: SearchParams = {
        location: { city: 'San Francisco', state: 'CA' },
        max_distance: 10,
        limit: 5
      };

      const events = await eventbriteProvider.searchEvents(params);
      
      expect(events).toBeInstanceOf(Array);
      expect(events.length).toBeLessThanOrEqual(5);
      
      if (events.length > 0) {
        expect(events[0]).toHaveProperty('id');
        expect(events[0]).toHaveProperty('title');
        expect(events[0].source).toBe('eventbrite');
      }
    });

    it('should handle rate limiting gracefully', async () => {
      // Mock rate limit exceeded
      jest.spyOn(eventbriteProvider, 'makeRequest')
        .mockRejectedValueOnce(new RateLimitError('eventbrite'));

      const params: SearchParams = { limit: 5 };
      const events = await eventbriteProvider.searchEvents(params);
      
      expect(events).toEqual([]);
    });

    it('should transform eventbrite events correctly', () => {
      const mockEventbriteEvent = {
        id: '12345',
        name: { text: 'Test Event' },
        description: { text: 'Test Description' },
        start: { utc: '2025-08-15T10:00:00Z' },
        end: { utc: '2025-08-15T12:00:00Z' },
        url: 'https://eventbrite.com/test',
        currency: 'USD'
      };

      const standardEvent = eventbriteProvider.transformEvent(mockEventbriteEvent);
      
      expect(standardEvent.id).toBe('eventbrite_12345');
      expect(standardEvent.source).toBe('eventbrite');
      expect(standardEvent.title).toBe('Test Event');
      expect(standardEvent.external_url).toBe('https://eventbrite.com/test');
    });
  });

  describe('Circuit Breaker', () => {
    it('should open after failure threshold', async () => {
      const circuitBreaker = new CircuitBreaker(2, 60000, 30000);
      
      const failingOperation = jest.fn().mockRejectedValue(new Error('API Error'));
      
      // First two failures
      await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow();
      await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow();
      
      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.OPEN);
      
      // Third call should fail immediately
      await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow('Circuit breaker is OPEN');
      
      // Should not have called the operation the third time
      expect(failingOperation).toHaveBeenCalledTimes(2);
    });
  });
});
```

## Configuration Management

### API Configuration
```typescript
// config/externalApis.ts
export const externalAPIConfig = {
  eventbrite: {
    baseURL: 'https://www.eventbriteapi.com/v3',
    apiKey: process.env.EVENTBRITE_API_KEY,
    rateLimit: {
      requests: 1000,
      window: 3600000 // 1 hour
    },
    timeout: 10000,
    retries: 3,
    circuitBreaker: {
      failureThreshold: 5,
      timeout: 60000,
      retryTimeout: 30000
    }
  },
  meetup: {
    baseURL: 'https://api.meetup.com',
    apiKey: process.env.MEETUP_API_KEY,
    rateLimit: {
      requests: 200,
      window: 3600000 // 1 hour
    },
    timeout: 10000,
    retries: 3,
    circuitBreaker: {
      failureThreshold: 3,
      timeout: 60000,
      retryTimeout: 30000
    }
  },
  googleMaps: {
    baseURL: 'https://maps.googleapis.com/maps/api',
    apiKey: process.env.GOOGLE_MAPS_API_KEY,
    rateLimit: {
      requests: 2500,
      window: 1000 // Per second
    },
    timeout: 5000,
    retries: 2,
    circuitBreaker: {
      failureThreshold: 10,
      timeout: 30000,
      retryTimeout: 15000
    }
  }
};
```

This comprehensive external API integration strategy ensures reliable, performant, and fault-tolerant interactions with third-party services while providing graceful degradation when services are unavailable.