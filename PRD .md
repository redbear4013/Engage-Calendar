# Product Requirements Document (PRD) – Smart Calendar App (Phase 1 + Phase 1.5)

## Executive Summary

The **Smart Calendar App** is a calendar-first productivity tool with the vision of becoming the leading intelligent calendar.

* **Phase 1 (MVP)**: Deliver a lean event aggregator and calendar with **RSS + NewsAPI events**, simple UI, saved events, and user accounts.
* **Phase 1.5 (Fast-Follow)**: Add **My Tasks (local)**, **Google Calendar read-only sync**, and **browser push reminders** to close the UX gap with established players like Any.do.

---

## Product Vision

To help people discover and manage meaningful activities by combining a central event feed, saved calendar, and simple personal productivity tools — all in one intuitive app.

## Product Mission

Simplify event discovery and personal scheduling with a lightweight web app that grows into a fully smart calendar platform.

---

## Release Targets

* **Phase 1 (MVP)**: Q4 2025
* **Phase 1.5 (Fast-Follow)**: \~1–2 months after MVP

---

## Problem Statement

* **Fragmented discovery**: Local events are spread across websites and news feeds.
* **Manual effort**: Traditional calendars require manual entry.
* **Missed opportunities**: People miss events and forget commitments.
* **Competitor gap**: Existing apps (Any.do) combine tasks + external calendars.

---

## Our Solution

**Phase 1**:

* Aggregate events from **RSS + NewsAPI**.
* Provide **basic calendar & event list**.
* Let users **save/favorite events**.
* **Admin UI** for managing sources.

**Phase 1.5**:

* Add **lightweight “My Tasks”** (local list).
* **Google Calendar read-only integration**.
* **Browser push reminders** for saved events.

---

## Goals & Objectives

### Business Goals

* Launch fast with a lean MVP.
* Validate demand for **event aggregation + calendar view**.
* Grow user base via free tier.

### User Goals

* Save time discovering events.
* Keep personal schedule organized in one app.
* Get reminders without heavy setup.
* Optionally connect their Google Calendar.

---

## User Personas (simplified)

* **Urban Explorer**: wants to find local events easily.
* **Busy Professional**: wants simple reminders + calendar overlay.
* **Lightweight Planner**: wants a minimal task list integrated with events.

---

## User Stories

**Auth & Onboarding**

* As a user, I can register/login with email/password.
* As a user, I can update profile basics (name, city, country).

**Events**

* As a user, I can browse upcoming events (RSS/NewsAPI).
* As a user, I can search/filter events.
* As a user, I can view event details.

**Calendar (Saved Events)**

* As a user, I can save an event to my calendar.
* As a user, I can remove a saved event.

**Tasks (Phase 1.5)**

* As a user, I can create/edit/delete personal tasks.
* As a user, I can see tasks alongside calendar events.

**Google Integration (Phase 1.5)**

* As a user, I can connect my Google Calendar read-only.
* As a user, I can see my Google events overlaid with app events.

**Notifications (Phase 1.5)**

* As a user, I can receive browser push reminders for saved events.

**Admin**

* As an admin, I can add/remove RSS feed sources.
* As an admin, I can trigger ingestion manually.

---

## Functional Requirements

**FR1: User Management**

* Email/password auth (Supabase).
* Profile update.

**FR2: Events**

* Ingest RSS + NewsAPI feeds.
* Normalize and deduplicate.
* Search/filter endpoints.

**FR3: Calendar (Saved Events)**

* CRUD for saved events.
* Calendar UI (month/week/day).

**FR4: Tasks (Phase 1.5)**

* CRUD for tasks.
* Optional due date/time.

**FR5: Google Calendar (Phase 1.5)**

* OAuth PKCE read-only connection.
* Sync upcoming 30 days.
* Overlay events in calendar.

**FR6: Notifications (Phase 1.5)**

* Store PushSubscription.
* Cron job sends notifications 30 min before start.

---

## Non-Functional Requirements

* **Performance**: <3s page load, <200ms API responses.
* **Scalability**: Postgres + Typesense handle 10k+ users.
* **Security**: HTTPS, JWT, RLS, encrypted tokens.
* **Usability**: Responsive PWA, FullCalendar UI.

---

## Tech Stack

* **Frontend**: Next.js + React, Tailwind + shadcn/ui, FullCalendar.
* **Backend**: Next.js API routes / NestJS (monolith).
* **Database**: Supabase Postgres.
* **Search**: Typesense.
* **Jobs**: Vercel cron / Supabase Edge Functions.

---

## Monetization

* **Phase 1/1.5**: Free.
* **Future**: Freemium (premium for AI recs, advanced integrations, group features).

---

## Constraints

* Limited budget + small dev team.
* Must ship MVP in Q4 2025.
* Use compliant sources (RSS, NewsAPI, Google OAuth).

---

## Risks

* API limits (NewsAPI quota, Google Calendar quotas).
* User adoption may hinge on Google integration.
* Push notifications vary by platform (iOS requires PWA install).

---

## Release Criteria

**Phase 1**

* Users can register/login.
* Events appear from RSS/NewsAPI.
* Events can be saved.
* Calendar views work.

**Phase 1.5**

* Tasks module functional.
* Google Calendar read-only works.
* Browser push reminders delivered.

---
