#!/usr/bin/env node

/**
 * Seed Macau event sources into the database
 * Usage: npm run seed:sources
 */

const { execSync } = require('child_process');
const path = require('path');

async function seedSources() {
  try {
    console.log('🌱 Seeding Macau event sources...');
    
    // Load environment variables
    require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing Supabase environment variables');
      console.log('Make sure you have NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env.local');
      process.exit(1);
    }
    
    console.log('📍 Using Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    
    // For now, just show the SQL that should be run
    console.log('🔄 Run the following SQL in your Supabase SQL Editor:');
    console.log('');
    console.log('-- Insert Macau event sources');
    console.log(`INSERT INTO sources (id, type, name, url, active, created_at) VALUES
  ('mgto', 'web_scraper', 'MGTO City Events', 'https://www.macaotourism.gov.mo/en/events/calendar', true, now()),
  ('londoner', 'web_scraper', 'The Londoner Macao Events', 'https://www.londonermacao.com/macau-events-shows', true, now()),
  ('venetian', 'web_scraper', 'The Venetian Macao Entertainment', 'https://www.venetianmacao.com/entertainment.html', true, now()),
  ('galaxy', 'web_scraper', 'Galaxy Macau Events', 'https://www.galaxymacau.com/ticketing/event-list/', true, now()),
  ('mice', 'web_scraper', 'Macao MICE Portal', 'https://www.mice.gov.mo/en/events.aspx', true, now())
ON CONFLICT (id) DO NOTHING;`);
    console.log('');
    console.log('✅ Or you can run: cat database/seed-macau-sources.sql | psql [your-db-connection]');
    
  } catch (error) {
    console.error('❌ Failed to seed sources:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  seedSources();
}

module.exports = { seedSources };