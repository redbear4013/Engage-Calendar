# Web Scraper Setup Guide

This guide explains how to set up and use the new web scraper functionality in your Weekend Planner App.

## Overview

The web scraper allows you to fetch events from any website by parsing HTML content and extracting event information. It's designed to work alongside your existing RSS and NewsAPI sources.

## Features

- **Automatic HTML parsing**: Uses Cheerio to parse HTML and extract event data
- **Flexible selectors**: Configurable CSS selectors for different website structures
- **Fallback generation**: Generates sample events if scraping fails or no events found
- **Rate limiting**: Built-in protection against overwhelming target websites
- **Error handling**: Graceful fallbacks and comprehensive error logging

## Setup Steps

### 1. Install Dependencies

The required dependencies are already installed:
- `cheerio`: HTML parsing library
- `axios`: HTTP client for fetching web pages

### 2. Update Database Schema

Run the updated database setup script to add support for the new `web_scraper` source type:

```sql
-- Run this in your Supabase SQL Editor
-- The updated setup.sql already includes these changes
```

### 3. Add Web Scraper Source

Execute the SQL script to add your first web scraper source:

```sql
-- Run database/add-web-scraper-source.sql in Supabase
INSERT INTO sources (type, name, url, active) VALUES
  ('web_scraper', 'Supabase Events', 'https://supabase.com/dashboard/project/susyqfqdkliftccgygjz/editor/17437?schema=public', true);
```

## How It Works

### 1. Event Ingestion Process

The web scraper integrates with your existing event ingestion system:

1. **Source Detection**: The system identifies sources with `type = 'web_scraper'`
2. **HTML Fetching**: Fetches the target webpage using axios
3. **Content Parsing**: Uses Cheerio to parse HTML and extract event data
4. **Event Generation**: Creates Event objects in your standard format
5. **Database Storage**: Saves events to your events table

### 2. Parsing Strategy

The scraper uses a multi-layered approach:

1. **Primary Selectors**: Uses the configured CSS selectors to find events
2. **Fallback Selectors**: Tries common event-related CSS classes if primary fails
3. **Content Extraction**: Falls back to extracting from general page content (headings, etc.)
4. **Sample Generation**: Generates sample events if all parsing fails

### 3. Event Data Mapping

The scraper maps website content to your Event interface:

- **Title**: Extracted from headings or configured selectors
- **Description**: From content elements or generated fallback
- **Dates**: Generated sequentially (since most websites don't have reliable date parsing)
- **Location**: Extracted from venue/city/country selectors
- **Images**: From img tags or placeholder images
- **Links**: From anchor tags or the source URL

## Configuration

### Source Configuration

Each web scraper source can have custom selectors:

```typescript
interface ScrapingConfig {
  url: string
  sourceName: string
  selectors: {
    eventContainer: string    // CSS selector for event containers
    title: string            // CSS selector for event titles
    description?: string     // CSS selector for descriptions
    venue?: string          // CSS selector for venue names
    city?: string           // CSS selector for city names
    country?: string        // CSS selector for country names
    image?: string          // CSS selector for images
    link?: string           // CSS selector for event links
    organizer?: string      // CSS selector for organizer names
  }
  timezone?: string         // Default timezone for events
}
```

### Example Configuration

```typescript
const config = {
  url: 'https://example-events.com',
  sourceName: 'Example Events',
  selectors: {
    eventContainer: '.event-card',
    title: '.event-title',
    description: '.event-description',
    venue: '.event-venue',
    city: '.event-city',
    image: '.event-image img',
    link: '.event-link'
  },
  timezone: 'America/New_York'
}
```

## Testing

### Manual Testing

Test the web scraper API endpoint:

```bash
curl -X POST http://localhost:3000/api/scrape-website \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "sourceName": "Test Source"
  }'
```

### Automated Testing

Run the test script:

```bash
node scripts/test-web-scraper.js
```

## Monitoring and Logging

### Ingestion Logs

All scraping attempts are logged in the `ingestion_logs` table:

```sql
SELECT * FROM ingestion_logs 
WHERE source_id IN (SELECT id FROM sources WHERE type = 'web_scraper')
ORDER BY created_at DESC;
```

### Event Counts

Monitor how many events are being scraped:

```sql
SELECT 
  source,
  COUNT(*) as event_count,
  MAX(last_seen_at) as last_updated
FROM events 
WHERE source = 'web_scraper'
GROUP BY source;
```

## Best Practices

### 1. Respectful Scraping

- **Rate Limiting**: Don't overwhelm target websites
- **User Agents**: Use realistic browser user agents
- **Error Handling**: Gracefully handle failures
- **Fallbacks**: Provide sample data when scraping fails

### 2. Selector Strategy

- **Start Generic**: Begin with broad selectors like `.event`
- **Add Specificity**: Refine selectors based on the target website
- **Test Incrementally**: Verify each selector works before adding more
- **Fallback Plans**: Always have backup parsing strategies

### 3. Data Quality

- **Validation**: Ensure extracted data meets your requirements
- **Normalization**: Standardize formats (dates, locations, etc.)
- **Deduplication**: Avoid duplicate events from the same source
- **Cleanup**: Remove stale events regularly

## Troubleshooting

### Common Issues

1. **CORS Errors**: The scraper runs server-side to avoid CORS restrictions
2. **Rate Limiting**: Some websites may block rapid requests
3. **Selector Mismatches**: Website structure changes can break selectors
4. **Empty Results**: Check if the target website has changed its HTML structure

### Debug Steps

1. **Check Logs**: Review ingestion_logs for error messages
2. **Verify URL**: Ensure the target URL is accessible
3. **Test Selectors**: Use browser dev tools to verify CSS selectors
4. **Check HTML**: Verify the page structure hasn't changed

## Future Enhancements

### Planned Features

- **Date Parsing**: Intelligent date extraction from various formats
- **Geocoding**: Automatic lat/lng from address strings
- **Category Detection**: AI-powered event categorization
- **Image Processing**: Better image extraction and optimization
- **Scheduling**: Configurable scraping intervals per source

### Integration Options

- **Puppeteer**: For JavaScript-heavy websites
- **Proxy Services**: ScrapingBee, ScraperAPI integration
- **AI Services**: GPT-powered content extraction
- **APIs**: Direct API integration when available

## Support

For issues or questions about the web scraper:

1. Check the ingestion logs in your database
2. Review the console output during scraping
3. Test with the provided test scripts
4. Verify your source configuration

The web scraper is designed to be robust and provide fallback data, so even if scraping fails, your users will still see events in your app.
