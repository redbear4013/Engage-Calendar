# Smart Calendar App - Database Schema (Phase 1)

## Overview
The database schema for **Phase 1** is intentionally simple to support user accounts, event aggregation (RSS + NewsAPI), personal saved events, and source management. Built for **PostgreSQL (via Supabase)** with **Typesense** for search indexing.

---

## Entity Relationship Diagram (simplified)
```
 Users ───────────────┐
                      │
                      ▼
              SavedEvents        Sources
                      ▲              │
                      │              ▼
                   Events ◀──────── IngestionLogs
```

---

## Tables

### 1. users
Stores registered user accounts.
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  city TEXT,
  country TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 2. events
Normalized events from RSS and NewsAPI.
```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL CHECK (source IN ('rss', 'newsapi')),
  source_id TEXT NOT NULL,  -- link or unique identifier from source
  title TEXT NOT NULL,
  description TEXT,
  long_description TEXT,
  start_time_utc TIMESTAMPTZ,
  end_time_utc TIMESTAMPTZ,
  timezone TEXT,
  venue_name TEXT,
  city TEXT,
  country TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  categories TEXT[] DEFAULT ARRAY['local_events'],
  tags TEXT[],
  image_url TEXT,
  organizer_name TEXT,
  external_url TEXT,
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (source, source_id)
);
```

### 3. saved_events
Links user accounts to saved events.
```sql
CREATE TABLE saved_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, event_id)
);
```

### 4. sources
Stores registered RSS feeds for ingestion.
```sql
CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('rss','newsapi')),
  name TEXT NOT NULL,
  url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 5. ingestion_logs
Tracks ingestion jobs and errors.
```sql
CREATE TABLE ingestion_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES sources(id),
  status TEXT CHECK (status IN ('started','success','failed')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Indexing & Search
- **Postgres**: B-Tree index on `(source, source_id)`, GIN index on `tags`.
- **Typesense**: Mirror `events` table with fields: `title`, `description`, `city`, `categories`, `start_time_utc`, `tags`.

---

## Deferred Tables (Future Phases)
- `recommendations`
- `notifications`
- `analytics`
- `oauth_accounts`
- `payments`

---

-- Local-only tasks
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  notes TEXT,
  due_at TIMESTAMPTZ,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_tasks_user_due ON tasks(user_id, due_at);

-- OAuth accounts (Google)
CREATE TABLE oauth_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google')),
  provider_user_id TEXT NOT NULL,
  access_token TEXT NOT NULL,        -- store encrypted
  refresh_token TEXT,                -- store encrypted
  expires_at TIMESTAMPTZ,
  scope TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (provider, provider_user_id)
);

-- Cached Google Calendar events (read-only mirror)
CREATE TABLE provider_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google')),
  provider_event_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time_utc TIMESTAMPTZ NOT NULL,
  end_time_utc TIMESTAMPTZ,
  timezone TEXT,
  calendar_id TEXT,
  location TEXT,
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, provider, provider_event_id)
);
CREATE INDEX idx_provider_events_user_time ON provider_events(user_id, start_time_utc);

-- Web Push subscriptions (browser)
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, endpoint)
);
