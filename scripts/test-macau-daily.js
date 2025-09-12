const axios = require('axios');

async function testMacauDailyScraper() {
  console.log('🧪 Testing Macau Daily Scraper...\n');
  
  try {
    // Test the API endpoint
    const response = await axios.post('http://localhost:3000/api/scrape-macau-daily');
    
    if (response.data.success) {
      console.log('✅ Macau Daily scraper test successful!');
      console.log(`📊 Found ${response.data.count} events`);
      console.log('\n📋 Sample events:');
      
      // Show first 3 events as examples
      response.data.events.slice(0, 3).forEach((event, index) => {
        console.log(`\n${index + 1}. ${event.title}`);
        console.log(`   📍 ${event.city}, ${event.country}`);
        console.log(`   🏷️  Categories: ${event.categories.join(', ')}`);
        console.log(`   📅 Start: ${new Date(event.startTime).toLocaleString()}`);
        console.log(`   🔗 URL: ${event.externalUrl}`);
      });
      
      if (response.data.events.length > 3) {
        console.log(`\n... and ${response.data.events.length - 3} more events`);
      }
      
    } else {
      console.log('❌ Macau Daily scraper test failed');
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
testMacauDailyScraper();
