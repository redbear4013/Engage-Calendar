# Smart Calendar App - REST API Specifications (Phase 1)

## API Overview

The Smart Calendar App API follows RESTful design principles with clear resource-based URLs, HTTP methods, and standardized response formats. All endpoints require HTTPS and return JSON responses.

### Base Configuration
- **Base URL**: `https://api.smartcalendar.com/v1`
- **Authentication**: JWT Bearer tokens (Supabase/Auth service)
- **Content-Type**: `application/json`
- **Rate Limiting**: 100 requests/min per user
- **API Version**: v1

### Standard Response Format
```json
{
  "success": true,
  "data": {...},
  "message": "Success message",
  "timestamp": "2025-08-28T10:30:00Z"
}
```

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  },
  "timestamp": "2025-08-28T10:30:00Z"
}
```

---

## Authentication & User Management API

### POST /auth/register
Register a new user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe",
  "city": "Macau",
  "country": "MO"
}
```

### POST /auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

### GET /users/me
Get the current user profile.

### PUT /users/me
Update basic profile fields (name, city, country).

---

## Event APIs

### GET /events
Fetch events aggregated from **RSS feeds** and **NewsAPI**.

**Query Parameters:**
- `q`: keyword search
- `from`: start date (ISO 8601)
- `to`: end date (ISO 8601)
- `city`: filter by city
- `categories`: comma-separated list of categories (`local_events`, `personal_activities`, `educational_content`)
- `limit`: default 20, max 100
- `offset`: for pagination

### GET /events/{event_id}
Fetch a single event by ID.

---

## Calendar APIs

### GET /me/saved-events
List events saved by the authenticated user.

### POST /me/saved-events
Save an event to the user’s personal calendar.
```json
{
  "event_id": "evt_123",
  "note": "Looks fun!"
}
```

### DELETE /me/saved-events/{saved_id}
Remove a saved event.

---

## Admin APIs (RSS/NewsAPI Sources)

### GET /admin/sources
List configured sources (RSS feeds).

### POST /admin/sources
Add a new RSS feed source.
```json
{
  "name": "HK Local Events",
  "url": "https://example.com/events.rss",
  "active": true
}
```

### PUT /admin/sources/{source_id}
Update or deactivate an RSS source.

### POST /admin/ingest/run
Trigger a manual ingestion job from RSS/NewsAPI.

**Request Body:**
```json
{
  "sources": ["src_123", "src_456"],
  "mode": "incremental"
}
```

---

## Deferred for Future Phases
- Recommendations API (daily suggestions, feedback)
- Notifications API (push/email reminders)
- Analytics API (user stats, BI dashboards)
- External integrations (Eventbrite, Meetup, Google Maps)
- OAuth login (Google/Facebook)

## Phase 1.5 – Fast-Follow Additions

### Google Calendar (Read-Only)
**Goal:** show a user’s primary Google Calendar inside the app (no write access).

**Auth Flow**
- OAuth 2.0 (PKCE), scope: `https://www.googleapis.com/auth/calendar.readonly`.

**Endpoints**
- `GET /oauth/google/start` → redirect to Google consent (PKCE).
- `GET /oauth/google/callback` → exchange code for tokens; create/update provider account.
- `POST /integrations/google/sync` → on-demand fetch of upcoming events (next 30 days).
- `GET /integrations/google/primary-events` → list cached read-only events (flagged `source: "google"`).

**Notes**
- Store access+refresh tokens encrypted; background refresh handled by job/edge function.
- No Google creates/edits in Phase 1.5.

### Web Push (Saved-Event Reminders)
**Goal:** browser notifications ~30 minutes before a saved event starts.

**Service Worker**
- `/sw.js` with `push` + `notificationclick` handlers.

**Endpoint**
- `POST /me/notifications/subscribe`  
  Body: the browser PushSubscription JSON (store per-user with an `app` “web”).

### My Tasks (Local-only)
**Goal:** lightweight tasks list stored in our DB (not synced to Google).

**Endpoints**
- `GET /me/tasks`
- `POST /me/tasks`  `{ "title": string, "due_at"?: ISO8601, "notes"?: string }`
- `PUT /me/tasks/{taskId}`
- `DELETE /me/tasks/{taskId}`
