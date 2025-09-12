-- Seed file for Macau event sources
-- Run this script to add the 5 Macau event sources to the sources table
-- This script is idempotent and safe to run multiple times

-- Insert Macau event sources with ON CONFLICT DO NOTHING for idempotency
INSERT INTO sources (id, type, name, url, active, created_at) VALUES
  (
    'mgto',
    'web_scraper',
    'MGTO City Events',
    'https://www.macaotourism.gov.mo/en/events/calendar',
    true,
    now()
  ),
  (
    'londoner',
    'web_scraper',
    'The Londoner Macao Events',
    'https://www.londonermacao.com/macau-events-shows',
    true,
    now()
  ),
  (
    'venetian',
    'web_scraper',
    'The Venetian Macao Entertainment',
    'https://www.venetianmacao.com/entertainment.html',
    true,
    now()
  ),
  (
    'galaxy',
    'web_scraper',
    'Galaxy Macau Events',
    'https://www.galaxymacau.com/ticketing/event-list/',
    true,
    now()
  ),
  (
    'mice',
    'web_scraper',
    'Macao MICE Portal',
    'https://www.mice.gov.mo/en/events.aspx',
    true,
    now()
  ),
  (
    'broadway',
    'web_scraper',
    'Broadway Macau Events',
    'https://www.broadwaymacau.com.mo/upcoming-events-and-concerts/',
    true,
    now()
  )
ON CONFLICT (id) DO NOTHING;

-- Verify the sources were inserted
SELECT id, name, type, url, active FROM sources WHERE id IN ('mgto', 'londoner', 'venetian', 'galaxy', 'mice', 'broadway');