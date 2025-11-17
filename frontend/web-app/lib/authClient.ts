import { AuthClient } from "@taimidanseo/auth-client";

let singleton: AuthClient | null = null;

export function getAuthClient() {
  if (singleton) return singleton;
  const baseUrl = process.env.NEXT_PUBLIC_FUNCTIONS_BASE_URL || "http://localhost:7071";
  singleton = new AuthClient({ baseUrl });
  return singleton;
}
