-- Add web scraper source to the sources table
-- Run this script in your Supabase SQL Editor

-- First, let's add the new source type constraint if it doesn't exist
-- (This should already be done by the updated setup.sql, but just in case)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'events_source_check'
    ) THEN
        ALTER TABLE events DROP CONSTRAINT IF EXISTS events_source_check;
        ALTER TABLE events ADD CONSTRAINT events_source_check 
        CHECK (source IN ('rss', 'newsapi', 'web_scraper'));
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'sources_type_check'
    ) THEN
        ALTER TABLE sources DROP CONSTRAINT IF EXISTS sources_type_check;
        ALTER TABLE sources ADD CONSTRAINT sources_type_check 
        CHECK (type IN ('rss', 'newsapi', 'web_scraper'));
    END IF;
END $$;

-- Add the new web scraper source
INSERT INTO sources (type, name, url, active) VALUES
  ('web_scraper', 'Supabase Events', 'https://supabase.com/dashboard/project/susyqfqdkliftccgygjz/editor/17437?schema=public', true)
ON CONFLICT (name) DO UPDATE SET
  type = EXCLUDED.type,
  url = EXCLUDED.url,
  active = EXCLUDED.active,
  updated_at = now();

-- Verify the source was added
SELECT * FROM sources WHERE type = 'web_scraper';
