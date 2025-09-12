#!/usr/bin/env node

const axios = require('axios');

async function testWebScraper() {
  console.log('🧪 Testing Web Scraper...\n');
  
  try {
    // Test the web scraper API
    console.log('1. Testing web scraper API endpoint...');
    
    const response = await axios.post('http://localhost:3000/api/scrape-website', {
      url: 'https://supabase.com/dashboard/project/susyqfqdkliftccgygjz/editor/17437?schema=public',
      sourceName: 'Supabase Events Test',
      selectors: {
        eventContainer: '.event-item, .event, [data-event]',
        title: 'h1, h2, h3, .event-title, .title',
        description: '.description, .summary, .event-description',
        venue: '.venue, .location, .event-venue',
        city: '.city, .event-city, [data-city]',
        country: '.country, .event-country, [data-country]',
        image: 'img, .event-image, [data-image]',
        link: 'a, .event-link, [data-link]',
        organizer: '.organizer, .event-organizer, [data-organizer]'
      }
    });
    
    console.log('✅ API Response:');
    console.log(`   Status: ${response.status}`);
    console.log(`   Success: ${response.data.success}`);
    console.log(`   Events Found: ${response.data.count}`);
    console.log(`   Source: ${response.data.source}`);
    
    if (response.data.events && response.data.events.length > 0) {
      console.log('\n📅 Sample Event:');
      const sampleEvent = response.data.events[0];
      console.log(`   Title: ${sampleEvent.title}`);
      console.log(`   Description: ${sampleEvent.description}`);
      console.log(`   Start Time: ${sampleEvent.startTime}`);
      console.log(`   Venue: ${sampleEvent.venueName}`);
      console.log(`   City: ${sampleEvent.city}`);
      console.log(`   Categories: ${sampleEvent.categories?.join(', ')}`);
    }
    
    // Test event ingestion
    console.log('\n2. Testing event ingestion...');
    
    const ingestionResponse = await axios.get('http://localhost:3000/api/cron/ingest-events', {
      headers: {
        'Authorization': 'Bearer dev-secret'
      }
    });
    
    console.log('✅ Ingestion Response:');
    console.log(`   Status: ${ingestionResponse.status}`);
    console.log(`   Success: ${ingestionResponse.data.success}`);
    console.log(`   Events Processed: ${ingestionResponse.data.eventsProcessed}`);
    console.log(`   Events Added: ${ingestionResponse.data.eventsAdded}`);
    console.log(`   Events Updated: ${ingestionResponse.data.eventsUpdated}`);
    console.log(`   Stale Events Removed: ${ingestionResponse.data.staleEventsRemoved}`);
    
    if (ingestionResponse.data.errors && ingestionResponse.data.errors.length > 0) {
      console.log('\n⚠️  Errors:');
      ingestionResponse.data.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.response) {
      console.error('   Response Status:', error.response.status);
      console.error('   Response Data:', error.response.data);
    }
    
    console.log('\n💡 Troubleshooting tips:');
    console.log('   1. Make sure your Next.js app is running on localhost:3000');
    console.log('   2. Check that the web scraper API route is accessible');
    console.log('   3. Verify your database connection and schema');
    console.log('   4. Check the console for any error messages');
  }
}

// Run the test
testWebScraper();
