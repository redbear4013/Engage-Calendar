# Smart Calendar App - System Architecture (Phase 1)

## High-Level Overview
Phase 1 uses a **monolithic architecture** with a minimal set of components. The system prioritizes simplicity and rapid iteration, while leaving room for scaling to microservices in later phases.

```
┌───────────────────────────┐
│        Client Layer       │
├───────────────────────────┤
│  Web App (Next.js + PWA)  │
│  - Calendar UI (FullCal)  │
│  - Event List             │
│  - User Accounts/Auth     │
└───────────────▲───────────┘
                │
                │ HTTPS (REST, JWT)
                │
┌───────────────┴───────────┐
│        API Layer          │
├───────────────────────────┤
│  Next.js API Routes /     │
│  NestJS REST Endpoints    │
│                           │
│  Modules:                 │
│  - Auth & Users           │
│  - Events (RSS/NewsAPI)   │
│  - Calendar (SavedEvents) │
│  - Admin (Sources Mgmt)   │
└───────────────▲───────────┘
                │
                │ Postgres Queries / Typesense Search
                │
┌───────────────┴───────────┐
│        Data Layer          │
├───────────────────────────┤
│ PostgreSQL (Supabase)     │
│  - users                  │
│  - events                 │
│  - saved_events           │
│  - sources                │
│  - ingestion_logs         │
│                           │
│ Typesense                 │
│  - search index for       │
│    events (title, desc,   │
│    city, categories, tags)│
└───────────────────────────┘
                │
                │ Scheduled Jobs / Manual Triggers
                │
┌───────────────┴───────────┐
│   Ingestion Layer          │
├───────────────────────────┤
│ RSS Fetcher (node-cron)   │
│ NewsAPI Client            │
│ Normalization Pipeline    │
│ Deduplication + Logging   │
└───────────────────────────┘
```

---

## Key Components

### 1. Client Layer
- **Web App**: Next.js React frontend.
- **Calendar UI**: FullCalendar component.
- **State Management**: React Query or Redux Toolkit.
- **Auth**: Supabase auth client (JWT).
- **Device Support**: Web + PWA (desktop/mobile browser).

### 2. API Layer
- Framework: **Next.js API routes** (or NestJS if backend separated).
- Modules:
  - **Auth & Users**: registration, login, profile.
  - **Events**: query/search events, fetch details.
  - **Calendar**: user saved events.
  - **Admin**: manage RSS sources, trigger ingestion.

### 3. Data Layer
- **PostgreSQL (Supabase)**:
  - Stores users, events, saved events, sources.
  - Ingestion logs for monitoring.
- **Typesense**:
  - Provides fast full-text search over `events`.

### 4. Ingestion Layer
- **RSS Fetcher**: parses configured feeds.
- **NewsAPI Client**: pulls recent news articles tagged as events.
- **Normalizer**: unifies into standard Event schema.
- **Deduplication**: avoids duplicate events.
- **Scheduler**: cron jobs (e.g., run every hour).

---

## Security
- HTTPS only.
- JWT auth via Supabase.
- Basic input validation + sanitation.
- Row-level security (RLS) in Supabase for per-user data.

---

## Deployment (Phase 1)
- **Frontend + API**: Vercel (Next.js)
- **Database**: Supabase Postgres
- **Search**: Typesense Cloud or self-hosted small instance
- **Jobs**: Simple cron jobs on Vercel serverless functions or Supabase edge functions

---

## Deferred Components (Future Phases)
- Microservices (Recommendations, Notifications, Analytics)
- External integrations (Eventbrite, Meetup, Google Maps)
- Mobile apps (React Native)
- Payments, OAuth, AI-based personalization

---

✅ Phase 1 system architecture is **simple, monolithic, and production-ready** for a free MVP based on RSS + NewsAPI aggregation.
## Phase 1.5 Enhancements

### Google Calendar Read-Only
- New OAuth PKCE flow (frontend button → backend OAuth routes).
- Background job pulls primary calendar events (next 30 days) into `provider_events`.
- UI merges read-only provider events into calendar view with a distinct style.

### Web Push Notifications
- Service worker `/sw.js` registered on login.
- `push_subscriptions` table stores the subscription; server sends VAPID messages ~30 min pre-event.

### My Tasks (Local)
- CRUD API for tasks table.
- Calendar view can overlay tasks with due times; separate “Tasks” panel in UI.
