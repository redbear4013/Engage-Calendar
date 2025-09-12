#!/usr/bin/env node

/**
 * Manual Macau scraper for testing
 * Usage: npm run scrape:macau [source]
 * Example: npm run scrape:macau mgto
 */

const path = require('path');

async function runScraper() {
  try {
    // This would require a proper Node.js build of our TypeScript scrapers
    // For now, just provide instructions
    console.log('🔍 Macau Event Scraper');
    console.log('');
    console.log('To test the scrapers manually:');
    console.log('1. Start the development server: npm run dev');
    console.log('2. Open your browser to: http://localhost:3000');
    console.log('3. Trigger ingestion via API: curl -X POST http://localhost:3000/api/cron/ingest-events -H "Authorization: Bearer your-cron-secret"');
    console.log('4. Check health: curl http://localhost:3000/api/health');
    console.log('');
    
    const sources = ['mgto', 'londoner', 'venetian', 'galaxy', 'mice'];
    const requestedSource = process.argv[2];
    
    if (requestedSource && !sources.includes(requestedSource)) {
      console.log('❌ Invalid source. Available sources:', sources.join(', '));
      process.exit(1);
    }
    
    if (requestedSource) {
      console.log(`🎯 To test specific source: ${requestedSource}`);
      console.log(`Add "?source=${requestedSource}" to your API calls for targeted testing`);
    } else {
      console.log('📋 Available sources:');
      sources.forEach(source => {
        const urls = {
          mgto: 'https://www.macaotourism.gov.mo/en/events/calendar',
          londoner: 'https://www.londonermacao.com/macau-events-shows',
          venetian: 'https://www.venetianmacao.com/entertainment.html',
          galaxy: 'https://www.galaxymacau.com/ticketing/event-list/',
          mice: 'https://www.mice.gov.mo/en/events.aspx'
        };
        console.log(`  • ${source}: ${urls[source]}`);
      });
    }
    
    console.log('');
    console.log('💡 For development testing, ensure your .env.local has the required keys:');
    console.log('  - NEXT_PUBLIC_SUPABASE_URL');
    console.log('  - SUPABASE_SERVICE_ROLE_KEY'); 
    console.log('  - CRON_SECRET');
    
  } catch (error) {
    console.error('❌ Scraper failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runScraper();
}