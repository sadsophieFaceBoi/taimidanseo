export type Provider = "Google" | "Microsoft" | "Facebook";

export interface SignInRequest {
  provider: Provider;
  providerUserId?: string;
  providerEmail?: string;
  idToken?: string;
  googleClientId?: string;
  microsoftClientId?: string;
  clientId?: string;
}

export interface SignInResponse {
  userId: string;
  username: string;
  email: string;
  displayName: string;
  createdAt: string;
  lastLoginAt?: string | null;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface MeProfile {
  userId: string;
  username: string;
  email: string;
  displayName: string;
  createdAt: string;
  lastLoginAt?: string | null;
}

export interface TokenStorage {
  get(): { accessToken?: string; refreshToken?: string } | null;
  set(tokens: { accessToken?: string; refreshToken?: string }): void;
  clear(): void;
}
