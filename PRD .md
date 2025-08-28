
# Product Requirements Document (PRD) – Phase 1

## Executive Summary

The **Smart Calendar App** is an intelligent scheduling application with the long-term vision of proactively suggesting personalized activities and becoming the leading intelligent calendar.
**Phase 1** will focus on a simple foundation: providing users with a clean calendar and event list populated from basic public sources. This ensures early validation of user interest and a scalable base for future advanced features.

---

## Product Overview

### Product Vision

To be the leading smart calendar that helps people discover and schedule meaningful activities.

### Phase 1 Mission

Deliver a **minimal but functional event calendar** that aggregates events from public feeds and news sources, allowing users to explore and save events in a simple, intuitive UI.

### Target Release

* MVP: Q4 2025

---

## Problem Statement

Current problems users face:

* Difficulty finding local activities without searching multiple websites
* Manual entry required in most calendar apps
* Missed events due to fragmented discovery channels

**Phase 1 Solution:**

* Aggregate events from **RSS feeds** and **NewsAPI** into a central calendar
* Provide a **clean event list + calendar UI** for browsing and saving events
* Support **user accounts** for personalization (favorites, filters), but **no AI recommendations yet**

---

## Goals & Objectives

### Business Goals

* Launch MVP quickly with simple, reliable event aggregation
* Validate demand for local event discovery in a calendar-first interface
* Build user base with **free access**

### User Goals

* Save time by seeing all events in one place
* Quickly browse and filter events
* Keep track of chosen activities in a personal calendar

---

## User Personas

**General City Users** (broad persona for Phase 1)

* Age: 18–50
* Location: Urban or suburban
* Needs: Discover local events easily, save them to a personal calendar, avoid missing opportunities
* Pain Points: Too many scattered event sources, manual calendar entry, lack of central view

---

## User Stories

* As a user, I want to sign up and manage a basic profile
* As a user, I want to see a list/calendar of upcoming events aggregated from public feeds
* As a user, I want to mark/save events to my personal view
* As a user, I want to filter events by date and category
* As a user, I want to search events easily

---

## Functional Requirements

**FR1: User Management**

* Email/password sign-up
* Basic profile (name, location)
* Event favorites

**FR2: Calendar Interface**

* Calendar in **month/week/day view**
* Event list view
* Display events from feeds

**FR3: Event Aggregation**

* RSS feed integration
* NewsAPI integration
* Normalize data into unified schema (title, date, location, description, source URL)

**FR4: Filtering/Search**

* Filter by category/date
* Keyword search

---

## Non-Functional Requirements

* **Performance:** Page load <3s
* **Security:** HTTPS, JWT authentication, bcrypt password storage
* **Usability:** Simple, mobile-responsive design, clean interface
* **Scalability:** Ready to expand data sources later

---

## Tech Stack (Phase 1)

* **Frontend:** Next.js + React, Tailwind UI
* **Backend:** Node.js (NestJS)
* **Database:** Supabase / Postgres
* **Search:** Typesense
* **Calendar UI:** FullCalendar
* **Hosting:** Vercel (frontend), Supabase (backend/db)

---

## Monetization

* **Phase 1:** Free app
* **Future Phases:** Premium subscriptions for AI-powered recommendations, integrations, and advanced features

---

## Constraints & Risks

* Small dev team, limited budget
* Reliance on availability of RSS feeds and NewsAPI
* MVP must remain simple, avoid scope creep

---

## Release Criteria – Phase 1

* Users can create an account
* Calendar and event list populated from RSS & NewsAPI
* Events searchable & filterable
* Events can be favorited/saved
* Stable deployment with <3s load time

---

👉 This rewritten PRD keeps **the long-term vision intact**, but **Phase 1 is lean, testable, and achievable** with your specified stack.
