const axios = require('axios');

async function testStructuredScraper() {
  console.log('🧪 Testing Macau Daily Structured Scraper...\n');
  
  try {
    // Test the structured scraper endpoint
    const response = await axios.post('http://localhost:3000/api/scrape-macau-daily-structured');
    
    if (response.data.success) {
      console.log('✅ Macau Daily Structured Scraper test successful!');
      console.log(`📊 Found ${response.data.count} events`);
      console.log(`🔍 Source: ${response.data.source}`);
      
      console.log('\n📋 Known Events from ChatGPT Analysis:');
      response.data.knownEvents.forEach((event, index) => {
        console.log(`${index + 1}. ${event}`);
      });
      
      console.log('\n📅 Generated Calendar Events:');
      
      // Show first 3 events as examples
      response.data.events.slice(0, 3).forEach((event, index) => {
        console.log(`\n${index + 1}. ${event.title}`);
        console.log(`   📍 ${event.city}, ${event.country}`);
        console.log(`   🏢 Venue: ${event.venueName}`);
        console.log(`   🏷️  Categories: ${event.categories.join(', ')}`);
        console.log(`   📅 Start: ${new Date(event.startTime).toLocaleString()}`);
        console.log(`   📅 End: ${new Date(event.endTime).toLocaleString()}`);
        console.log(`   🔗 URL: ${event.externalUrl}`);
        console.log(`   🏷️  Tags: ${event.tags.join(', ')}`);
      });
      
      if (response.data.events.length > 3) {
        console.log(`\n... and ${response.data.events.length - 3} more events`);
      }
      
      // Show event distribution
      const cities = [...new Set(response.data.events.map(e => e.city))];
      const categories = [...new Set(response.data.events.flatMap(e => e.categories))];
      
      console.log('\n📊 Event Distribution:');
      console.log(`   🌍 Cities: ${cities.join(', ')}`);
      console.log(`   🏷️  Categories: ${categories.join(', ')}`);
      
    } else {
      console.log('❌ Macau Daily Structured Scraper test failed');
      console.log('Errors:', response.data.errors);
    }
    
  } catch (error) {
    console.log('❌ Test failed with error:');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    } else {
      console.log(error.message);
    }
  }
}

// Run the test
testStructuredScraper();
