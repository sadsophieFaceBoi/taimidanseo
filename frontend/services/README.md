# Frontend Services

This workspace contains shared TypeScript packages consumed by apps in the monorepo.

## Packages

- `@taimidanseo/auth-client` — minimal client for the Azure Functions auth API
  - Sign in with Google/Microsoft ID tokens or dev user id
  - Issue and store `accessToken`/`refreshToken`
  - Helpers: `me()`, `refresh()`

## Build

From the `frontend/` directory:

```powershell
npm install
npm run build
```

## Usage in apps

In your Next.js app:

```ts
import { AuthClient } from "@taimidanseo/auth-client";
const client = new AuthClient({ baseUrl: process.env.NEXT_PUBLIC_FUNCTIONS_BASE_URL! });
```

Or use the provided singleton in `web-app/lib/authClient.ts`.
