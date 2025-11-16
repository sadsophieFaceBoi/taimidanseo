# táimidanseo – System Architecture (Azure)

Last updated: 2025-11-15  
Version: 0.1 (MVP)

## Overview
A low-ops, serverless-first architecture on Azure that supports:
- Next.js web front end
- Real-time presence (staff “on shift”, user check-ins)
- Geospatial search for venues and events
- EU data residency and GDPR-friendly defaults

## Chosen services (MVP)
- Frontend hosting: Azure Static Web Apps (SWA) – Next.js (hybrid SSR supported; preview features reviewed)
- API: Azure Functions (Node/TypeScript), integrated with SWA reverse proxy
- Database: Azure Cosmos DB (SQL/Core API) – serverless throughput (geo indexes enabled)
- Realtime: Azure Web PubSub (websocket fan-out)
- Auth: Microsoft Entra External ID (Azure AD B2C) – social providers (Google, Apple)
- Maps: Azure Maps – tiles, geocoding
- Business data: Google Places API – business details, hours, photos, and POI enrichment
- Storage: Azure Storage (Blob) + Azure CDN – images/logos
- Secrets: Azure Key Vault – SDKs use Managed Identity from Functions/SWA API
- Observability: Azure Monitor / Application Insights
- Optional: Azure Notification Hubs (future mobile push), Azure API Management (future governance)

## High-level diagram (ASCII)
```
[Browser (Next.js)] -- https/WS --> [Azure Static Web Apps]
             |                         |  
             |  https (API)            v
             +--------------------> [Azure Functions API]
                                         |  
                                         | managed identity
                                         v
                                [Cosmos DB (SQL)]
                                         ^
                                         |
                              [Azure Web PubSub] <--- (Functions bindings)
                                         ^
                                         |
                        [Client WS via SWA/Functions negotiated token]

[Azure Maps] (tiles/geocoding via SDK in client/server)
[Google Places API] (business details/photos via server-side proxy)
[Blob Storage + CDN] (images)
[Entra External ID] (OIDC for SPA + API auth)
[App Insights] (logs, traces, metrics)
[Key Vault] (secrets; Functions/SWA API uses MSI)
```

## Data flow
- Read: Client calls SWA-routed Function endpoints → Cosmos DB query (geospatial for nearby venues) → returns results
- Enrichment: If local venue data is missing/stale, Functions call Google Places API (server-side) to enrich details (respecting caching TTLs and ToS) → normalized and stored in Cosmos → returned to client with required attribution
- Presence: Staff toggles “on shift” → Function writes presence doc with TTL to Cosmos; Function publishes event to Web PubSub hub → clients subscribed to the venue/city receive live updates
- Check-ins: User check-in → same pattern as presence with shorter TTL
- Auth: SPA uses Entra External ID → receives ID token/claims → sends bearer to Functions → Functions authorize per role (user/staff/owner/admin)

## Security & roles
- Conceptual roles: user, staff, owner, moderator, admin
- Role storage model:
  - Users are identity principals only; no embedded roles on the user document
  - Business-level roles are represented by `businessMembership` documents (userId, businessId, role: owner|staff)
  - System-level roles (e.g., moderator/admin) are represented by `roleAssignment` documents with `scope: 'global'`
- Authorization: Audience-scoped JWTs from Entra External ID; Functions derive capabilities by combining identity claims with membership/roleAssignment lookups per request; enforce resource-scoped checks (e.g., only an owner of businessId can manage members)
- Secrets: No connection strings in code; Functions use Managed Identity to access Cosmos DB (RBAC) and Key Vault
- Third-party keys: Google Places API key stored in Key Vault; Functions access at runtime via Managed Identity; restrict key by HTTP referrer and/or network where applicable
- Network: Public by default (MVP); later add Private Endpoints/VNET if needed

## Geospatial search strategy
- Cosmos DB containers:
  - venues (Point geometry in `location` property; spatial index enabled)
  - groups/events (Point geometry for event location)
  - presence_staff (TTL: 4-6h default; partitionKey: `businessId` or `regionCode`)
  - presence_user (TTL: 1-2h default; partitionKey: `venueId`)
- Caching policy:
  - External provider cache (Google Places) stored alongside `venues` as a normalized snapshot with `provider.google.placeId` and `lastSyncedAt`
  - Refresh cadence via Timer Trigger (e.g., 7–30 days) or on-demand if fields are stale/missing
  - Do not persist prohibited fields beyond allowed windows per Google Places ToS; store Place ID and normalized, permitted fields
- Queries: `ST_DISTANCE(c.location, {'type':'Point','coordinates':[lon,lat]}) < X`
- Index policy: include spatial index on `location` + composite indexes for common filters

## Realtime design
- Hub names: `presence` (venue-specific groups), `events` (global or regional)
- Pattern: Client requests negotiated connection from Function (Web PubSub connection binding), then joins venue/city groups
- Server publishes updates on:
  - Staff status toggled on/off
  - New/expired user check-ins
- Expiry (TTL) cleanup is automatic; a background Function can periodically reconcile stale clients if needed

## SWA + Next.js notes
- Hybrid/SSR support in SWA is in preview; verify limitations (no linked API in some configs). If limitations block, alternative is App Service (Node) or Container Apps hosting for Next.js server, still fronted by Azure Front Door/CDN. For MVP, prefer SWA for cost/ops; fall back if needed.
- Exclude `/.swa` paths from middleware/rewrites (per docs) to avoid deployment health check conflicts.

## Environments
- dev (single region), test (optional), prod (EU region)
- IaC: Bicep in `infra/` with Azure Verified Modules where possible; per-environment parameter files

## Cost posture (MVP)
- SWA Free/Standard (start Free)
- Cosmos DB serverless (auto-burst)
- Web PubSub Basic (or Standard if needed)
- Azure Maps S0 (pay-as-you-go)
- Google Places: start with Nearby Search/Details only; aggressively cache results to reduce requests; monitor quota/costs
- App Insights basic ingestion (sampling)

## Tradeoffs
- SWA + Functions vs App Service vs Container Apps
  - SWA: lowest ops/cost, excellent for Jamstack/SSR preview; preview caveats for hybrid Next.js
  - App Service: stable SSR, simple lift-and-run, higher base cost
  - Container Apps: flexible/runtime-agnostic, scale-to-zero, more setup
- Cosmos DB vs Postgres
  - Cosmos: Serverless, geo, TTL, change feed; excellent for presence/JSON models
  - Postgres: SQL familiarity; geospatial with PostGIS but higher ops for serverless patterns
- Web PubSub vs SignalR Service
  - Web PubSub: native websockets across stacks; excellent for JS
  - SignalR: tight .NET integrations; either works, choose Web PubSub for JS-first
- Azure Maps vs Open-source tiles
  - Azure Maps: SLA, enterprise geocoding; paid
  - Open-source tiles: lower cost, but rate limits and reliability vary
- Google Places vs Azure Maps POI data
  - Google Places: rich POI ecosystem, photos, hours; requires API key and attribution; ToS limitations on data storage
  - Azure Maps POI: integrated stack; simpler licensing; may have different coverage/fields

## Scaling path (post-MVP)
- Enable Cosmos DB provisioned throughput + multi-region read replicas
- Add Azure Front Door for global routing; multiple SWA/App Service instances
- Use Azure API Management for versioning/throttling
- Add Notification Hubs for mobile push; event-driven Functions for campaigns
- Private Endpoints, VNET, and Managed Private Link as needed

## Compliance & attribution (Google)
- Display "Powered by Google" attribution wherever Google Places results are shown, including on autocomplete and details views
- Follow Google Places API terms on storage: retain Place ID; cache permissible fields with defined TTL; refresh regularly; respect photo usage/licensing
- Provide a mechanism to purge cached fields upon request and to remove stale/withdrawn locations
