# Smart Calendar App - Security Implementation (Phase 1)

## Security Overview
For Phase 1, the security model is **lightweight but safe**, relying on Supabase Auth and PostgreSQL RLS. It enforces HTTPS, JWT authentication, and basic input validation. Advanced compliance (GDPR export tools, SOC2) is deferred to later phases.

---

## Security Principles
- **HTTPS only** – all traffic encrypted.
- **JWT Authentication** – via Supabase or custom Node.js service.
- **Least Privilege** – per-user data access controlled with RLS.
- **Input Validation** – sanitize inputs, enforce schemas with Zod.
- **Data Minimization** – store only essential fields (no PII beyond name/email/location).

---

## Authentication & Authorization

### Authentication
- Managed by **Supabase Auth**.
- Email/password login.
- JWTs automatically issued and validated.
- Token expiry: 1 hour (refresh handled by Supabase client).

### Authorization
- **Row-Level Security (RLS)** in PostgreSQL:
  - `saved_events.user_id = auth.uid()` ensures users only see their own saved events.
- **Roles**:
  - `user`: default role.
  - `admin`: can manage sources.

---

## Data Protection
- **Passwords**: hashed (Supabase defaults to bcrypt).
- **Database**: encrypted at rest (Supabase Postgres).
- **TLS**: all connections encrypted in transit.
- **Secrets**: stored in environment variables (Vercel/Supabase dashboard).

---

## Rate Limiting
- Basic per-IP limit on API routes:
  - Authenticated: 100 req/min
  - Public: 30 req/min
- Implemented via Vercel Edge Middleware or lightweight Redis (optional).

---

## Input Validation
- **Zod schemas** for API request validation.
- HTML sanitization for event notes.
- Strip unknown fields before persisting.

---

## Logging & Monitoring
- Store authentication + ingestion logs in Postgres.
- Supabase provides built-in audit logs.
- Console error logs for API routes.

---

## Deferred Security Features (Future Phases)
- OAuth (Google/Facebook sign-in)
- Multi-factor authentication (MFA)
- DDoS detection & advanced rate limiting
- Full compliance exports (GDPR/CCPA)
- Token revocation lists, advanced key rotation

---

✅ Phase 1 keeps security **simple but robust**: Supabase Auth, RLS enforcement, HTTPS, and input validation.
