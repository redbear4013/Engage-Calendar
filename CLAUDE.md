# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Weekend Planner App is a Next.js 14 application that helps users discover and plan weekend activities by aggregating events from RSS feeds, NewsAPI, and web scraping. The app features user authentication, calendar views, event management, and automated event ingestion.

## Development Commands

```bash
# Development
npm run dev                    # Start development server
npm run build                  # Build for production  
npm run start                  # Start production server

# Code Quality
npm run lint                   # Run ESLint
npm run type-check            # Run TypeScript type checking
npm run test                  # Run Jest tests
npm run test:watch            # Run tests in watch mode
npm run test:e2e              # Run Playwright E2E tests

# Event Ingestion
curl -X POST http://localhost:3000/api/cron/ingest-events \
  -H "Authorization: Bearer your-cron-secret"

# Macau Sources
npm run seed:sources          # Seed Macau sources to database
npm run scrape:macau          # Test Macau scrapers locally
npm run test:scrapers         # Run scraper unit tests
curl http://localhost:3000/api/health  # Check ingestion health
```

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 14 with App Router and TypeScript
- **UI**: Tailwind CSS with custom components (inspired by shadcn/ui)  
- **Calendar**: FullCalendar React integration
- **Authentication**: Supabase Auth with Row Level Security
- **Database**: PostgreSQL via Supabase with real-time subscriptions
- **State Management**: TanStack Query (React Query) for server state
- **Event Sources**: RSS Parser, NewsAPI, Web Scraper with Cheerio, Macau Event Scrapers

### Project Structure
```
src/
├── app/                      # Next.js App Router pages
│   ├── (auth)/              # Auth layout group  
│   ├── dashboard/           # Main application dashboard
│   └── api/                 # API routes (REST endpoints)
├── components/              # React components
│   ├── ui/                  # Base UI components (Button, Input, etc)
│   ├── calendar/            # Calendar-specific components
│   ├── events/              # Event-related components
│   ├── layout/              # Layout components (Navigation)
│   └── marketing/           # Landing page components
├── contexts/                # React contexts (AuthContext)
├── hooks/                   # Custom React hooks
├── lib/                     # Utility libraries
│   ├── supabase.ts         # Supabase client configuration
│   ├── event-ingestion.ts  # Main event ingestion logic
│   ├── rss-parser.ts       # RSS feed parsing
│   ├── newsapi-client.ts   # NewsAPI integration
│   ├── web-scraper.ts      # Web scraping utilities
│   ├── date-macau.ts       # Macau timezone date parsing
│   └── scrapers/           # Macau event scrapers
│       ├── types.ts        # Scraper interfaces and types
│       ├── base-scraper.ts # Base scraper with rate limiting
│       ├── macau-coordinator.ts  # Scraper coordinator
│       └── macau/          # Individual Macau scrapers
│           ├── mgto.ts     # MGTO government events
│           ├── sands.ts    # Londoner & Venetian events
│           ├── galaxy.ts   # Galaxy Macau events
│           └── mice.ts     # MICE portal events
└── types/                   # TypeScript type definitions
```

## Database Schema

The app uses Supabase PostgreSQL with the following key tables:

- **users**: User profiles and preferences (RLS enabled)
- **events**: Aggregated events from all sources (public read)
- **saved_events**: User's saved events (RLS enabled, user-specific)
- **sources**: RSS feeds and API configurations (public read)
- **ingestion_logs**: Event ingestion tracking and debugging (admin only)

Events are deduplicated using unique constraint on `(source, source_id)`.

## Key Components & Patterns

### Event Ingestion System
The core ingestion logic in `src/lib/event-ingestion.ts`:
- Processes RSS feeds, NewsAPI, and web scrapers
- Handles batch processing with upsert logic
- Comprehensive error handling and logging
- Automatic cleanup of stale events

### Authentication Flow
- Uses Supabase Auth with `AuthProvider` context
- Protected routes with middleware (`src/middleware.ts`)
- RLS policies ensure users only access their own data

### Calendar Integration
- FullCalendar with custom event rendering
- Real-time updates via TanStack Query
- Save/unsave functionality integrated into calendar events

### UI Components
- Custom components following atomic design principles
- Tailwind CSS with class-variance-authority for variants
- Consistent styling with shadcn/ui patterns

## Environment Configuration

Required environment variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# External APIs
NEWS_API_KEY=your-newsapi-key

# Security
CRON_SECRET=your-secure-random-string
```

## Event Source Configuration

Add new event sources via the `sources` table:

```sql
-- RSS Feed
INSERT INTO sources (type, name, url, active) VALUES
  ('rss', 'Local Events RSS', 'https://example.com/events.rss', true);

-- NewsAPI (URL should be null)
INSERT INTO sources (type, name, url, active) VALUES
  ('newsapi', 'NewsAPI Events', null, true);

-- Web Scraper
INSERT INTO sources (type, name, url, active) VALUES
  ('web_scraper', 'Event Website', 'https://example.com/events', true);

-- Macau Sources (run database/seed-macau-sources.sql)
INSERT INTO sources (id, type, name, url, active) VALUES
  ('mgto', 'web_scraper', 'MGTO City Events', 'https://www.macaotourism.gov.mo/en/events/calendar', true),
  ('londoner', 'web_scraper', 'The Londoner Macao Events', 'https://www.londonermacao.com/macau-events-shows', true),
  ('venetian', 'web_scraper', 'The Venetian Macao Entertainment', 'https://www.venetianmacao.com/entertainment.html', true),
  ('galaxy', 'web_scraper', 'Galaxy Macau Events', 'https://www.galaxymacau.com/ticketing/event-list/', true),
  ('mice', 'web_scraper', 'Macao MICE Portal', 'https://www.mice.gov.mo/en/events.aspx', true);
```

## Testing Strategy

- **Unit Tests**: Jest with React Testing Library for components
- **E2E Tests**: Playwright for full user workflows  
- **API Tests**: Test event ingestion and API endpoints
- **Type Safety**: Strict TypeScript configuration

## Debugging Event Ingestion

Check ingestion logs in the database:

```sql
-- Recent ingestion attempts
SELECT * FROM ingestion_logs ORDER BY created_at DESC LIMIT 10;

-- Event counts by source
SELECT source, COUNT(*) FROM events GROUP BY source;

-- Recent events
SELECT title, source, created_at FROM events 
ORDER BY created_at DESC LIMIT 10;
```

## Database Setup

Run the setup script in `database/setup.sql` in your Supabase SQL Editor. This creates all necessary tables, indexes, RLS policies, and sample data.

## Deployment

The app is designed for Vercel deployment with automated event ingestion via cron jobs:

```json
{
  "crons": [
    {
      "path": "/api/cron/ingest-events", 
      "schedule": "0 */6 * * *"
    }
  ]
}
```

## Revalidate Schedule

Different Macau sources have different freshness requirements:

| Source | Frequency | Rationale |
|--------|-----------|-----------|
| **Galaxy/Londoner/Venetian** | Every 2 hours | Casino entertainment changes frequently |
| **MICE Portal** | Every 6 hours | Business events are more stable |
| **MGTO** | Every 12 hours | Government events are less frequent |

The main ingestion runs every 6 hours, but individual scrapers are rate-limited:
- Government sites: 0.5 requests/second (conservative)
- Casino sites: 1 request/second (moderate)
- All sources: 3 retries with exponential backoff

## Important Implementation Notes

- Always use `createAdminClient()` for server-side database operations that bypass RLS
- Event ingestion runs server-side only - never expose service role key to client
- All event times should be stored in UTC with timezone information preserved
- Web scraping includes special handling for Macau Daily with structured extraction
- The app supports both authenticated and guest users for browsing events

## Common Patterns

- **Data Fetching**: Use TanStack Query hooks in `src/hooks/`
- **API Routes**: Follow REST conventions with proper error handling
- **Component Structure**: Atomic design with TypeScript interfaces
- **State Management**: Server state via React Query, local state via useState/useContext