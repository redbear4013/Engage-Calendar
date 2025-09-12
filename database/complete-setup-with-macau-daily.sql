-- ===========================================
-- WEEKEND PLANNER APP - COMPLETE DATABASE SETUP
-- INCLUDES MACAU DAILY SOURCE
-- ===========================================

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

-- Create ingestion_logs table
CREATE TABLE IF NOT EXISTS ingestion_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID REFERENCES sources(id),
  status TEXT CHECK (status IN ('started','success','failed')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===========================================
-- CREATE INDEXES FOR PERFORMANCE
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_events_source_id ON events(source, source_id);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time_utc);
CREATE INDEX IF NOT EXISTS idx_events_city ON events(city);
CREATE INDEX IF NOT EXISTS idx_events_categories ON events USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_events_tags ON events USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_saved_events_user_id ON saved_events(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_events_event_id ON saved_events(event_id);
CREATE INDEX IF NOT EXISTS idx_sources_active ON sources(active);
CREATE INDEX IF NOT EXISTS idx_ingestion_logs_created_at ON ingestion_logs(created_at);

-- ===========================================
-- ENABLE ROW LEVEL SECURITY
-- ===========================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_events ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- CREATE RLS POLICIES (PostgreSQL compatible)
-- ===========================================

-- Users can view own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can update own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Users can view own saved events
CREATE POLICY "Users can view own saved events" ON saved_events
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert own saved events
CREATE POLICY "Users can insert own saved events" ON saved_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update own saved events
CREATE POLICY "Users can update own saved events" ON saved_events
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete own saved events
CREATE POLICY "Users can delete own saved events" ON saved_events
  FOR DELETE USING (auth.uid() = user_id);

-- ===========================================
-- INSERT SAMPLE EVENT SOURCES
-- ===========================================

-- Insert RSS sources
INSERT INTO sources (type, name, url, active) VALUES
  ('rss', 'Eventbrite Local Events', 'https://www.eventbrite.com/rss/organizer_list_events/12345', true),
  ('rss', 'Meetup Tech Events', 'https://secure.meetup.com/topics/tech/rss', true)
ON CONFLICT (name) DO NOTHING;

-- Insert NewsAPI source
INSERT INTO sources (type, name, url, active) VALUES
  ('newsapi', 'NewsAPI Events', null, true)
ON CONFLICT (name) DO NOTHING;

-- Insert Macau Daily source
INSERT INTO sources (type, name, url, active) VALUES
  ('web_scraper', 'Macau Daily News', 'https://www.macaodaily.com/html/2025-08/28/node_2.htm', true)
ON CONFLICT (name) DO NOTHING;

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

-- Create triggers to automatically update updated_at
CREATE TRIGGER IF NOT EXISTS update_users_updated_at BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_sources_updated_at BEFORE UPDATE ON sources 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- VERIFY SETUP
-- ===========================================

-- Show all sources
SELECT 'All Sources' as info, type, name, url, active FROM sources ORDER BY type, name;

-- Show Macau Daily source specifically
SELECT 'Macau Daily Source' as info, type, name, url, active FROM sources WHERE url LIKE '%macaodaily.com%';

-- Show table counts
SELECT 
  'Table Counts' as info,
  (SELECT COUNT(*) FROM users) as users_count,
  (SELECT COUNT(*) FROM events) as events_count,
  (SELECT COUNT(*) FROM sources) as sources_count,
  (SELECT COUNT(*) FROM saved_events) as saved_events_count;

-- ===========================================
-- SCRIPT COMPLETED SUCCESSFULLY!
-- ===========================================

-- Your database is now ready with:
-- ✅ All required tables
-- ✅ Proper constraints including 'web_scraper' type
-- ✅ Macau Daily source added
-- ✅ Sample RSS and NewsAPI sources
-- ✅ Performance indexes
-- ✅ Row Level Security policies
-- ✅ Automatic timestamp updates

-- Next steps:
-- 1. Test the Macau Daily scraper: POST /api/scrape-macau-daily-structured
-- 2. Trigger event ingestion: POST /api/cron/ingest-events
-- 3. Check your calendar app for Macau Daily events!
