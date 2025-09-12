#!/usr/bin/env node

const axios = require('axios');

async function testWebScraper() {
  try {
    console.log('Testing web scraper API...');
    
    const response = await axios.post('http://localhost:3000/api/scrape-website', {
      url: 'https://supabase.com/dashboard/project/susyqfqdkliftccgygjz/editor/17437?schema=public',
      sourceName: 'Supabase Events',
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
    
    console.log('✅ Web scraper test successful!');
    console.log(`Found ${response.data.count} events`);
    console.log('Sample event:', response.data.events[0]);
    
  } catch (error) {
    console.error('❌ Web scraper test failed:', error.response?.data || error.message);
  }
}

// Run the test
testWebScraper();
