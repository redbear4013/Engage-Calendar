-- ===========================================
-- WEEKEND PLANNER APP - COMPLETE SUPABASE DATABASE SETUP
-- ===========================================
-- This script recreates the complete database schema for your Weekend Planner app
-- Compatible with Supabase PostgreSQL with RLS

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- CREATE TABLES
-- ===========================================

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  city TEXT,
  country TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT NOT NULL CHECK (source IN ('rss', 'newsapi', 'web_scraper')),
  source_id TEXT NOT NULL,
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

-- Create saved_events table
CREATE TABLE IF NOT EXISTS saved_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, event_id)
);

-- Create sources table
CREATE TABLE IF NOT EXISTS sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('rss','newsapi','web_scraper')),
  name TEXT NOT NULL,
  url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add unique constraint on name if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'sources_name_key'
    ) THEN
        ALTER TABLE sources ADD CONSTRAINT sources_name_key UNIQUE (name);
    END IF;
END $$;

-- Update the type check constraint to include web_scraper
DO $$
BEGIN
    -- Drop the old constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'sources_type_check'
    ) THEN
        ALTER TABLE sources DROP CONSTRAINT sources_type_check;
    END IF;
    
    -- Add the updated constraint
    ALTER TABLE sources ADD CONSTRAINT sources_type_check 
        CHECK (type IN ('rss','newsapi','web_scraper'));
        
    -- Also update events table constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'events_source_check'
    ) THEN
        ALTER TABLE events DROP CONSTRAINT events_source_check;
    END IF;
    
    -- Add the updated events constraint
    ALTER TABLE events ADD CONSTRAINT events_source_check 
        CHECK (source IN ('rss','newsapi','web_scraper'));
END $$;

-- Create ingestion_logs table
CREATE TABLE IF NOT EXISTS ingestion_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
  status TEXT CHECK (status IN ('started','success','failed')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===========================================
-- CREATE INDEXES FOR PERFORMANCE
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_events_source_id ON events(source, source_id);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time_utc);
CREATE INDEX IF NOT EXISTS idx_events_city ON events(city);
CREATE INDEX IF NOT EXISTS idx_events_country ON events(country);
CREATE INDEX IF NOT EXISTS idx_events_categories ON events USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_events_tags ON events USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_events_last_seen ON events(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_saved_events_user_id ON saved_events(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_events_event_id ON saved_events(event_id);
CREATE INDEX IF NOT EXISTS idx_saved_events_created_at ON saved_events(created_at);
CREATE INDEX IF NOT EXISTS idx_sources_type ON sources(type);
CREATE INDEX IF NOT EXISTS idx_sources_active ON sources(active);
CREATE INDEX IF NOT EXISTS idx_ingestion_logs_source_id ON ingestion_logs(source_id);
CREATE INDEX IF NOT EXISTS idx_ingestion_logs_status ON ingestion_logs(status);
CREATE INDEX IF NOT EXISTS idx_ingestion_logs_created_at ON ingestion_logs(created_at);

-- ===========================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ===========================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_logs ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- CREATE RLS POLICIES
-- ===========================================

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Events are publicly readable" ON events;
DROP POLICY IF EXISTS "Users can view own saved events" ON saved_events;
DROP POLICY IF EXISTS "Users can insert own saved events" ON saved_events;
DROP POLICY IF EXISTS "Users can update own saved events" ON saved_events;
DROP POLICY IF EXISTS "Users can delete own saved events" ON saved_events;
DROP POLICY IF EXISTS "Sources are publicly readable" ON sources;
DROP POLICY IF EXISTS "Ingestion logs are publicly readable" ON ingestion_logs;

-- Users table policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Events table policies (public read access for all users)
CREATE POLICY "Events are publicly readable" ON events
  FOR SELECT USING (true);

-- Saved events table policies
CREATE POLICY "Users can view own saved events" ON saved_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved events" ON saved_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved events" ON saved_events
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved events" ON saved_events
  FOR DELETE USING (auth.uid() = user_id);

-- Sources table policies (public read access)
CREATE POLICY "Sources are publicly readable" ON sources
  FOR SELECT USING (true);

-- Ingestion logs policies (public read access for monitoring)
CREATE POLICY "Ingestion logs are publicly readable" ON ingestion_logs
  FOR SELECT USING (true);

-- ===========================================
-- CREATE FUNCTIONS AND TRIGGERS
-- ===========================================

-- Create a function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_sources_updated_at ON sources;

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sources_updated_at BEFORE UPDATE ON sources 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- INSERT DEFAULT EVENT SOURCES
-- ===========================================

-- Insert default sources (handle duplicates gracefully)
DO $$
BEGIN
    -- Insert RSS sources
    INSERT INTO sources (type, name, url, active) VALUES
      ('rss', 'Eventbrite Local Events', 'https://www.eventbrite.com/rss/organizer_list_events/12345', true),
      ('rss', 'Meetup Tech Events', 'https://secure.meetup.com/topics/tech/rss', true)
    ON CONFLICT (name) DO UPDATE SET
      type = EXCLUDED.type,
      url = EXCLUDED.url,
      active = EXCLUDED.active,
      updated_at = now();

    -- Insert NewsAPI source
    INSERT INTO sources (type, name, url, active) VALUES
      ('newsapi', 'NewsAPI Events', null, true)
    ON CONFLICT (name) DO UPDATE SET
      type = EXCLUDED.type,
      url = EXCLUDED.url,
      active = EXCLUDED.active,
      updated_at = now();

    -- Insert Web Scraper sources
    INSERT INTO sources (type, name, url, active) VALUES
      ('web_scraper', 'Macau Daily News', 'https://www.macaodaily.com/html/2025-08/28/node_2.htm', true),
      ('web_scraper', 'Local Events Scraper', 'https://example.com/events', false)
    ON CONFLICT (name) DO UPDATE SET
      type = EXCLUDED.type,
      url = EXCLUDED.url,
      active = EXCLUDED.active,
      updated_at = now();
      
EXCEPTION WHEN OTHERS THEN
    -- Fallback: Insert only if not exists (for cases without unique constraint)
    INSERT INTO sources (type, name, url, active) 
    SELECT 'rss', 'Eventbrite Local Events', 'https://www.eventbrite.com/rss/organizer_list_events/12345', true
    WHERE NOT EXISTS (SELECT 1 FROM sources WHERE name = 'Eventbrite Local Events');
    
    INSERT INTO sources (type, name, url, active) 
    SELECT 'rss', 'Meetup Tech Events', 'https://secure.meetup.com/topics/tech/rss', true
    WHERE NOT EXISTS (SELECT 1 FROM sources WHERE name = 'Meetup Tech Events');
    
    INSERT INTO sources (type, name, url, active) 
    SELECT 'newsapi', 'NewsAPI Events', null, true
    WHERE NOT EXISTS (SELECT 1 FROM sources WHERE name = 'NewsAPI Events');
    
    INSERT INTO sources (type, name, url, active) 
    SELECT 'web_scraper', 'Macau Daily News', 'https://www.macaodaily.com/html/2025-08/28/node_2.htm', true
    WHERE NOT EXISTS (SELECT 1 FROM sources WHERE name = 'Macau Daily News');
    
    INSERT INTO sources (type, name, url, active) 
    SELECT 'web_scraper', 'Local Events Scraper', 'https://example.com/events', false
    WHERE NOT EXISTS (SELECT 1 FROM sources WHERE name = 'Local Events Scraper');
END $$;

-- ===========================================
-- CREATE HELPER FUNCTIONS
-- ===========================================

-- Function to get events for a specific city
CREATE OR REPLACE FUNCTION get_events_by_city(city_name TEXT, limit_count INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID,
  source TEXT,
  title TEXT,
  description TEXT,
  start_time_utc TIMESTAMPTZ,
  end_time_utc TIMESTAMPTZ,
  venue_name TEXT,
  city TEXT,
  country TEXT,
  categories TEXT[],
  image_url TEXT,
  external_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.source,
    e.title,
    e.description,
    e.start_time_utc,
    e.end_time_utc,
    e.venue_name,
    e.city,
    e.country,
    e.categories,
    e.image_url,
    e.external_url
  FROM events e
  WHERE e.city ILIKE '%' || city_name || '%'
  ORDER BY e.start_time_utc ASC NULLS LAST
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's saved events with event details
CREATE OR REPLACE FUNCTION get_user_saved_events(user_uuid UUID)
RETURNS TABLE (
  saved_event_id UUID,
  event_id UUID,
  title TEXT,
  description TEXT,
  start_time_utc TIMESTAMPTZ,
  end_time_utc TIMESTAMPTZ,
  venue_name TEXT,
  city TEXT,
  country TEXT,
  categories TEXT[],
  image_url TEXT,
  external_url TEXT,
  note TEXT,
  saved_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    se.id as saved_event_id,
    e.id as event_id,
    e.title,
    e.description,
    e.start_time_utc,
    e.end_time_utc,
    e.venue_name,
    e.city,
    e.country,
    e.categories,
    e.image_url,
    e.external_url,
    se.note,
    se.created_at as saved_at
  FROM saved_events se
  JOIN events e ON se.event_id = e.id
  WHERE se.user_id = user_uuid
  ORDER BY se.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- VERIFY SETUP
-- ===========================================

-- Show all tables
SELECT 
  'Database Tables' as info,
  schemaname,
  tablename
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'events', 'saved_events', 'sources', 'ingestion_logs')
ORDER BY tablename;

-- Show all sources
SELECT 
  'Event Sources' as info, 
  type, 
  name, 
  url, 
  active, 
  created_at 
FROM sources 
ORDER BY type, name;

-- Show table row counts
SELECT 
  'Table Row Counts' as info,
  (SELECT COUNT(*) FROM users) as users_count,
  (SELECT COUNT(*) FROM events) as events_count,
  (SELECT COUNT(*) FROM sources) as sources_count,
  (SELECT COUNT(*) FROM saved_events) as saved_events_count,
  (SELECT COUNT(*) FROM ingestion_logs) as ingestion_logs_count;

-- Show RLS status
SELECT 
  'RLS Status' as info,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'events', 'saved_events', 'sources', 'ingestion_logs')
ORDER BY tablename;

-- ===========================================
-- SCRIPT COMPLETED SUCCESSFULLY!
-- ===========================================

/*
✅ SETUP COMPLETE! Your Weekend Planner database includes:

📊 TABLES:
- users (with RLS for user privacy)
- events (public read access with web_scraper support)
- saved_events (user-specific with RLS)
- sources (RSS, NewsAPI, and web scraper sources)
- ingestion_logs (for monitoring data ingestion)

🔐 SECURITY:
- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Events and sources are publicly readable
- Proper foreign key constraints

⚡ PERFORMANCE:
- Comprehensive indexes on frequently queried columns
- GIN indexes for array fields (categories, tags)
- Optimized for city/country/time-based queries

🛠️ FUNCTIONALITY:
- Automatic timestamp updates
- Helper functions for common queries
- Support for all three data sources (RSS, NewsAPI, Web Scraper)
- Unique constraints to prevent duplicate events

🚀 NEXT STEPS:
1. Test your authentication system
2. Run event ingestion: POST /api/cron/ingest-events
3. Test web scraping: POST /api/scrape-macau-daily-structured
4. Access your app at http://localhost:3000

Your Supabase database is now fully configured and ready to use!
*/