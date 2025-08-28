# Weekend Planner App

A smart calendar application that helps users discover and plan amazing weekend activities by aggregating events from RSS feeds and news sources.

## 🚀 Features

### Phase 1 (MVP) - ✅ Completed
- **User Authentication**: Email/password registration and login with Supabase Auth
- **Smart Calendar**: Month, week, and day views with FullCalendar integration
- **Event Discovery**: Automated event aggregation from RSS feeds and NewsAPI
- **Event Management**: Save/unsave events to personal calendar
- **Search & Filtering**: Advanced filtering by category, location, date, and keywords
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Real-time Updates**: Live event updates with React Query

### Coming Soon (Phase 2)
- **Google Calendar Integration**: Read-only sync with personal Google Calendar
- **Push Notifications**: Browser notifications for upcoming events
- **Enhanced Location**: Geocoding and distance calculations
- **Social Features**: Share events with friends

## 🛠 Tech Stack

- **Frontend**: Next.js 14 with App Router, TypeScript, Tailwind CSS
- **UI Components**: Custom components with Radix UI primitives
- **Calendar**: FullCalendar React integration
- **Authentication**: Supabase Auth with Row Level Security
- **Database**: PostgreSQL via Supabase
- **State Management**: TanStack Query (React Query)
- **Search**: Typesense (planned for Phase 2)
- **Event Sources**: RSS Parser + NewsAPI
- **Deployment**: Vercel + Supabase

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- NewsAPI account (optional, for news-based events)

## 🚀 Quick Start

### 1. Clone and Install
```bash
git clone <repository-url>
cd weekend-planner-app
npm install
```

### 2. Database Setup
1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Run the database setup script in your Supabase SQL Editor:
```sql
-- Copy and run the contents of database/setup.sql
```

### 3. Environment Configuration
1. Copy the environment template:
```bash
cp .env.local.example .env.local
```

2. Fill in your configuration:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEWS_API_KEY=your-newsapi-key
CRON_SECRET=your-secure-random-string
```

### 4. Get API Keys

#### Supabase Setup
1. Go to your Supabase project dashboard
2. Navigate to Settings → API
3. Copy your project URL and anon/public key
4. Copy your service role key (keep this secret!)

#### NewsAPI Setup (Optional)
1. Register at [newsapi.org](https://newsapi.org)
2. Get your free API key
3. Add it to your `.env.local` file

### 5. Run the Application
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 📊 Event Ingestion

The app automatically aggregates events from multiple sources:

### RSS Feeds
- Configure RSS sources in the `sources` table
- Supports standard RSS feeds with event data
- Automatically categorizes and tags events

### NewsAPI
- Searches for event-related news articles
- Converts relevant articles to calendar events
- Filters out non-event content intelligently

### Manual Ingestion
You can trigger event ingestion manually:
```bash
curl -X POST http://localhost:3000/api/cron/ingest-events \
  -H "Authorization: Bearer your-cron-secret"
```

### Automated Ingestion
Set up a cron job or use Vercel cron functions to run ingestion regularly:
- Recommended: Every 6 hours for RSS feeds
- NewsAPI: Once daily (due to rate limits)

## 🗄 Database Schema

### Core Tables
- **users**: User profiles and preferences
- **events**: Aggregated events from all sources
- **saved_events**: User's saved/favorited events
- **sources**: RSS feeds and API configurations
- **ingestion_logs**: Tracking ingestion jobs and errors

### Key Features
- Row Level Security (RLS) for user data
- Automatic timestamps with triggers
- Efficient indexing for search and filtering
- Deduplication based on source and source_id

## 🎨 UI Components

The app follows atomic design principles:

### Atoms
- Button, Input, Badge, Card components
- Consistent styling with class-variance-authority
- Full TypeScript support

### Molecules
- EventCard, FilterChips, DatePicker
- Reusable composite components
- Built-in loading and error states

### Organisms
- CalendarView, EventList, EventFilters
- Complex feature components
- Integrated with data fetching hooks

## 🔧 API Endpoints

### Events
- `GET /api/events` - Fetch events with filtering
- `POST /api/events/saved` - Save an event
- `DELETE /api/events/saved` - Unsave an event
- `GET /api/events/saved` - Get user's saved events

### Admin
- `POST /api/cron/ingest-events` - Manual event ingestion

## 🧪 Testing

### Unit Tests
```bash
npm run test
npm run test:watch
```

### End-to-End Tests
```bash
npm run test:e2e
```

### Type Checking
```bash
npm run type-check
```

## 🚀 Deployment

### Vercel Deployment
1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy with automatic builds

### Environment Variables
Make sure to set these in your production environment:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEWS_API_KEY`
- `CRON_SECRET`

### Scheduled Jobs
Set up Vercel cron functions for automated event ingestion:
```json
{
  "crons": [
    {
      "path": "/api/cron/ingest-events",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

## 🔍 Troubleshooting

### Common Issues

**Events not showing up**
- Check ingestion logs in the database
- Verify RSS feeds are accessible
- Ensure NewsAPI key is valid and has quota

**Authentication issues**
- Verify Supabase project URL and keys
- Check RLS policies are correctly set
- Ensure user confirmation emails are working

**Calendar not loading**
- Check browser console for JavaScript errors
- Verify FullCalendar styles are loading
- Check if events data is being fetched correctly

### Debug Mode
Enable debug logging by setting:
```env
NEXT_PUBLIC_DEBUG=true
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript strict mode
- Use Prettier for code formatting
- Write tests for new features
- Update documentation for significant changes

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🗺 Roadmap

### Phase 2: Enhanced Features
- [ ] Google Calendar integration
- [ ] Push notifications
- [ ] Typesense search implementation
- [ ] Enhanced location services
- [ ] Event recommendations based on user preferences

### Phase 3: Social & AI
- [ ] Social event sharing
- [ ] AI-powered event recommendations
- [ ] Community features
- [ ] Advanced analytics

### Phase 4: Mobile & Advanced
- [ ] React Native mobile app
- [ ] Offline support
- [ ] Advanced integrations (Eventbrite, Meetup, etc.)
- [ ] Premium subscription features

## 🆘 Support

- 📧 Email: support@weekendplanner.app
- 🐛 Issues: [GitHub Issues](https://github.com/your-repo/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/your-repo/discussions)

## 🙏 Acknowledgments

- [Supabase](https://supabase.com) for the amazing backend platform
- [FullCalendar](https://fullcalendar.io) for the calendar component
- [NewsAPI](https://newsapi.org) for news-based event discovery
- [Tailwind CSS](https://tailwindcss.com) for the design system
- [Vercel](https://vercel.com) for hosting and deployment