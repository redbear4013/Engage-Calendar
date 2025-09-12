const { createClient } = require('@supabase/supabase-js');

// You'll need to set these environment variables or replace with your actual values
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addMacauDailySource() {
  console.log('🚀 Adding Macau Daily source to database...\n');
  
  try {
    // First, check if the source already exists
    const { data: existingSource, error: checkError } = await supabase
      .from('sources')
      .select('*')
      .eq('url', 'https://www.macaodaily.com/html/2025-08/28/node_2.htm')
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking existing source:', checkError);
      return;
    }

    if (existingSource) {
      console.log('✅ Macau Daily source already exists:');
      console.log(`   ID: ${existingSource.id}`);
      console.log(`   Name: ${existingSource.name}`);
      console.log(`   Type: ${existingSource.type}`);
      console.log(`   Active: ${existingSource.active}`);
      console.log(`   URL: ${existingSource.url}`);
      return;
    }

    // Add the new source
    const { data, error } = await supabase
      .from('sources')
      .insert({
        type: 'web_scraper',
        name: 'Macau Daily News',
        url: 'https://www.macaodaily.com/html/2025-08/28/node_2.htm',
        active: true
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to add Macau Daily source:', error);
      
      // If it's a constraint error, try to update the database schema
      if (error.message.includes('check constraint') || error.message.includes('sources_type_check')) {
        console.log('\n🔧 Attempting to fix database schema...');
        console.log('   You need to run the database update script:');
        console.log('   database/add-macau-daily-source-updated.sql');
        console.log('\n   Or manually update your database constraints to include "web_scraper"');
      }
      return;
    }

    console.log('✅ Successfully added Macau Daily source to database:');
    console.log(`   ID: ${data.id}`);
    console.log(`   Name: ${data.name}`);
    console.log(`   Type: ${data.type}`);
    console.log(`   Active: ${data.active}`);
    console.log(`   URL: ${data.url}`);
    
    console.log('\n🎯 Next steps:');
    console.log('   1. Test the scraper: curl -X POST http://localhost:3001/api/scrape-macau-daily-structured');
    console.log('   2. Trigger event ingestion: curl -X POST http://localhost:3001/api/cron/ingest-events');
    console.log('   3. Check your calendar app for Macau Daily events!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Run the function
addMacauDailySource();
