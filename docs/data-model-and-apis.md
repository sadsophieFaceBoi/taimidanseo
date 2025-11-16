# táimidanseo – Data Model and API Spec (MVP)

Last updated: 2025-11-15  
Version: 0.1 (MVP)

## Entities (Cosmos DB – SQL API)
- user
  - id, displayName, photoUrl (optional), homeRegion
  - profile: { proficiency?: 'beginner'|'intermediate'|'advanced' }
  - createdAt, lastSeenAt
- business
  - id, name, description, categories[], logoUrl, website, phone
  - location: { type: 'Point', coordinates: [lon, lat] }, address: { line1, city, region, country, postcode }
  - hours (optional), verified:boolean, ownerUserId
  - createdAt, updatedAt
  - provider?: {
      source?: 'google',
      google?: {
        placeId: string,
        rating?: number,
        userRatingsTotal?: number,
        priceLevel?: number,
        openingHours?: any,
        photoRefs?: string[],
        url?: string
      },
      lastSyncedAt?: string
    }
- businessMembership
  - id, businessId, userId, role: 'owner'|'staff'
  - displayName?, notes?
  - createdAt
- staffPresence (TTL container)
  - id, businessId, staffUserId, startedAt, expiresAt
  - willingToSpeak:boolean (default true)
  - source: 'manual'|'auto'
- userCheckin (TTL container)
  - id, venueId (businessId), userId, startedAt, expiresAt
  - willingToSpeak:boolean (default true)
  - visibility: 'public-initials'|'anonymous'
- group
  - id, name, description, city, region, organizers:[userId]
- event
  - id, groupId, title, description, startUtc, endUtc
  - location: { type:'Point', coordinates:[lon,lat] }, venueId?:string

- roleAssignment (system-level RBAC)
  - id, userId, scope: 'global'|'business'
  - businessId?: string (when scope='business')
  - role: 'moderator'|'admin'
  - createdAt

Note: presence/check-ins use TTL; containers configured with default TTL; Function may allow extend/stop.

Provider data caching:
- Persist Google Place ID, and cache permissible fields with a defined TTL window (e.g., 7–30 days) per ToS.
- Photo usage should store only references (photoRef) and fetch actual images via Google endpoints through a proxy with attribution.

## Partitioning and indexing
- businesses: partitionKey = city or regionCode (supports browsing by area); spatial index on location
- staffMember: partitionKey = businessId
- staffPresence: partitionKey = businessId (hot during toggles but short-lived; acceptable)
- userCheckin: partitionKey = venueId
- groups/events: partitionKey = city/region; spatial index on event.location

Index policy examples:
- Include spatial index on `location`
- Composite indexes for (category, location distance), (verified, name)

## API overview
Base path: `/api/v1`
Auth: Bearer (OIDC, Entra External ID). Rate-limited.
Responses: JSON; errors use `{ error: { code, message, details? } }`

### Auth/session
- GET `/me`
  - Returns current user profile and capabilities derived from memberships and role assignments
  - Example:
    ```json
    {
      "user": { "id":"u_1", "displayName":"Aoife" },
      "memberships": [ { "businessId":"b_123", "role":"staff" } ],
      "roles": [ { "scope":"global", "role":"moderator" } ]
    }
    ```

### Businesses
- GET `/businesses?near=lat,lon&radiusKm=5&category=cafe&openNow=true&hasIrishNow=true`
  - Returns list with computed distance and presence counts
- POST `/businesses` (role: businessOwner or admin)
  - Body: { name, description?, categories[], website?, phone?, address, location }
- GET `/businesses/{id}`
- PATCH `/businesses/{id}` (owner/admin)

#### Google-powered enrichment (server-side only)
- POST `/integrations/google/places/import` (owner/admin)
  - Body: { placeId }
  - Action: Fetch Place Details via Google Places, normalize, create or update `business` record. Store provider metadata and lastSyncedAt. Return normalized business with `attribution: { google: true }`.
- GET `/integrations/google/places/autocomplete?input=...&near=lat,lon`
  - Returns suggestions to help owners find their venue for import (include attribution requirement)
- GET `/integrations/google/places/photo/{photoRef}`
  - Proxy to Google Photos endpoint. Adds proper caching headers and attribution; avoid exposing API key client-side.

### Membership & presence
- POST `/businesses/{id}/members` (owner/admin)
  - Body: { userId, role: 'owner'|'staff', displayName?, notes? }
- GET `/businesses/{id}/members` (owner/admin)
- POST `/businesses/{id}/members/{userId}/presence` (role: staff or owner)
  - Body: { action: 'start'|'stop'|'extend', ttlMinutes?: number }
  - Side effect: publish Web PubSub event `presence.staff.updated`
- GET `/businesses/{id}/presence`
  - Returns current staff presence list & counts

### Check-ins (users)
- POST `/venues/{id}/checkins`
  - Body: { ttlMinutes?: number, visibility?: 'public-initials'|'anonymous' }
  - Side effect: publish Web PubSub event `presence.user.updated`
- DELETE `/venues/{id}/checkins/{checkinId}`
- GET `/venues/{id}/checkins`

### Groups & events
- POST `/groups` (organizer or admin)
- GET `/groups?city=...`
- POST `/groups/{id}/events`
- GET `/events?near=lat,lon&radiusKm=10&after=...`
- GET `/events/{id}`

### Moderation
- POST `/reports` { targetType:'business'|'event'|'checkin', targetId, reason }
- GET `/admin/reports` (moderator/admin)
- POST `/admin/hide` { targetType, targetId }

## Realtime channels (Web PubSub)
- Hub: `presence`
  - Group: `venue:{businessId}` – updates for staff presence and user check-ins
  - Group: `city:{cityCode}` – coarse updates in area
- Negotiate endpoint: `/realtime/negotiate` → returns URL/token for client to connect

## Error model
- 400 BadRequest: invalid inputs
- 401 Unauthorized: missing/invalid token
- 403 Forbidden: insufficient role
- 404 NotFound: resource absent or hidden
- 409 Conflict: concurrency/version errors
- 429 TooManyRequests: rate limits
- 500 InternalError: unexpected failures (with correlationId)

## Sample payloads
Business:
```json
{
  "id":"b_123",
  "name":"An Caifé",
  "categories":["cafe"],
  "location":{"type":"Point","coordinates":[-6.2603,53.3498]},
  "address":{"line1":"123 Dame St","city":"Dublin","region":"D","country":"IE","postcode":"D02"},
  "verified":true,
  "logoUrl":"https://.../logos/b_123.png",
  "provider":{
    "source":"google",
    "google":{
      "placeId":"ChIJ0wY5w2cOZ0gR7...",
      "rating":4.5,
      "userRatingsTotal":1234,
      "priceLevel":2,
      "photoRefs":["Aaw..."],
      "url":"https://maps.google.com/?cid=..."
    },
    "lastSyncedAt":"2025-11-01T00:00:00Z"
  }
}
```

Business membership:
```json
{
  "id":"bm_001",
  "businessId":"b_123",
  "userId":"u_456",
  "role":"staff",
  "createdAt":"2025-11-15T18:00:00Z"
}
```

Staff presence:
```json
{
  "id":"sp_abc",
  "businessId":"b_123",
  "staffUserId":"u_456",
  "startedAt":"2025-11-15T18:00:00Z",
  "expiresAt":"2025-11-15T22:00:00Z",
  "willingToSpeak":true
}
```

User check-in:
```json
{
  "id":"ci_789",
  "venueId":"b_123",
  "userId":"u_999",
  "startedAt":"2025-11-15T19:00:00Z",
  "expiresAt":"2025-11-15T20:30:00Z",
  "visibility":"public-initials"
}
```
