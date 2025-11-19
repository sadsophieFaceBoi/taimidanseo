export interface ProviderIds {
  googleClientId?: string | null
  microsoftClientId?: string | null
  facebookAppId?: string | null
}

let cached: ProviderIds | null = null

export async function fetchProviderIds(baseUrl: string): Promise<ProviderIds> {
  if (cached) return cached
  try {
    const res = await fetch(`${baseUrl.replace(/\/?$/, '')}/api/auth/providers`)
    if (!res.ok) throw new Error(`providers endpoint ${res.status}`)
    const data = await res.json()
    cached = {
      googleClientId: data.googleClientId ?? null,
      microsoftClientId: data.microsoftClientId ?? null,
      facebookAppId: data.facebookAppId ?? null
    }
    return cached
  } catch {
    return { googleClientId: null, microsoftClientId: null, facebookAppId: null }
  }
}

export function getEnvOrProvider(prefetched: ProviderIds | null, key: 'google' | 'microsoft' | 'facebook') {
  if (key === 'google') return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || prefetched?.googleClientId || ''
  if (key === 'microsoft') return process.env.NEXT_PUBLIC_MSAL_CLIENT_ID || prefetched?.microsoftClientId || ''
  if (key === 'facebook') return process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || prefetched?.facebookAppId || ''
  return ''
}