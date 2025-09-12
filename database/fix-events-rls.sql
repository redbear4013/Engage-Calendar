-- Fix RLS policies for events table to allow service role insertions
-- This allows the scraper and ingestion services to insert events

-- Drop existing RLS policy for events
DROP POLICY IF EXISTS "Events are publicly readable" ON events;

-- Create new policies for events table
-- Allow public read access (for all users)
CREATE POLICY "Events are publicly readable" ON events
  FOR SELECT USING (true);

-- Allow service role to insert events (for scrapers and ingestion)
CREATE POLICY "Service role can insert events" ON events
  FOR INSERT WITH CHECK (true);

-- Allow service role to update events (for scrapers and ingestion)
CREATE POLICY "Service role can update events" ON events
  FOR UPDATE USING (true);

-- Verify the policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'events'
ORDER BY policyname;