# táimidanseo – Product Requirements Document (PRD)

Last updated: 2025-11-15  
Owner: andre  
Version: 0.1 (MVP planning)

## 1) Product summary
Táim id an seo (“I am here”) is a community platform that helps people find places and people willing to speak Irish (Gaeilge) nearby. It connects learners and speakers with:
- Local businesses that have Irish-speaking staff on shift right now
- Community groups, meetups, and events focused on Irish
- Individuals who opt-in to “check in” at venues (cafés, pubs, libraries) to indicate they’re available to chat in Irish

The experience is location-first, privacy-conscious, and real-time.

## 2) Goals and success metrics
- Goal: Help users discover nearby opportunities to speak Irish in under 60 seconds.
- Goal: Make it easy for businesses to advertise Irish-speaking availability dynamically by shift.
- Goal: Foster a safe, welcoming community with low friction to join.

Initial success metrics (first 90 days post-MVP):
- 1,000 registered users; 200 monthly active users (MAU)
- 100 onboarded businesses; 30 weekly staff-status toggles
- 200 monthly user check-ins; median time-to-first-conversation < 24h
- CSAT ≥ 4.5/5 on “Was this useful to find Irish speakers?”

## 3) Target users & personas
- Learner: Wants casual practice opportunities near their routine; values low pressure and safe spaces.
- Fluent speaker: Wants to help and meet others; values convenience and community.
- Business owner/manager: Wants to attract Irish community; needs simple staff tools and brand control.
- Staff member: Can speak Irish; wants opt-in control per-shift; low overhead on mobile.
- Group/event organizer: Wants to create and promote recurring or one-off activities.

## 4) Problem statement & value proposition
- Problem: It’s hard to know who is willing to speak Irish and where/when to find them.
- Value: A geospatial, real-time directory of businesses, groups, events, and people currently available to speak Irish.

## 5) Scope (MVP vs. later)
MVP (V0):
- User registration and auth (social sign-in, email)
- Map/list of nearby businesses, basic details, Irish-speaking capability indicated via real-time staff status
- Staff: “I’m on shift and happy to speak Irish” toggle with auto-expiry
- User check-in at a venue (opt-in, time-limited) with visibility on the venue page
- Groups and basic events listing (time, location, description)
- Search + filters (distance, category, open now, has Irish speaker)
- Business onboarding: Claim/verify business, add staff, edit profile
  - Business import: Owner can search/import their venue from Google Places by Place ID (server-side) with required attribution
- Basic moderation/reporting and abuse handling (report venue/check-in, hide content)
- Analytics (anonymous usage) & basic operational telemetry

Post-MVP (V1+):
- Push notifications (new nearby check-ins, events starting soon)
- “I’d like to chat” anonymous nudge/hand-raise
- Rich profiles (proficiency, interests), badges
- Reviews/endorsements and community reputation
- Reservation/RSVP for events or meetups
- Offline-first mobile apps (Android/iOS)
- Multi-language UI (English/Irish), more locales
 - Deeper POI enrichment (opening hours updates, reviews summary) with stricter caching/refresh schedules per Google ToS

Out of scope initially:
- In-app messaging (use links or 3rd-party community channels)
- Payments, ads
- Complex scheduling/rota management (keep staff toggle simple)

## 6) Core user stories
- As a learner, I want to open the app and see nearby places where I can speak Irish now.
- As a staff member, I want to set “on shift and willing to speak” and have it automatically expire when I forget to turn it off.
- As a business owner, I want a page for my business and to list staff who can speak Irish.
- As a user, I want to check in to a café to show I’m available to speak for the next hour.
- As an organizer, I want to publish a recurring weekly meetup with location/time.
- As a user, I want to filter by distance and venue type.
- As a user, I want the UI to be simple, quick, and privacy-respecting.

## 7) Functional requirements (MVP)
- Account & Auth
  - Register/sign in via Email, Google, Apple (Entra External ID/B2C)
  - Basic profile (display name, optional language proficiency)
- Businesses & Staff
  - Create/claim business; add logo, description, categories, hours, location (map/geocode)
  - Add staff members to a business (owner-managed)
  - Staff can toggle “Irish-speaking on shift” with TTL (e.g., 4 hours, extendable)
  - Business page shows live count of staff willing to speak
  - Google Places integration (server-side):
    - Import by Place ID (normalize name, address, coordinates, phone/website where permitted)
    - Autocomplete helper for owners to find the correct Place ID
    - Photos served via server-side proxy and attribution; cache references, not raw images
- Check-ins (Users)
  - User can check in to a location (selected venue) with TTL (e.g., 60–120 minutes)
  - Venue page shows count/list of current check-ins (privacy: first name or initials)
- Groups & Events
  - Create group pages, list upcoming events (time, place, description)
  - RSVP optional (MVP can be a simple count)
- Discovery
  - Map + list with geospatial search and filters (distance, category, has Irish speaker now)
  - Sorting by distance and popularity
  - When showing Google-powered results, display "Powered by Google" as required
- Moderation & Safety
  - Report inappropriate content; admin dashboard to review/hide
  - Rate limiting on check-ins and status toggles
  - Privacy controls and clear opt-in for visibility
- Admin
  - Soft-delete/restore venues, events, users
  - Audit logs for sensitive actions

## 8) Non-functional requirements
- Performance: P95 API < 300 ms for typical reads; first map render < 2.5 s on 4G
- Availability: 99.9% for public APIs (serverless, multi-AZ)
- Cost: Minimal fixed cost MVP; scale with usage (serverless tiers where possible)
- Privacy & Compliance: GDPR compliant; data residency in EU; clear consent for location sharing
  - Comply with Google Places API Terms: required attributions, storage limits, photo licensing; cache TTL for provider fields (7–30 days) and periodic refresh
- Security: OAuth2/OIDC with Entra External ID; least-privilege RBAC; secrets in Key Vault; TLS everywhere
- Observability: App Insights metrics, traces; basic dashboards and alerts
- Localisation: English first; Irish UI strings prepared; i18n-ready

## 9) Assumptions & constraints
- Users opt-in to share approximate location; exact live location is never publicly broadcast without explicit consent
- Venue locations are fixed; check-ins are tied to venue, not free-form coordinates
- Staff status and user check-ins auto-expire (TTL) to avoid stale presence
- EU hosting regions preferred (e.g., West Europe/North Europe)
 - Google Places data is accessed server-side only; API key is never exposed to client; stored in Azure Key Vault

## 10) Risks & mitigations
- Low supply of Irish-speaking staff → Focus on community groups and events to bootstrap
- Presence fraud/trolling → Rate limiting, report flows, soft identity signals, optional verified businesses
- Privacy concerns → Transparent TTLs, opt-in, limited public fields, secure defaults
- Cost overruns → Prefer serverless, Cosmos DB serverless initially, Web PubSub basic tier, scale up later
- Data quality (venues) → Seed with curated lists; allow community suggestions with moderation
 - Third-party ToS and costs → Attribute properly; proxy photos; cache permissible fields; rate limit usage; monitor cost and enforce quotas

## 11) Analytics & KPIs (MVP)
- DAU/MAU, new users/day, conversion from anonymous to registered
- Venue profile views, check-ins per venue/day, staff toggles/day
- Searches with filters; clickthrough to directions
- Content moderation events

## 12) Internationalization & accessibility
- UI copy designed for English and Irish; support diacritics properly
- WCAG 2.1 AA visual contrast and keyboard accessibility

## 13) Glossary
- Check-in: Time-limited indicator that a user is present and willing to speak Irish at a venue
- Staff status: Time-limited indicator that staff at a business are currently on shift and willing to speak Irish
- TTL: Auto-expiry time after which a presence signal is removed
