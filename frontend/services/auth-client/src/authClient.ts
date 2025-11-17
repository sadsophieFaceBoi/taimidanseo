import type { MeProfile, Provider, RefreshRequest, RefreshResponse, SignInRequest, SignInResponse, TokenStorage } from "./types";

function defaultStorage(): TokenStorage {
  // Use localStorage in browser, noop in SSR
  const hasWindow = typeof window !== "undefined" && !!window.localStorage;
  return {
    get: () => {
      if (!hasWindow) return null;
      const accessToken = window.localStorage.getItem("auth.accessToken") || undefined;
      const refreshToken = window.localStorage.getItem("auth.refreshToken") || undefined;
      return { accessToken, refreshToken };
    },
    set: ({ accessToken, refreshToken }) => {
      if (!hasWindow) return;
      if (accessToken !== undefined) window.localStorage.setItem("auth.accessToken", accessToken);
      if (refreshToken !== undefined) window.localStorage.setItem("auth.refreshToken", refreshToken);
    },
    clear: () => {
      if (!hasWindow) return;
      window.localStorage.removeItem("auth.accessToken");
      window.localStorage.removeItem("auth.refreshToken");
    }
  };
}

export interface AuthClientOptions {
  baseUrl: string; // e.g. http://localhost:7071
  storage?: TokenStorage;
  fetchImpl?: typeof fetch;
}

export class AuthClient {
  private baseUrl: string;
  private storage: TokenStorage;
  private fetchImpl: typeof fetch;

  constructor(opts: AuthClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/?$/, "");
    this.storage = opts.storage ?? defaultStorage();
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  get tokens() { return this.storage.get() ?? {}; }

  setTokens(tokens: { accessToken?: string; refreshToken?: string }) {
    this.storage.set(tokens);
  }

  clearTokens() {
    this.storage.clear();
  }

  async signIn(input: SignInRequest): Promise<SignInResponse> {
    const url = `${this.baseUrl}/api/auth/signin`;
    const res = await this.fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input)
    });
    if (!res.ok) throw new Error(`SignIn failed: ${res.status}`);
    const data = (await res.json()) as SignInResponse;
    this.storage.set({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    return data;
  }

  async me(): Promise<MeProfile> {
    const url = `${this.baseUrl}/api/auth/me`;
    const { accessToken } = this.tokens;
    if (!accessToken) throw new Error("No access token");
    const res = await this.fetchImpl(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (res.status === 401) throw new Error("Unauthorized");
    if (!res.ok) throw new Error(`Me failed: ${res.status}`);
    const data = (await res.json()) as any;
    // The backend returns SignInResponse shape; normalize to MeProfile
    const profile: MeProfile = {
      userId: data.userId,
      username: data.username,
      email: data.email,
      displayName: data.displayName,
      createdAt: data.createdAt,
      lastLoginAt: data.lastLoginAt
    };
    return profile;
  }

  async refresh(): Promise<RefreshResponse> {
    const url = `${this.baseUrl}/api/auth/refresh`;
    const { refreshToken } = this.tokens;
    if (!refreshToken) throw new Error("No refresh token");
    const payload: RefreshRequest = { refreshToken };
    const res = await this.fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`Refresh failed: ${res.status}`);
    const data = (await res.json()) as RefreshResponse;
    this.storage.set({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    return data;
  }

  // Helpers
  async signInWithGoogleIdToken(idToken: string, clientId?: string, fallbackEmail?: string) {
    return this.signIn({ provider: "Google", idToken, googleClientId: clientId, clientId, providerEmail: fallbackEmail });
  }

  async signInWithMicrosoftIdToken(idToken: string, clientId?: string) {
    return this.signIn({ provider: "Microsoft", idToken, microsoftClientId: clientId, clientId });
  }
}
