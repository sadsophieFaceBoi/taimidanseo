# táimidanseo – Delivery Plan (2 hours/night)

Last updated: 2025-11-15  
Version: 0.1 (MVP path)

This plan assumes ~10 hours/week (2h x 5 nights). Use AI to scaffold code, tests, and IaC.

## Milestones
- M0: Project scaffold + CI (Week 1)
- M1: Auth + basic map + venues read (Week 2)
- M2: Businesses onboarding + staff link (Week 3)
- M3: Staff presence (TTL) + realtime (Week 4)
- M4: User check-ins (TTL) + realtime (Week 5)
- M5: Groups & events + moderation basics (Week 6)
- M6: Polish, observability, docs, soft launch (Week 7)

## Week-by-week (nightly tasks)

Week 1 – Foundation
- Night 1: Create mono-repo structure (apps/web, api, infra). Initialize Next.js app (TypeScript, Tailwind, TanStack Query, Zustand, TanStack Router). Lint/format.
- Night 2: Set up SWA local dev or fallback App Service dev plan; add basic pages and feature folders.
- Night 3: Choose EU region; create Bicep `infra/` skeleton (SWA, Functions, Cosmos, Web PubSub, Key Vault, App Insights).
- Night 4: Add Entra External ID (B2C) tenant and SPA app registration; wire login/logout; protect basic route.
- Night 5: Basic CI with GitHub Actions (build, typecheck); SWA preview env deploy.
	- Optional: Add basic health endpoint `/api/health`

Week 2 – Map & discovery
- Night 1: Azure Maps key + simple map component; geolocate user; show dummy pins.
- Night 2: Cosmos DB container for venues + seed script; Functions endpoint for nearby venues.
- Night 3: Filters (distance/category); list + map sync; empty states.
- Night 4: Business detail page (read-only presence counts placeholder).
- Night 5: Telemetry plumbing (App Insights); error boundaries.
 - Bonus: Set up Google Cloud project, enable Places API; create restricted API key. Store in Key Vault.

Week 3 – Business onboarding
- Night 1: Owner flow to create/claim business; validation; moderation flag.
- Night 2: Staff management (add/remove staff accounts by owner).
- Night 3: Logo upload to Blob Storage; signed URL patterns.
- Night 4: RBAC checks on endpoints.
- Night 5: E2E smoke tests for onboarding flows.
 - Bonus: Implement server-side endpoints for Google Autocomplete & Place Details proxy; normalize and import by Place ID with attribution.

Week 4 – Staff presence (TTL) + realtime
- Night 1: Presence container (TTL), Functions to start/stop/extend presence.
- Night 2: Web PubSub negotiate endpoint and client hook; subscribe to venue groups.
- Night 3: Staff toggle UI in staff console; update venue detail live.
- Night 4: Reconciliation job to ensure expired presence is hidden.
- Night 5: Load test presence toggles (small scale) and tune indexes.

Week 5 – User check-ins (TTL) + realtime
- Night 1: Check-in API (create/delete) with TTL.
- Night 2: Venue page shows current check-ins; join presence updates.
- Night 3: Anti-spam (rate limiting, per-user max active check-in).
- Night 4: Privacy options (initials/anonymous display), reporting flow.
- Night 5: Happy path + edge tests.

Week 6 – Groups & events + moderation
- Night 1: Groups CRUD (organizer role), list by city/region.
- Night 2: Events CRUD with location; upcoming list with geo filter.
- Night 3: Basic report queue + admin hide action.
- Night 4: Facelift/UX polish; accessibility pass.
- Night 5: Docs, screenshots, feature flags.

Week 7 – Launch prep
- Night 1: Content seeding, copy review, i18n pass.
- Night 2: Cost review; Cosmos serverless; sampling in App Insights.
- Night 3: Alerts (availability, error rate); dashboard.
- Night 4: SEO basics; sitemap; OpenGraph.
- Night 5: Soft launch with a city; feedback loops.
 - Add: Review Google attribution placement; run a Places API cost/usage report; verify cache hit ratio.

## Definition of Done (MVP)
- User can sign in, see nearby venues, and filter by has-Irish-now
- Staff can toggle on/off with auto-expiry; user check-ins visible and time-limited
- Groups/events visible and filterable by location/time
- Basic moderation in place; telemetry/alerts configured
- GitHub Actions deploy to SWA prod; infra reproducible via Bicep

## Cost & operations notes
- Start on serverless SKUs (Cosmos serverless, SWA Free, Web PubSub basic). Scale when MAU > ~5–10k.
- Use Cosmos TTL aggressively for presence/check-ins to reduce RU/s.
- Apply sampling in App Insights; configure daily cap.
- Prefer Managed Identity + RBAC over keys; keep Key Vault minimal.
 - Restrict Google API key to server-side usage and known origins; monitor quota with alerts; implement backoff and fallback behavior.

## Risk management
- If SWA hybrid SSR limits block Next.js features, fallback to App Service Node hosting for SSR and keep Functions for APIs; or host app in Container Apps.
- If Azure Maps costs become material, consider MapLibre + OSM tiles with caching and usage controls.
 - If Google Places costs spike, increase cache TTL, throttle autocomplete, and reduce details/photo calls; consider augmenting with Azure Maps POI for non-critical fields.
