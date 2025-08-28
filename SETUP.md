# Weekend Planner App - Setup Guide

This guide will walk you through setting up the Weekend Planner App locally and deploying it to production.

## 🛠 Local Development Setup

### Prerequisites
- Node.js 18+ and npm
- Git
- A text editor (VS Code recommended)

### Step 1: Clone and Install Dependencies

```bash
# Clone the repository
git clone <your-repo-url>
cd weekend-planner-app

# Install dependencies
npm install
```

### Step 2: Set Up Supabase

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Click "Start your project" 
   - Sign up/sign in with GitHub
   - Create a new project
   - Choose a database password and region

2. **Configure Database**
   - Wait for your project to be ready
   - Go to the SQL Editor in your Supabase dashboard
   - Copy the contents of `database/setup.sql`
   - Run the SQL script in the editor

3. **Get API Keys**
   - Navigate to Settings → API
   - Copy your Project URL
   - Copy your anon/public key
   - Copy your service_role key (keep this secret!)

### Step 3: Set Up NewsAPI (Optional)

1. Go to [newsapi.org](https://newsapi.org)
2. Register for a free account
3. Get your API key from the dashboard
4. Note: Free tier has 1000 requests/day limit

### Step 4: Configure Environment Variables

1. **Copy the template:**
   ```bash
   cp .env.local.example .env.local
   ```

2. **Edit `.env.local` with your values:**
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

   # NewsAPI (optional)
   NEWS_API_KEY=your-newsapi-key

   # Cron security
   CRON_SECRET=your-secure-random-string
   ```

### Step 5: Test Your Setup

```bash
# Start the development server
npm run dev

# In another terminal, test the build
npm run build

# Run type checking
npm run type-check

# Run tests
npm test
```

Visit [http://localhost:3000](http://localhost:3000) to see your app!

### Step 6: Add Sample Event Sources

1. Go to your Supabase dashboard
2. Open the Table Editor
3. Navigate to the `sources` table
4. Add some RSS feed sources:

```sql
INSERT INTO sources (type, name, url, active) VALUES
  ('rss', 'Local Events RSS', 'https://example.com/events.rss', true),
  ('newsapi', 'NewsAPI Events', null, true);
```

### Step 7: Test Event Ingestion

```bash
# Test the ingestion endpoint
curl -X POST http://localhost:3000/api/cron/ingest-events \
  -H "Authorization: Bearer your-cron-secret"
```

## 🚀 Production Deployment

### Vercel Deployment

1. **Connect to Vercel**
   - Push your code to GitHub
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Choose "Next.js" framework preset

2. **Set Environment Variables**
   - In your Vercel project dashboard
   - Go to Settings → Environment Variables
   - Add all the same variables from your `.env.local`

3. **Deploy**
   - Click "Deploy"
   - Wait for the build to complete
   - Visit your deployed URL

### Set Up Automated Event Ingestion

Create `vercel.json` in your project root:

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

This runs event ingestion every 6 hours.

### Production Database Setup

1. **Upgrade Supabase Plan (if needed)**
   - For production, consider upgrading from the free tier
   - Go to Settings → Billing in your Supabase dashboard

2. **Set Up Backup**
   - Enable Point-in-Time Recovery
   - Set up automated backups

3. **Review RLS Policies**
   - Ensure Row Level Security is properly configured
   - Test with different user accounts

## 🔧 Advanced Configuration

### Custom RSS Sources

Add RSS feeds to your `sources` table:

```sql
INSERT INTO sources (type, name, url, active) VALUES
  ('rss', 'Eventbrite Local', 'https://www.eventbrite.com/rss/organizer_list_events/YOUR_ID', true),
  ('rss', 'Meetup Events', 'https://secure.meetup.com/topics/tech/rss', true),
  ('rss', 'Facebook Events', 'https://facebook.com/events/feed', true);
```

### Email Configuration (Optional)

To enable user confirmation emails:

1. Go to Authentication → Settings in Supabase
2. Configure SMTP settings or use Supabase's built-in email service
3. Customize email templates

### Analytics Setup (Optional)

1. **Vercel Analytics**
   ```bash
   npm install @vercel/analytics
   ```

2. **Add to your layout:**
   ```tsx
   import { Analytics } from '@vercel/analytics/react'
   
   export default function RootLayout({ children }) {
     return (
       <html>
         <body>
           {children}
           <Analytics />
         </body>
       </html>
     )
   }
   ```

## 🐛 Troubleshooting

### Common Issues

**Build Errors**
```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

**Database Connection Issues**
- Double-check your Supabase URL and keys
- Ensure your IP is not blocked (Supabase allows all by default)
- Check if your project is paused (free tier auto-pauses)

**Environment Variables Not Working**
- Restart your development server after changing `.env.local`
- Ensure no spaces around the `=` sign in environment variables
- Check that variables start with `NEXT_PUBLIC_` for client-side access

**Event Ingestion Failing**
- Check the `ingestion_logs` table for error messages
- Verify RSS feed URLs are accessible
- Check NewsAPI key validity and quota

### Getting Help

- Check the console for error messages
- Look at the `ingestion_logs` table for ingestion issues
- Verify your Supabase project is active and accessible
- Check that all environment variables are correctly set

### Development Tips

1. **Use the Supabase Dashboard**
   - Monitor database activity
   - Check logs and performance
   - Manage users and data

2. **Enable Debug Mode**
   ```env
   NEXT_PUBLIC_DEBUG=true
   ```

3. **Monitor Event Ingestion**
   ```sql
   SELECT * FROM ingestion_logs ORDER BY created_at DESC LIMIT 10;
   ```

4. **Check Event Data**
   ```sql
   SELECT COUNT(*), source FROM events GROUP BY source;
   ```

## ✅ Verification Checklist

- [ ] App loads at `http://localhost:3000`
- [ ] User registration works
- [ ] User login works  
- [ ] Calendar displays properly
- [ ] Events are visible (after ingestion)
- [ ] Save/unsave event functionality works
- [ ] Search and filtering works
- [ ] Event ingestion API responds
- [ ] Build completes without errors
- [ ] Tests pass
- [ ] TypeScript checks pass

Once everything is working locally, you're ready to deploy to production!