-- Add Macau Daily source to the database
-- Run this script in your Supabase SQL Editor

INSERT INTO sources (type, name, url, active) VALUES
  ('web_scraper', 'Macau Daily News', 'https://www.macaodaily.com/html/2025-08/28/node_2.htm', true)
ON CONFLICT (type, url) DO UPDATE SET
  name = EXCLUDED.name,
  active = EXCLUDED.active,
  updated_at = now();

-- Verify the source was added
SELECT * FROM sources WHERE url LIKE '%macaodaily.com%';
