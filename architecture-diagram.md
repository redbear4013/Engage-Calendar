# Weekend Planner App - Scraping to Calendar Architecture

```mermaid
graph TD
    %% Source Websites
    A1[🌐 MGTO Website<br/>macaotourism.gov.mo] --> B1[🕷️ MGTO Scraper]
    A2[🌐 Venetian Website<br/>venetianmacao.com] --> B2[🕷️ Sands Scraper]
    A3[🌐 Galaxy Website<br/>galaxymacau.com] --> B3[🕷️ Galaxy Scraper]
    A4[🌐 MICE Website<br/>mice.gov.mo] --> B4[🕷️ MICE Scraper]
    A5[🌐 RSS Feeds] --> B5[📡 RSS Parser]
    A6[🌐 NewsAPI] --> B6[📰 NewsAPI Client]

    %% Scrapers and Parsers
    B1 --> C1[🎯 CSS Selector<br/>.cx-col-xl-3.cx-col-lg-4.cx-div]
    B2 --> C2[🎯 CSS Selector<br/>September div patterns]
    B3 --> C3[🎯 CSS Selector<br/>.event-card]
    B4 --> C4[🎯 CSS Selector<br/>.event-item]
    B5 --> C5[📋 XML Parser]
    B6 --> C6[🔗 API Response]

    %% Text Processing
    C1 --> D1[🧹 Text Cleaning<br/>Normalize whitespace<br/>Extract event info]
    C2 --> D2[🧹 Text Cleaning<br/>Deduplicate events]
    C3 --> D3[🧹 Text Cleaning<br/>Extract descriptions]
    C4 --> D4[🧹 Text Cleaning<br/>Parse event data]
    C5 --> D5[🧹 Text Cleaning<br/>RSS item parsing]
    C6 --> D6[🧹 Text Cleaning<br/>JSON processing]

    %% Regex Pattern Matching
    D1 --> E1[🔍 Regex Patterns<br/>Pattern 1: Major Event [Date] [Title]<br/>Pattern 2: [Date] [Title]<br/>Pattern 3: Public Holiday [Date] [Title]]
    D2 --> E2[🔍 Date Extraction<br/>Sep 20-21, 2025 patterns]
    D3 --> E3[🔍 Event Details<br/>Title, venue, tickets]
    D4 --> E4[🔍 MICE Parsing<br/>Business event formats]
    D5 --> E5[🔍 RSS Fields<br/>title, description, pubDate]
    D6 --> E6[🔍 News Fields<br/>headline, content, publishedAt]

    %% Date Processing
    E1 --> F1[📅 Macau Date Parser<br/>Convert to UTC<br/>Handle timezones<br/>Asia/Macau → UTC]
    E2 --> F1
    E3 --> F1
    E4 --> F1
    E5 --> F2[📅 Standard Date Parser<br/>ISO 8601 → UTC]
    E6 --> F2

    %% Event Normalization
    F1 --> G[🔄 Event Normalization<br/>Create RawEvent objects<br/>Generate source_id<br/>Categorize events<br/>Validate data]
    F2 --> G

    %% Coordination and Rate Limiting
    G --> H[⚙️ Macau Coordinator<br/>Rate limiting (0.5-1 req/sec)<br/>Error handling<br/>Retry logic<br/>Batch processing]

    %% Database Operations
    H --> I[🗄️ Event Ingestion Service<br/>ingestEventsFromAllSources()]

    I --> J[🔄 Database Upsert<br/>ON CONFLICT (source, source_id)<br/>DO UPDATE SET ...<br/>Deduplication logic]

    %% Database Storage
    J --> K[(🗃️ Supabase PostgreSQL<br/>Table: events<br/>- id, source, source_id<br/>- title, description<br/>- start_time_utc, end_time_utc<br/>- venue_name, city<br/>- categories, tags<br/>- image_url, external_url)]

    %% API Layer
    K --> L[🔌 Next.js API Routes<br/>/api/events<br/>/api/cron/ingest-events<br/>/api/events/saved]

    %% Frontend Data Fetching
    L --> M[🔄 TanStack Query<br/>Server state management<br/>Real-time updates<br/>Caching & invalidation]

    %% Calendar Display
    M --> N[📅 FullCalendar Component<br/>Event rendering<br/>Month/week/day views<br/>Interactive controls]

    %% User Interface
    N --> O[🖥️ Calendar Interface<br/>- Event cards with details<br/>- Save/unsave functionality<br/>- Category filtering<br/>- Real-time updates]

    %% User Interactions
    O --> P[👤 User Actions<br/>- View event details<br/>- Save to favorites<br/>- Filter by category<br/>- Navigate dates]

    %% Real-time Updates
    P --> Q[🔄 Real-time Sync<br/>Supabase subscriptions<br/>Live event updates<br/>Automatic refresh]

    Q --> N

    %% Automation
    R[⏰ Vercel Cron Jobs<br/>Every 6 hours<br/>0 */6 * * *] --> I

    %% Error Handling & Monitoring
    S[⚠️ Error Handling<br/>- ScraperError types<br/>- Retry mechanisms<br/>- Logging system<br/>- Health checks] --> H
    S --> I
    S --> L

    %% Styling
    classDef website fill:#e1f5fe
    classDef scraper fill:#f3e5f5
    classDef processing fill:#fff3e0
    classDef database fill:#e8f5e8
    classDef frontend fill:#fce4ec
    classDef user fill:#f1f8e9

    class A1,A2,A3,A4,A5,A6 website
    class B1,B2,B3,B4,B5,B6,C1,C2,C3,C4,C5,C6 scraper
    class D1,D2,D3,D4,D5,D6,E1,E2,E3,E4,E5,E6,F1,F2,G,H processing
    class I,J,K database
    class L,M,N,O frontend
    class P,Q user
```

## Key Components Breakdown

### 🕷️ **Scraping Layer**
- **Multiple Sources**: MGTO, Venetian, Galaxy, MICE, RSS feeds, NewsAPI
- **Rate Limiting**: 0.5-1 requests/second to respect websites
- **CSS Selectors**: Target specific event containers on each site
- **Error Handling**: Retries, timeouts, fallback strategies

### 🔍 **Parsing Layer**
- **Regex Patterns**: Extract titles, dates, venues from raw HTML text
- **Text Cleaning**: Normalize whitespace, handle newlines
- **Date Processing**: Convert Macau timezone to UTC
- **Categorization**: Auto-categorize events (festivals, concerts, etc.)

### 🗄️ **Storage Layer**
- **PostgreSQL**: Supabase database with RLS policies
- **Deduplication**: Unique constraint on (source, source_id)
- **Upsert Logic**: Update existing events, insert new ones
- **Data Integrity**: Validation and error handling

### 🖥️ **Frontend Layer**
- **FullCalendar**: Interactive calendar with month/week/day views
- **TanStack Query**: Real-time data synchronization
- **User Features**: Save events, category filtering, responsive design

### ⏰ **Automation**
- **Cron Jobs**: Automatic ingestion every 6 hours
- **Health Monitoring**: API endpoints for status checking
- **Error Recovery**: Graceful handling of scraping failures

## Data Flow Example

```
🌐 MGTO Website
    ↓ (HTTP Request)
🕷️ MGTO Scraper finds: "Major Event Sep 5-28 23rd Macao City Fringe Festival"
    ↓ (CSS Selector: .cx-col-xl-3.cx-col-lg-4.cx-div)
🔍 Regex Pattern 1 matches → title="23rd Macao City Fringe Festival", date="Sep 5-28"
    ↓ (parseMacauDate())
📅 Converts to UTC: start="2025-09-04T16:00:00Z", end="2025-09-27T18:00:00Z"
    ↓ (createSourceId())
🔄 Creates RawEvent with source_id="macaotourism.gov.mo-abc123"
    ↓ (Database upsert)
🗃️ Stores in PostgreSQL events table
    ↓ (API /api/events)
🔌 Frontend fetches via TanStack Query
    ↓ (FullCalendar rendering)
📅 Displays on calendar with save/unsave buttons
    ↓ (User interaction)
👤 User sees "23rd Macao City Fringe Festival" on Sep 5-28
```

This architecture ensures reliable, automated event ingestion with real-time updates and a responsive user interface.