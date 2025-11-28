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
  apiKey?: string;
}

export class AuthClient {
  private baseUrl: string;
  private storage: TokenStorage;
  private fetchImpl: typeof fetch;
  private apiKey?: string;

  constructor(opts: AuthClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/?$/, "");
    this.storage = opts.storage ?? defaultStorage();
    // Bind fetch to the correct global to avoid "Illegal invocation" in some environments
    const globalObj: any = typeof window !== "undefined" ? window : globalThis;
    const chosenFetch: any = (opts.fetchImpl ?? globalObj.fetch);
    this.fetchImpl = chosenFetch.bind(globalObj) as typeof fetch;
    this.apiKey = opts.apiKey ?? resolveDefaultApiKey();
  }

  get tokens() { return this.storage.get() ?? {}; }

  setTokens(tokens: { accessToken?: string; refreshToken?: string }) {
    this.storage.set(tokens);
  }

  clearTokens() {
    this.storage.clear();
  }

  private buildHeaders(headers?: Record<string, string>): HeadersInit {
    if (!this.apiKey) return headers ?? {};
    return { "x-functions-key": this.apiKey, ...(headers ?? {}) };
  }

  async signIn(input: SignInRequest): Promise<SignInResponse> {
    const url = `${this.baseUrl}/api/auth/signin`;
    const res = await this.fetchImpl(url, {
      method: "POST",
      headers: this.buildHeaders({ "Content-Type": "application/json" }),
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
      headers: this.buildHeaders({ Authorization: `Bearer ${accessToken}` })
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
      headers: this.buildHeaders({ "Content-Type": "application/json" }),
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

  async signInWithFacebook(userId: string, email?: string) {
    return this.signIn({ provider: "Facebook", providerUserId: userId, providerEmail: email });
  }
}

function resolveDefaultApiKey(): string | undefined {
  // Attempt to read the API key from common Next.js environment variable shapes.
  const envSource: any = (typeof globalThis !== "undefined" && (globalThis as any)?.process?.env)
    ? (globalThis as any).process.env
    : undefined;
  if (!envSource) return undefined;
  return envSource.NEXT_PUBLIC_AUTH_API_KEY
    ?? envSource.NEXT_AUTH_API_KEY
    ?? envSource.NEXT_PUBLIC_FUNCTIONS_API_KEY
    ?? envSource.FUNCTIONS_API_KEY;
}
