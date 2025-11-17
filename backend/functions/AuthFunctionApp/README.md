# AuthFunctionApp

Azure Functions (isolated) app providing a `/api/auth/signin` endpoint.

## Local settings

Copy and edit `local.settings.json` as needed (do not commit secrets):

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "dotnet-isolated",
    "Mongo__ConnectionString": "mongodb://localhost:27017",
    "Mongo__Database": "taimidanseo",
    "Mongo__UsersCollection": "users"
  }
}
```

Add JWT settings (used to issue access tokens):

```json
{
  "Values": {
    "Auth__Jwt__SigningKey": "dev-super-secret-change-me-32bytes-min",
    "Auth__Jwt__Issuer": "taimidanseo.local",
    "Auth__Jwt__Audience": "taimidanseo.clients",
    "Auth__Jwt__LifetimeMinutes": "60"
  }
}
```

## Build and run

```powershell
# From repo root
Set-Location "c:\Users\andre\source\repos\taimidanseo\backend\functions\AuthFunctionApp";
 dotnet build;
 func start
```

If `func` is not available, install Azure Functions Core Tools or run with `dotnet run` (for isolated worker).

## Endpoint

- POST `http://localhost:7071/api/auth/signin`
- Body:
```json
{
  "provider": "Google",
  "providerUserId": "1234567890",
  "providerEmail": "user@example.com",
  "idToken": "<google-id-token>",
  "googleClientId": "<your-google-oauth-client-id>"
}
```
- Response includes basic user profile and an `accessToken` (JWT).
  - Response includes `accessToken` (JWT) and `refreshToken`.

- For Microsoft sign-in, send:
```json
{
  "provider": "Microsoft",
  "idToken": "<microsoft-id-token>",
  "microsoftClientId": "<your-azure-ad-app-client-id>"
}
```

- GET `http://localhost:7071/api/auth/me`
  - Requires `Authorization: Bearer <accessToken>` header
  - Returns the current user profile.

## Refresh tokens

- POST `http://localhost:7071/api/auth/refresh`
- Body:
```json
{
  "refreshToken": "<refresh-token>"
}
```
- Response:
```json
{
  "accessToken": "...",
  "refreshToken": "..."  // rotated
}
```

Configure refresh lifetime with `Auth__Refresh__LifetimeDays`.

## Microsoft tenant allowlist (placeholder)

- Set `Auth__Microsoft__AllowedTenants` to a comma-separated list of tenant IDs to restrict sign-ins.
- If blank, any Microsoft tenant is accepted after signature/audience validation.
