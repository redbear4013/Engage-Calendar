-- Weekend Planner App Database Setup
-- Run this script in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE users (
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
CREATE TABLE events (
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
  image_urls TEXT[],
  organizer_name TEXT,
  external_url TEXT,
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (source, source_id)
);

-- Create saved_events table
CREATE TABLE saved_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, event_id)
);

-- Create sources table
CREATE TABLE sources (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('rss','newsapi','web_scraper')),
  name TEXT NOT NULL,
  url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create ingestion_logs table
CREATE TABLE ingestion_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id TEXT REFERENCES sources(id),
  status TEXT CHECK (status IN ('started','success','failed')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_events_source_id ON events(source, source_id);
CREATE INDEX idx_events_start_time ON events(start_time_utc);
CREATE INDEX idx_events_city ON events(city);
CREATE INDEX idx_events_categories ON events USING GIN(categories);
CREATE INDEX idx_events_tags ON events USING GIN(tags);
CREATE INDEX idx_saved_events_user_id ON saved_events(user_id);
CREATE INDEX idx_saved_events_event_id ON saved_events(event_id);
CREATE INDEX idx_sources_active ON sources(active);
CREATE INDEX idx_ingestion_logs_created_at ON ingestion_logs(created_at);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own saved events" ON saved_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved events" ON saved_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved events" ON saved_events
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved events" ON saved_events
  FOR DELETE USING (auth.uid() = user_id);

-- Public read access to events and sources (no RLS needed)
-- These are public data that all authenticated users can read

-- Insert some sample event sources
INSERT INTO sources (id, type, name, url, active) VALUES
  ('eventbrite-local', 'rss', 'Eventbrite Local Events', 'https://www.eventbrite.com/rss/organizer_list_events/12345', true),
  ('meetup-tech', 'rss', 'Meetup Tech Events', 'https://secure.meetup.com/topics/tech/rss', true),
  ('newsapi-events', 'newsapi', 'NewsAPI Events', null, true);

-- Create a function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sources_updated_at BEFORE UPDATE ON sources 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();