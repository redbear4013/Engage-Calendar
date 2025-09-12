-- Add Macau Daily source to the database with schema updates
-- Run this script in your Supabase SQL Editor

-- First, ensure the web_scraper type is supported
DO $$ 
BEGIN
    -- Update events table constraint if needed
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'events_source_check'
    ) THEN
        ALTER TABLE events DROP CONSTRAINT IF EXISTS events_source_check;
        ALTER TABLE events ADD CONSTRAINT events_source_check 
        CHECK (source IN ('rss', 'newsapi', 'web_scraper'));
    END IF;
    
    -- Update sources table constraint if needed
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'sources_type_check'
    ) THEN
        ALTER TABLE sources DROP CONSTRAINT IF EXISTS sources_type_check;
        ALTER TABLE sources ADD CONSTRAINT sources_type_check 
        CHECK (type IN ('rss', 'newsapi', 'web_scraper'));
    END IF;
END $$;

-- Add the Macau Daily source
INSERT INTO sources (type, name, url, active) VALUES
  ('web_scraper', 'Macau Daily News', 'https://www.macaodaily.com/html/2025-08/28/node_2.htm', true);

-- Verify the source was added
SELECT * FROM sources WHERE url LIKE '%macaodaily.com%';

-- Show all web_scraper sources
SELECT * FROM sources WHERE type = 'web_scraper';
