# Macau Daily Integration

## Overview

This document describes the integration of Macau Daily news website into the Weekend Planner App. The system scrapes news articles from the Macau Daily website and converts them into calendar events that appear in the app's upcoming events section.

## Features

### ✅ **Specialized Macau Daily Scraper**
- **Custom Parser**: Tailored specifically for the Macau Daily website structure
- **Chinese Language Support**: Handles Chinese text and content
- **Article Extraction**: Extracts news articles and converts them to events
- **Smart Categorization**: Automatically categorizes events based on Chinese keywords

### ✅ **Event Generation**
- **Future Dates**: Events are scheduled for future dates (next 30 days)
- **Macau Location**: All events are set in Macau with proper coordinates
- **Rich Metadata**: Includes venue, organizer, categories, and tags
- **Fallback System**: Generates sample Macau events if scraping fails

### ✅ **Integration with Calendar**
- **Upcoming Events Panel**: Events appear in the right sidebar of the calendar view
- **Event List**: Events are displayed in the main event list
- **Save Functionality**: Users can save Macau Daily events
- **External Links**: Direct links to original Macau Daily articles

## Technical Implementation

### 1. **Macau Daily Scraper** (`src/lib/macau-daily-scraper.ts`)
```typescript
// Main scraping function
export async function scrapeMacauDailyEvents(): Promise<MacauDailyScrapingResult>

// Article parsing
function parseMacauDailyHTML(html: string): MacauDailyArticle[]

// Event conversion
function convertArticlesToEvents(articles: MacauDailyArticle[]): Partial<Event>[]
```

### 2. **API Endpoint** (`src/app/api/scrape-macau-daily/route.ts`)
- **POST**: Scrape Macau Daily events
- **GET**: Endpoint information
- **Error Handling**: Comprehensive error handling and logging

### 3. **Database Integration**
- **Source Addition**: Macau Daily added as a web_scraper source
- **Event Storage**: Events stored in the events table
- **Automatic Ingestion**: Integrated with existing cron job system

### 4. **Event Categories**
The system automatically categorizes events based on Chinese keywords:

- **教育** (Education) → `education`
- **經濟** (Economy) → `business`
- **體育** (Sports) → `sports`
- **文化** (Culture) → `entertainment`
- **科技** (Technology) → `technology`
- **健康** (Health) → `health`
- **旅遊** (Travel) → `travel`

## Setup Instructions

### 1. **Add the Database Source**
Run the SQL script in your Supabase SQL Editor:
```sql
-- Run database/add-macau-daily-source.sql
INSERT INTO sources (type, name, url, active) VALUES
  ('web_scraper', 'Macau Daily News', 'https://www.macaodaily.com/html/2025-08/28/node_2.htm', true);
```

### 2. **Test the Scraper**
```bash
# Test the API endpoint
curl -X POST http://localhost:3000/api/scrape-macau-daily

# Or run the test script
node scripts/test-macau-daily.js
```

### 3. **Trigger Event Ingestion**
```bash
# Manual ingestion
curl -X POST http://localhost:3000/api/cron/ingest-events

# Or wait for automatic cron job
```

## Event Structure

### **Sample Macau Daily Event**
```json
{
  "id": "uuid",
  "source": "web_scraper",
  "sourceId": "macau_daily_1234567890_1",
  "title": "三局兩巴協作開學安排",
  "description": "News event from Macau Daily: 三局兩巴協作開學安排",
  "longDescription": "This event is based on news from Macau Daily. 三局兩巴協作開學安排 - Stay updated with the latest developments in Macau.",
  "startTime": "2025-01-15T10:00:00.000Z",
  "endTime": "2025-01-15T12:00:00.000Z",
  "timezone": "Asia/Macau",
  "venueName": "Macau",
  "city": "Macau",
  "country": "Macau",
  "lat": 22.1987,
  "lng": 113.5439,
  "categories": ["local_events", "education"],
  "tags": ["macau", "news", "chinese", "scraped"],
  "imageUrl": "https://picsum.photos/400/300?random=101",
  "organizerName": "Macau Daily",
  "externalUrl": "https://www.macaodaily.com/html/2025-08/28/content_1853977.htm",
  "lastSeenAt": "2025-01-14T12:00:00.000Z"
}
```

## User Experience

### **Calendar View**
- Events appear in the main calendar grid
- Color-coded based on save status
- Hover tooltips show event descriptions

### **Upcoming Events Panel**
- Right sidebar shows upcoming Macau Daily events
- Compact view with essential information
- Save/unsave functionality
- Direct links to original articles

### **Event List View**
- Full event details
- Category badges
- Location and time information
- Organizer details

## Error Handling

### **Scraping Failures**
- **Network Issues**: Falls back to sample events
- **Parsing Errors**: Continues with available data
- **Rate Limiting**: Respects website limits
- **Content Changes**: Adapts to HTML structure changes

### **Fallback System**
- **Sample Events**: Generates realistic Macau events
- **Minimum Count**: Always provides at least 10 events
- **Future Dates**: Events scheduled for upcoming dates
- **Rich Content**: Includes venues, descriptions, and metadata

## Monitoring and Maintenance

### **Logging**
- Ingestion logs in database
- Console output for debugging
- Error tracking and reporting

### **Performance**
- Efficient HTML parsing
- Batch processing
- Caching and optimization

### **Updates**
- Regular testing of scraper
- Monitoring for website changes
- Updating selectors as needed

## Future Enhancements

### **Planned Features**
- **Date Parsing**: Extract actual event dates from articles
- **Content Analysis**: AI-powered event categorization
- **Image Extraction**: Get actual images from articles
- **Multi-language**: Support for Portuguese content
- **Real-time Updates**: More frequent scraping

### **Advanced Features**
- **Geocoding**: Automatic location detection
- **Event Deduplication**: Smart duplicate detection
- **User Preferences**: Filter by event types
- **Notifications**: New event alerts

## Troubleshooting

### **Common Issues**

1. **No Events Appearing**
   - Check if source is active in database
   - Verify scraper is working with test endpoint
   - Check ingestion logs for errors

2. **Scraping Failures**
   - Website structure may have changed
   - Network connectivity issues
   - Rate limiting by target website

3. **Event Display Issues**
   - Check event data in database
   - Verify frontend is fetching events
   - Check for JavaScript errors

### **Debug Steps**
1. Test the scraper endpoint directly
2. Check database for events
3. Verify source configuration
4. Review ingestion logs
5. Test frontend event fetching

## Support

For issues or questions about the Macau Daily integration:
1. Check the logs in your database
2. Test the scraper endpoint
3. Review this documentation
4. Check the main web scraper documentation

The Macau Daily integration provides a rich source of events from Macau, enhancing the app's content with local news and events from this unique region.
