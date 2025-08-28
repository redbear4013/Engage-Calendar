# Weekend Planner App - Backend Microservices Architecture

## Overview

The Weekend Planner App backend implements a microservices architecture using Node.js with TypeScript, following domain-driven design principles. Each service is independently deployable, scalable, and maintains clear boundaries with well-defined contracts.

### Core Principles
- **Single Responsibility**: Each service handles one business domain
- **Database Per Service**: Each service owns its data
- **API-First Design**: Well-defined RESTful interfaces
- **Event-Driven Communication**: Asynchronous messaging between services
- **Fault Tolerance**: Graceful degradation and circuit breakers

### Technology Stack
- **Runtime**: Node.js 18+ with TypeScript 5+
- **Framework**: Express.js with Helmet, CORS
- **Database**: PostgreSQL with Prisma ORM
- **Caching**: Redis for session storage and caching
- **Message Queue**: Redis Pub/Sub / Apache Kafka (future)
- **API Documentation**: Swagger/OpenAPI 3.0
- **Testing**: Jest + Supertest + Test Containers

## Service Architecture

### Service Directory Structure
```
backend/
├── services/
│   ├── user-service/           # User management and authentication
│   ├── calendar-service/       # Calendar operations and view logic
│   ├── event-service/          # Event aggregation and management
│   ├── recommendation-service/  # AI recommendations and personalization
│   ├── notification-service/   # Push notifications and alerts
│   └── analytics-service/      # User behavior and performance tracking
├── shared/                     # Shared utilities and types
│   ├── types/                  # Common TypeScript interfaces
│   ├── utils/                  # Utility functions
│   ├── middleware/             # Common middleware
│   └── database/               # Database utilities
├── api-gateway/                # API Gateway and routing
├── docker-compose.yml          # Development environment
└── k8s/                       # Kubernetes deployment manifests
```

## User Service

### Responsibilities
- User authentication and authorization
- Profile management and preferences
- OAuth integration (Google, Facebook, Apple)
- Session management with JWT tokens
- User analytics and behavior tracking

### Service Structure
```
user-service/
├── src/
│   ├── controllers/
│   │   ├── AuthController.ts
│   │   ├── UserController.ts
│   │   ├── PreferencesController.ts
│   │   └── OAuthController.ts
│   ├── services/
│   │   ├── AuthService.ts
│   │   ├── UserService.ts
│   │   ├── TokenService.ts
│   │   └── OAuthService.ts
│   ├── repositories/
│   │   ├── UserRepository.ts
│   │   ├── SessionRepository.ts
│   │   └── OAuthRepository.ts
│   ├── models/
│   │   ├── User.ts
│   │   ├── UserProfile.ts
│   │   ├── UserPreferences.ts
│   │   └── UserSession.ts
│   ├── middleware/
│   │   ├── authMiddleware.ts
│   │   ├── validationMiddleware.ts
│   │   └── rateLimitMiddleware.ts
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── users.ts
│   │   └── oauth.ts
│   ├── utils/
│   │   ├── passwordUtils.ts
│   │   ├── tokenUtils.ts
│   │   └── validation.ts
│   └── app.ts
├── tests/
├── prisma/
│   └── schema.prisma
├── Dockerfile
└── package.json
```

### User Service Implementation

#### AuthController.ts
```typescript
import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { TokenService } from '../services/TokenService';
import { validateLoginRequest, validateRegisterRequest } from '../utils/validation';

export class AuthController {
  constructor(
    private authService: AuthService,
    private tokenService: TokenService
  ) {}

  async register(req: Request, res: Response): Promise<void> {
    try {
      const validationResult = validateRegisterRequest(req.body);
      if (!validationResult.isValid) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid registration data',
            details: validationResult.errors
          }
        });
        return;
      }

      const { user, tokens } = await this.authService.register(req.body);
      
      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            first_name: user.firstName,
            last_name: user.lastName,
            created_at: user.createdAt
          },
          tokens
        }
      });
    } catch (error) {
      if (error.code === 'EMAIL_ALREADY_EXISTS') {
        res.status(409).json({
          success: false,
          error: {
            code: 'EMAIL_ALREADY_EXISTS',
            message: 'Email address is already registered'
          }
        });
        return;
      }
      
      throw error; // Let error middleware handle other errors
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const validationResult = validateLoginRequest(req.body);
      if (!validationResult.isValid) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid login data',
            details: validationResult.errors
          }
        });
        return;
      }

      const { user, tokens } = await this.authService.login(req.body);
      
      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            first_name: user.firstName,
            last_name: user.lastName
          },
          tokens
        }
      });
    } catch (error) {
      if (error.code === 'INVALID_CREDENTIALS') {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          }
        });
        return;
      }
      
      throw error;
    }
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refresh_token } = req.body;
      const tokens = await this.tokenService.refreshTokens(refresh_token);
      
      res.json({
        success: true,
        data: { tokens }
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid or expired refresh token'
        }
      });
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      await this.authService.logout(userId, token);
      
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      throw error;
    }
  }
}
```

#### AuthService.ts
```typescript
import bcrypt from 'bcrypt';
import { UserRepository } from '../repositories/UserRepository';
import { SessionRepository } from '../repositories/SessionRepository';
import { TokenService } from './TokenService';
import { CreateUserRequest, LoginRequest, AuthResult } from '../types';

export class AuthService {
  constructor(
    private userRepository: UserRepository,
    private sessionRepository: SessionRepository,
    private tokenService: TokenService
  ) {}

  async register(userData: CreateUserRequest): Promise<AuthResult> {
    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('EMAIL_ALREADY_EXISTS');
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(userData.password, saltRounds);

    // Create user
    const user = await this.userRepository.create({
      ...userData,
      password: passwordHash,
      email_verified: false,
      status: 'active'
    });

    // Create profile
    await this.userRepository.createProfile({
      user_id: user.id,
      location_city: userData.location?.city,
      location_state: userData.location?.state,
      location_country: userData.location?.country || 'US',
      latitude: userData.location?.latitude,
      longitude: userData.location?.longitude,
      radius_miles: 25,
      timezone: userData.timezone || 'UTC'
    });

    // Generate tokens
    const tokens = await this.tokenService.generateTokens(user);
    
    // Create session
    await this.sessionRepository.create({
      user_id: user.id,
      token_hash: await bcrypt.hash(tokens.access_token, 10),
      device_info: userData.device_info,
      ip_address: userData.ip_address,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });

    return { user, tokens };
  }

  async login(credentials: LoginRequest): Promise<AuthResult> {
    // Find user by email
    const user = await this.userRepository.findByEmail(credentials.email);
    if (!user || !user.password_hash) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(credentials.password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // Check user status
    if (user.status !== 'active') {
      throw new Error('USER_INACTIVE');
    }

    // Generate tokens
    const tokens = await this.tokenService.generateTokens(user);
    
    // Create session
    await this.sessionRepository.create({
      user_id: user.id,
      token_hash: await bcrypt.hash(tokens.access_token, 10),
      device_info: credentials.device_info,
      ip_address: credentials.ip_address,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    return { user, tokens };
  }

  async logout(userId: string, token: string): Promise<void> {
    await this.sessionRepository.deleteByTokenHash(
      await bcrypt.hash(token, 10)
    );
  }
}
```

## Calendar Service

### Responsibilities
- Calendar CRUD operations
- Event conflict detection
- Date navigation and view logic
- Calendar visualization data preparation
- User event confirmations and cancellations

### Calendar Service Implementation

#### CalendarController.ts
```typescript
import { Request, Response } from 'express';
import { CalendarService } from '../services/CalendarService';
import { validateCalendarQuery, validateEventConfirmation } from '../utils/validation';

export class CalendarController {
  constructor(private calendarService: CalendarService) {}

  async getCalendar(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const validationResult = validateCalendarQuery(req.query);
      
      if (!validationResult.isValid) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid calendar query parameters',
            details: validationResult.errors
          }
        });
        return;
      }

      const calendarData = await this.calendarService.getCalendarData(
        userId,
        validationResult.data
      );

      res.json({
        success: true,
        data: calendarData
      });
    } catch (error) {
      throw error;
    }
  }

  async confirmEvent(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const { eventId } = req.params;

      const result = await this.calendarService.confirmEvent(userId, eventId);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      if (error.code === 'EVENT_NOT_AVAILABLE') {
        res.status(404).json({
          success: false,
          error: {
            code: 'EVENT_NOT_AVAILABLE',
            message: 'Event is no longer available'
          }
        });
        return;
      }

      if (error.code === 'CALENDAR_CONFLICT') {
        res.status(409).json({
          success: false,
          error: {
            code: 'CALENDAR_CONFLICT',
            message: 'Event conflicts with existing calendar entry',
            details: error.conflicts
          }
        });
        return;
      }

      throw error;
    }
  }

  async removeEvent(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const { eventId } = req.params;

      await this.calendarService.removeEvent(userId, eventId);

      res.json({
        success: true,
        message: 'Event removed from calendar'
      });
    } catch (error) {
      throw error;
    }
  }

  async getConflicts(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const conflicts = await this.calendarService.getConflicts(userId);

      res.json({
        success: true,
        data: { conflicts }
      });
    } catch (error) {
      throw error;
    }
  }
}
```

#### CalendarService.ts
```typescript
import { CalendarRepository } from '../repositories/CalendarRepository';
import { EventServiceClient } from '../clients/EventServiceClient';
import { RecommendationServiceClient } from '../clients/RecommendationServiceClient';
import { CalendarQuery, CalendarData, EventConflict } from '../types';

export class CalendarService {
  constructor(
    private calendarRepository: CalendarRepository,
    private eventServiceClient: EventServiceClient,
    private recommendationServiceClient: RecommendationServiceClient
  ) {}

  async getCalendarData(userId: string, query: CalendarQuery): Promise<CalendarData> {
    // Get user's confirmed events
    const confirmedEvents = await this.calendarRepository.getUserEvents(
      userId,
      query.start_date,
      query.end_date,
      'confirmed'
    );

    // Get event details from Event Service
    const eventIds = confirmedEvents.map(ce => ce.event_id);
    const eventDetails = await this.eventServiceClient.getEventsByIds(eventIds);

    // Get suggestions if requested
    let suggestions = [];
    if (query.include_suggestions !== false) {
      suggestions = await this.recommendationServiceClient.getDailySuggestions(
        userId,
        query.start_date,
        query.end_date
      );
    }

    // Detect conflicts
    const conflicts = await this.detectConflicts(userId, suggestions);

    return {
      view: query.view || 'month',
      period: {
        start_date: query.start_date,
        end_date: query.end_date
      },
      events: this.mapEventsWithStatus(eventDetails, confirmedEvents),
      suggestions: suggestions,
      conflicts: conflicts,
      statistics: this.calculateStatistics(eventDetails, suggestions)
    };
  }

  async confirmEvent(userId: string, eventId: string): Promise<any> {
    // Check if event exists and is available
    const event = await this.eventServiceClient.getEventById(eventId);
    if (!event || event.status !== 'active') {
      throw { code: 'EVENT_NOT_AVAILABLE' };
    }

    // Check for conflicts
    const conflicts = await this.checkEventConflicts(userId, event);
    if (conflicts.length > 0) {
      throw { 
        code: 'CALENDAR_CONFLICT',
        conflicts: conflicts
      };
    }

    // Add to calendar
    const calendarEvent = await this.calendarRepository.addEvent(userId, eventId);

    // Remove conflicting suggestions (if any)
    const removedSuggestions = await this.removeConflictingSuggestions(
      userId,
      event.start_time,
      event.end_time
    );

    // Publish event for analytics
    await this.publishEventConfirmation(userId, eventId);

    return {
      event: {
        id: eventId,
        status: 'confirmed',
        confirmed_at: calendarEvent.confirmed_at
      },
      conflicts_removed: removedSuggestions.map(s => s.id)
    };
  }

  async removeEvent(userId: string, eventId: string): Promise<void> {
    await this.calendarRepository.removeEvent(userId, eventId);
    
    // Publish event for analytics
    await this.publishEventRemoval(userId, eventId);
  }

  async getConflicts(userId: string): Promise<EventConflict[]> {
    const confirmedEvents = await this.calendarRepository.getUserEvents(userId);
    const suggestions = await this.recommendationServiceClient.getCurrentSuggestions(userId);
    
    return this.detectConflicts(userId, suggestions);
  }

  private async detectConflicts(userId: string, suggestions: any[]): Promise<EventConflict[]> {
    const confirmedEvents = await this.calendarRepository.getUserEvents(userId);
    const conflicts: EventConflict[] = [];

    for (const suggestion of suggestions) {
      for (const confirmedEvent of confirmedEvents) {
        if (this.eventsOverlap(suggestion, confirmedEvent)) {
          conflicts.push({
            date: suggestion.start_time.split('T')[0],
            time_slot: `${this.formatTime(suggestion.start_time)}-${this.formatTime(suggestion.end_time)}`,
            events: [
              {
                id: suggestion.id,
                title: suggestion.title,
                status: 'suggested'
              },
              {
                id: confirmedEvent.event_id,
                title: confirmedEvent.title,
                status: 'confirmed'
              }
            ]
          });
        }
      }
    }

    return conflicts;
  }

  private eventsOverlap(event1: any, event2: any): boolean {
    const start1 = new Date(event1.start_time);
    const end1 = new Date(event1.end_time);
    const start2 = new Date(event2.start_time);
    const end2 = new Date(event2.end_time);

    return start1 < end2 && start2 < end1;
  }

  private async publishEventConfirmation(userId: string, eventId: string): Promise<void> {
    // Publish to message queue for analytics
    // Implementation depends on messaging system (Redis Pub/Sub, Kafka, etc.)
  }
}
```

## Event Service

### Responsibilities
- Event data aggregation from external APIs
- Event details management and caching
- RSVP and attendance tracking
- Event categorization and filtering
- External API rate limiting and error handling

### Event Service Implementation

#### EventController.ts
```typescript
import { Request, Response } from 'express';
import { EventService } from '../services/EventService';
import { validateEventSearch, validateEventId } from '../utils/validation';

export class EventController {
  constructor(private eventService: EventService) {}

  async searchEvents(req: Request, res: Response): Promise<void> {
    try {
      const validationResult = validateEventSearch(req.query);
      if (!validationResult.isValid) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid search parameters',
            details: validationResult.errors
          }
        });
        return;
      }

      const results = await this.eventService.searchEvents(validationResult.data);

      res.json({
        success: true,
        data: {
          events: results.events,
          pagination: results.pagination
        }
      });
    } catch (error) {
      throw error;
    }
  }

  async getEventById(req: Request, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;
      const userId = req.user?.id; // Optional for anonymous access

      const event = await this.eventService.getEventById(eventId, userId);
      
      if (!event) {
        res.status(404).json({
          success: false,
          error: {
            code: 'EVENT_NOT_FOUND',
            message: 'Event not found'
          }
        });
        return;
      }

      res.json({
        success: true,
        data: event
      });
    } catch (error) {
      throw error;
    }
  }

  async markInterested(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const { eventId } = req.params;

      await this.eventService.markUserInterest(userId, eventId, 'interested');

      res.json({
        success: true,
        message: 'Interest recorded'
      });
    } catch (error) {
      throw error;
    }
  }

  async removeInterest(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const { eventId } = req.params;

      await this.eventService.markUserInterest(userId, eventId, 'not_interested');

      res.json({
        success: true,
        message: 'Interest removed'
      });
    } catch (error) {
      throw error;
    }
  }
}
```

#### EventService.ts
```typescript
import { EventRepository } from '../repositories/EventRepository';
import { ExternalAPIService } from '../services/ExternalAPIService';
import { CacheService } from '../services/CacheService';
import { SearchParams, EventDetails, EventSearchResults } from '../types';

export class EventService {
  constructor(
    private eventRepository: EventRepository,
    private externalAPIService: ExternalAPIService,
    private cacheService: CacheService
  ) {}

  async searchEvents(params: SearchParams): Promise<EventSearchResults> {
    const cacheKey = `events:search:${JSON.stringify(params)}`;
    
    // Try cache first
    const cachedResults = await this.cacheService.get(cacheKey);
    if (cachedResults) {
      return JSON.parse(cachedResults);
    }

    // Search in database
    const dbResults = await this.eventRepository.search(params);
    
    // If we need more results, query external APIs
    let externalResults = [];
    if (dbResults.length < params.limit) {
      externalResults = await this.externalAPIService.searchEvents(params);
      
      // Store new events in database
      for (const event of externalResults) {
        await this.eventRepository.upsertFromExternal(event);
      }
    }

    const combinedResults = [...dbResults, ...externalResults]
      .slice(0, params.limit);

    const results: EventSearchResults = {
      events: combinedResults,
      pagination: {
        page: params.page || 1,
        per_page: params.limit || 50,
        total_pages: Math.ceil(combinedResults.length / (params.limit || 50)),
        total_items: combinedResults.length,
        has_next: combinedResults.length === params.limit,
        has_prev: (params.page || 1) > 1
      }
    };

    // Cache results for 15 minutes
    await this.cacheService.set(cacheKey, JSON.stringify(results), 900);

    return results;
  }

  async getEventById(eventId: string, userId?: string): Promise<EventDetails | null> {
    const cacheKey = `event:${eventId}`;
    
    // Try cache first
    const cachedEvent = await this.cacheService.get(cacheKey);
    if (cachedEvent) {
      const event = JSON.parse(cachedEvent);
      
      // Add user context if userId provided
      if (userId) {
        event.user_context = await this.getUserEventContext(userId, eventId);
      }
      
      return event;
    }

    // Get from database
    let event = await this.eventRepository.findById(eventId);
    
    // If not found, try external APIs
    if (!event) {
      event = await this.externalAPIService.getEventById(eventId);
      if (event) {
        await this.eventRepository.upsertFromExternal(event);
      }
    }

    if (!event) {
      return null;
    }

    // Add user context
    if (userId) {
      event.user_context = await this.getUserEventContext(userId, eventId);
    }

    // Cache for 1 hour
    await this.cacheService.set(cacheKey, JSON.stringify(event), 3600);

    return event;
  }

  async markUserInterest(userId: string, eventId: string, interestType: string): Promise<void> {
    await this.eventRepository.recordUserInterest(userId, eventId, interestType);
    
    // Invalidate user-specific caches
    await this.cacheService.delete(`user:${userId}:interests`);
    
    // Publish event for recommendation engine
    await this.publishInterestEvent(userId, eventId, interestType);
  }

  private async getUserEventContext(userId: string, eventId: string): Promise<any> {
    const [interest, calendarEntry, similarEvents] = await Promise.all([
      this.eventRepository.getUserInterest(userId, eventId),
      this.eventRepository.getUserCalendarEntry(userId, eventId),
      this.eventRepository.getSimilarEventsAttended(userId, eventId)
    ]);

    return {
      is_interested: interest?.interest_type === 'interested',
      is_confirmed: !!calendarEntry,
      recommendation_score: 0.85, // Would come from recommendation service
      similar_events_attended: similarEvents.length
    };
  }

  private async publishInterestEvent(userId: string, eventId: string, interestType: string): Promise<void> {
    // Publish to message queue for recommendation engine
    // Implementation depends on messaging system
  }
}
```

## Recommendation Service

### Responsibilities
- AI-powered recommendation engine
- Personalization algorithms based on user behavior
- Content filtering and ranking
- A/B testing for recommendation strategies
- Machine learning model training and inference

### Recommendation Service Implementation

#### RecommendationController.ts
```typescript
import { Request, Response } from 'express';
import { RecommendationService } from '../services/RecommendationService';
import { validateRecommendationQuery, validateFeedback } from '../utils/validation';

export class RecommendationController {
  constructor(private recommendationService: RecommendationService) {}

  async getDailyRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const validationResult = validateRecommendationQuery(req.query);
      
      if (!validationResult.isValid) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid recommendation query',
            details: validationResult.errors
          }
        });
        return;
      }

      const recommendations = await this.recommendationService.getDailyRecommendations(
        userId,
        validationResult.data
      );

      res.json({
        success: true,
        data: recommendations
      });
    } catch (error) {
      if (error.code === 'RECOMMENDATION_ENGINE_ERROR') {
        res.status(503).json({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Recommendation service temporarily unavailable'
          }
        });
        return;
      }
      
      throw error;
    }
  }

  async getAlternatives(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const { category } = req.query;
      const excludeIds = req.query.exclude?.split(',') || [];

      const alternatives = await this.recommendationService.getAlternatives(
        userId,
        category as string,
        excludeIds
      );

      res.json({
        success: true,
        data: { alternatives }
      });
    } catch (error) {
      throw error;
    }
  }

  async submitFeedback(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const validationResult = validateFeedback(req.body);
      
      if (!validationResult.isValid) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid feedback data',
            details: validationResult.errors
          }
        });
        return;
      }

      await this.recommendationService.processFeedback(
        userId,
        validationResult.data
      );

      res.json({
        success: true,
        message: 'Feedback recorded'
      });
    } catch (error) {
      throw error;
    }
  }
}
```

#### RecommendationService.ts
```typescript
import { RecommendationRepository } from '../repositories/RecommendationRepository';
import { MLEngine } from '../services/MLEngine';
import { EventServiceClient } from '../clients/EventServiceClient';
import { UserServiceClient } from '../clients/UserServiceClient';
import { RecommendationQuery, DailyRecommendations, RecommendationFeedback } from '../types';

export class RecommendationService {
  constructor(
    private recommendationRepository: RecommendationRepository,
    private mlEngine: MLEngine,
    private eventServiceClient: EventServiceClient,
    private userServiceClient: UserServiceClient
  ) {}

  async getDailyRecommendations(userId: string, query: RecommendationQuery): Promise<DailyRecommendations> {
    // Get user preferences and behavior data
    const [userPreferences, userHistory] = await Promise.all([
      this.userServiceClient.getUserPreferences(userId),
      this.recommendationRepository.getUserHistory(userId)
    ]);

    // Generate recommendations using ML engine
    const candidateEvents = await this.eventServiceClient.getEventsForRecommendation({
      location: userPreferences.location,
      radius: userPreferences.radius_miles,
      date: query.date,
      categories: userPreferences.interests
    });

    // Score and rank events
    const scoredEvents = await this.mlEngine.scoreEvents(
      userId,
      candidateEvents,
      userPreferences,
      userHistory
    );

    // Organize by categories (3 per category as per PRD requirement FR3.1)
    const recommendations = this.organizeByCategories(scoredEvents);

    // Store recommendations for tracking
    await this.storeRecommendations(userId, recommendations, query.date);

    return {
      date: query.date,
      suggestions: recommendations,
      alternatives_available: true,
      next_refresh: this.calculateNextRefresh(query.date)
    };
  }

  async getAlternatives(userId: string, category: string, excludeIds: string[]): Promise<any[]> {
    const userPreferences = await this.userServiceClient.getUserPreferences(userId);
    
    const alternativeEvents = await this.eventServiceClient.getEventsForRecommendation({
      location: userPreferences.location,
      radius: userPreferences.radius_miles,
      categories: [category],
      exclude: excludeIds,
      limit: 10
    });

    const userHistory = await this.recommendationRepository.getUserHistory(userId);
    
    const scoredAlternatives = await this.mlEngine.scoreEvents(
      userId,
      alternativeEvents,
      userPreferences,
      userHistory
    );

    return scoredAlternatives.slice(0, 5);
  }

  async processFeedback(userId: string, feedback: RecommendationFeedback): Promise<void> {
    // Store feedback
    await this.recommendationRepository.storeFeedback(userId, feedback);
    
    // Update ML model with new feedback
    await this.mlEngine.updateModelWithFeedback(userId, feedback);
    
    // Publish feedback event for analytics
    await this.publishFeedbackEvent(userId, feedback);
  }

  private organizeByCategories(scoredEvents: any[]): Record<string, any[]> {
    const categories = {
      local_events: [],
      personal_activities: [],
      educational_content: []
    };

    // Sort by score descending
    scoredEvents.sort((a, b) => b.score - a.score);

    // Distribute events to categories (3 per category)
    for (const event of scoredEvents) {
      for (const category of event.categories) {
        if (categories[category] && categories[category].length < 3) {
          categories[category].push({
            ...event,
            recommendation_score: event.score,
            recommendation_reasons: event.reasons || []
          });
          break;
        }
      }
    }

    return categories;
  }

  private async storeRecommendations(userId: string, recommendations: Record<string, any[]>, date: string): Promise<void> {
    const recommendationRecords = [];
    
    for (const [category, events] of Object.entries(recommendations)) {
      for (const event of events) {
        recommendationRecords.push({
          user_id: userId,
          event_id: event.id,
          score: event.recommendation_score,
          reasons: event.recommendation_reasons,
          algorithm_version: 'v1.0',
          created_at: new Date()
        });
      }
    }

    await this.recommendationRepository.batchInsert(recommendationRecords);
  }

  private calculateNextRefresh(currentDate: string): string {
    // Next day at midnight
    const nextDay = new Date(currentDate);
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(0, 0, 0, 0);
    return nextDay.toISOString();
  }

  private async publishFeedbackEvent(userId: string, feedback: RecommendationFeedback): Promise<void> {
    // Publish to message queue for analytics and ML pipeline
  }
}
```

#### MLEngine.ts
```typescript
import { UserPreferences, EventCandidate, UserHistory, ScoredEvent } from '../types';

export class MLEngine {
  async scoreEvents(
    userId: string,
    events: EventCandidate[],
    preferences: UserPreferences,
    history: UserHistory
  ): Promise<ScoredEvent[]> {
    const scoredEvents: ScoredEvent[] = [];

    for (const event of events) {
      const score = await this.calculateEventScore(event, preferences, history);
      const reasons = this.generateReasons(event, preferences, score);

      scoredEvents.push({
        ...event,
        score,
        reasons
      });
    }

    return scoredEvents.filter(event => event.score > 0.3); // Minimum threshold
  }

  private async calculateEventScore(
    event: EventCandidate,
    preferences: UserPreferences,
    history: UserHistory
  ): Promise<number> {
    let score = 0;
    const factors = [];

    // Interest matching (40% weight)
    const interestScore = this.calculateInterestScore(event, preferences.interests);
    score += interestScore * 0.4;
    factors.push({ factor: 'interests', score: interestScore });

    // Location preference (25% weight)
    const locationScore = this.calculateLocationScore(event, preferences.location, preferences.radius_miles);
    score += locationScore * 0.25;
    factors.push({ factor: 'location', score: locationScore });

    // Time preference (15% weight)
    const timeScore = this.calculateTimeScore(event, preferences.activity_times);
    score += timeScore * 0.15;
    factors.push({ factor: 'time', score: timeScore });

    // Historical behavior (10% weight)
    const behaviorScore = this.calculateBehaviorScore(event, history);
    score += behaviorScore * 0.1;
    factors.push({ factor: 'behavior', score: behaviorScore });

    // Popularity/social proof (5% weight)
    const popularityScore = this.calculatePopularityScore(event);
    score += popularityScore * 0.05;
    factors.push({ factor: 'popularity', score: popularityScore });

    // Price preference (5% weight)
    const priceScore = this.calculatePriceScore(event, preferences.price_range);
    score += priceScore * 0.05;
    factors.push({ factor: 'price', score: priceScore });

    return Math.min(score, 1.0); // Cap at 1.0
  }

  private calculateInterestScore(event: EventCandidate, interests: string[]): number {
    const eventCategories = event.categories || [];
    const eventTags = event.tags || [];
    
    let matchScore = 0;
    let totalWeight = 0;

    for (const interest of interests) {
      totalWeight += 1;
      if (eventCategories.includes(interest) || eventTags.includes(interest)) {
        matchScore += 1;
      }
    }

    return totalWeight > 0 ? matchScore / totalWeight : 0;
  }

  private calculateLocationScore(event: EventCandidate, userLocation: any, maxDistance: number): number {
    const distance = event.location?.distance_miles || 0;
    
    if (distance > maxDistance) {
      return 0;
    }
    
    // Linear decay from 1.0 at 0 distance to 0.2 at max distance
    return Math.max(0.2, 1.0 - (distance / maxDistance) * 0.8);
  }

  private calculateTimeScore(event: EventCandidate, preferredTimes: string[]): number {
    const eventHour = new Date(event.start_time).getHours();
    const eventDay = new Date(event.start_time).getDay();
    
    let score = 0.5; // Neutral score
    
    for (const timePreference of preferredTimes) {
      switch (timePreference) {
        case 'morning':
          if (eventHour >= 6 && eventHour < 12) score = Math.max(score, 1.0);
          break;
        case 'afternoon':
          if (eventHour >= 12 && eventHour < 17) score = Math.max(score, 1.0);
          break;
        case 'evening':
          if (eventHour >= 17 && eventHour < 22) score = Math.max(score, 1.0);
          break;
        case 'weekend':
          if (eventDay === 0 || eventDay === 6) score = Math.max(score, 1.0);
          break;
        case 'weekday':
          if (eventDay >= 1 && eventDay <= 5) score = Math.max(score, 1.0);
          break;
      }
    }
    
    return score;
  }

  private calculateBehaviorScore(event: EventCandidate, history: UserHistory): number {
    // Analyze user's past behavior to predict interest
    const similarEvents = history.attended_events.filter(e => 
      e.categories.some(cat => event.categories?.includes(cat))
    );
    
    if (similarEvents.length === 0) return 0.5;
    
    const avgRating = similarEvents.reduce((sum, e) => sum + (e.rating || 3), 0) / similarEvents.length;
    return Math.max(0, (avgRating - 1) / 4); // Convert 1-5 rating to 0-1 score
  }

  private calculatePopularityScore(event: EventCandidate): number {
    const attendeeCount = event.current_attendees || 0;
    const maxAttendees = event.max_attendees || 1;
    
    const fillRatio = attendeeCount / maxAttendees;
    
    // Sweet spot around 60-80% capacity
    if (fillRatio >= 0.6 && fillRatio <= 0.8) {
      return 1.0;
    } else if (fillRatio >= 0.4 && fillRatio <= 0.9) {
      return 0.8;
    } else {
      return 0.5;
    }
  }

  private calculatePriceScore(event: EventCandidate, priceRange: any): number {
    const eventPrice = event.price || 0;
    const maxPrice = priceRange?.max || 100;
    
    if (eventPrice === 0) return 1.0; // Free events are great
    if (eventPrice > maxPrice) return 0; // Too expensive
    
    return 1.0 - (eventPrice / maxPrice) * 0.5; // Linear decay
  }

  private generateReasons(event: EventCandidate, preferences: UserPreferences, score: number): string[] {
    const reasons = [];
    
    // Interest-based reasons
    const matchingInterests = preferences.interests.filter(interest =>
      event.categories?.includes(interest) || event.tags?.includes(interest)
    );
    if (matchingInterests.length > 0) {
      reasons.push(`Matches your interest in ${matchingInterests[0]}`);
    }
    
    // Location-based reasons
    if (event.location?.distance_miles <= 5) {
      reasons.push('Close to your location');
    }
    
    // Price-based reasons
    if (event.price === 0) {
      reasons.push('Free event');
    }
    
    // Popularity-based reasons
    if (event.current_attendees > 20) {
      reasons.push('Popular in your area');
    }
    
    // Time-based reasons
    const eventHour = new Date(event.start_time).getHours();
    if (preferences.activity_times.includes('morning') && eventHour >= 6 && eventHour < 12) {
      reasons.push('Perfect for morning activities');
    }
    
    return reasons.slice(0, 3); // Limit to 3 reasons
  }

  async updateModelWithFeedback(userId: string, feedback: RecommendationFeedback): Promise<void> {
    // In a real implementation, this would update ML model weights
    // For now, we'll store the feedback for future model training
    console.log(`Updating model with feedback from user ${userId}:`, feedback);
  }
}
```

## Service Communication

### Inter-Service Communication Patterns

#### Synchronous Communication (REST)
```typescript
// clients/EventServiceClient.ts
export class EventServiceClient {
  constructor(private httpClient: HttpClient) {}

  async getEventById(eventId: string): Promise<Event | null> {
    try {
      const response = await this.httpClient.get(`/events/${eventId}`);
      return response.data;
    } catch (error) {
      if (error.status === 404) {
        return null;
      }
      throw new ServiceError('EVENT_SERVICE_ERROR', error.message);
    }
  }

  async getEventsByIds(eventIds: string[]): Promise<Event[]> {
    if (eventIds.length === 0) return [];
    
    const response = await this.httpClient.post('/events/batch', {
      event_ids: eventIds
    });
    return response.data.events;
  }
}
```

#### Asynchronous Communication (Events)
```typescript
// services/EventPublisher.ts
export class EventPublisher {
  constructor(private messageQueue: MessageQueue) {}

  async publishUserEventConfirmed(userId: string, eventId: string): Promise<void> {
    await this.messageQueue.publish('user.event.confirmed', {
      user_id: userId,
      event_id: eventId,
      timestamp: new Date().toISOString()
    });
  }

  async publishRecommendationFeedback(userId: string, feedback: any): Promise<void> {
    await this.messageQueue.publish('recommendation.feedback', {
      user_id: userId,
      feedback,
      timestamp: new Date().toISOString()
    });
  }
}

// services/EventSubscriber.ts
export class EventSubscriber {
  constructor(private messageQueue: MessageQueue) {}

  async subscribeToEvents(): Promise<void> {
    await this.messageQueue.subscribe('user.event.confirmed', this.handleEventConfirmation);
    await this.messageQueue.subscribe('recommendation.feedback', this.handleRecommendationFeedback);
  }

  private async handleEventConfirmation(message: any): Promise<void> {
    // Update analytics, send notifications, etc.
    console.log('Event confirmed:', message);
  }

  private async handleRecommendationFeedback(message: any): Promise<void> {
    // Update ML model, analytics, etc.
    console.log('Recommendation feedback:', message);
  }
}
```

## Error Handling and Resilience

### Circuit Breaker Pattern
```typescript
// utils/CircuitBreaker.ts
export class CircuitBreaker {
  private failureCount = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private lastFailureTime?: Date;

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000 // 1 minute
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime!.getTime() > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
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

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();
    
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}
```

### Global Error Handler
```typescript
// middleware/errorHandler.ts
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', error);

  // Log error for monitoring
  logger.error('API Error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    user: req.user?.id,
    timestamp: new Date().toISOString()
  });

  // Handle specific error types
  if (error instanceof ValidationError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.message,
        details: error.details
      }
    });
    return;
  }

  if (error instanceof ServiceError) {
    res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_ERROR',
        message: 'External service temporarily unavailable'
      }
    });
    return;
  }

  // Default error response
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred'
    }
  });
};
```

This comprehensive microservices architecture provides a solid foundation for the Weekend Planner App backend, ensuring scalability, maintainability, and resilience while meeting all functional requirements from the PRD.