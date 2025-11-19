'use client'

import { useState, useEffect } from 'react'
import { getAuthClient } from '../../lib/authClient'
import { fetchProviderIds, getEnvOrProvider, ProviderIds } from '../../lib/providerIds'

declare global {
  interface Window {
    google?: any
    FB?: any
    msal?: any
  }
}

function loadScript(src: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) return resolve()
    const s = document.createElement('script')
    s.id = id
    s.src = src
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(s)
  })
}

export default function AuthDemo() {
  const client = getAuthClient()
  const [status, setStatus] = useState<string>('idle')
  const [profile, setProfile] = useState<any>(null)
  const [providers, setProviders] = useState<ProviderIds | null>(null)

  useEffect(() => {
    const load = async () => {
      const baseUrl = process.env.NEXT_PUBLIC_FUNCTIONS_BASE_URL || 'http://localhost:7071'
      const ids = await fetchProviderIds(baseUrl)
      setProviders(ids)
    }
    load()
  }, [])

  const signInDev = async () => {
    try {
      setStatus('signing in (dev)...')
      const res = await client.signIn({ provider: 'Google', providerUserId: `dev_${Date.now()}` })
      setStatus('signed in')
      setProfile({ userId: res.userId, username: res.username, email: res.email })
    } catch (e: any) {
      setStatus(`error: ${e.message}`)
    }
  }

  // Google Sign-In via Google Identity Services (ID token)
  const signInWithGoogle = async () => {
    try {
      setStatus('loading Google SDK...')
      await loadScript('https://accounts.google.com/gsi/client', 'google-gis')
      const clientId = getEnvOrProvider(providers, 'google')
      if (!clientId) throw new Error('Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID')

      setStatus('requesting Google credential...')
      const idToken: string = await new Promise((resolve, reject) => {
        if (!window.google?.accounts?.id) return reject(new Error('Google Identity not available'))
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (resp: any) => {
              if (resp?.credential) resolve(resp.credential)
              else reject(new Error('No credential from Google'))
            },
            auto_select: false,
          })
          // Use a one-tap prompt; if suppressed, fall back to popup button flow
          window.google.accounts.id.prompt((notification: any) => {
            if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
              // Render a temporary button and click it to ensure UI shows
              const div = document.createElement('div')
              document.body.appendChild(div)
              window.google.accounts.id.renderButton(div, { theme: 'outline', size: 'large' })
            }
          })
        } catch (err) {
          reject(err)
        }
      })

      setStatus('signing in with Google...')
      const res = await client.signInWithGoogleIdToken(idToken, clientId)
      setProfile({ userId: res.userId, username: res.username, email: res.email })
      setStatus('signed in (Google)')
    } catch (e: any) {
      setStatus(`google error: ${e.message}`)
    }
  }

  // Microsoft Sign-In via MSAL (ID token)
  const signInWithMicrosoft = async () => {
    try {
      setStatus('loading Microsoft SDK...')
      await loadScript('https://alcdn.msauth.net/browser/2.38.0/js/msal-browser.min.js', 'msal-browser')
      const clientId = getEnvOrProvider(providers, 'microsoft')
      if (!clientId) throw new Error('Missing NEXT_PUBLIC_MSAL_CLIENT_ID')

      // Initialize MSAL app
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const PublicClientApplication = (window as any).msal?.PublicClientApplication
      if (!PublicClientApplication) throw new Error('MSAL not available')
      const msalApp = new PublicClientApplication({ auth: { clientId } })

      setStatus('Microsoft login popup...')
      const loginResp = await msalApp.loginPopup({ scopes: ['openid', 'profile', 'email'] })
      const idToken: string | undefined = loginResp?.idToken
      if (!idToken) throw new Error('No idToken from Microsoft')

      setStatus('signing in with Microsoft...')
      const res = await client.signInWithMicrosoftIdToken(idToken, clientId)
      setProfile({ userId: res.userId, username: res.username, email: res.email })
      setStatus('signed in (Microsoft)')
    } catch (e: any) {
      setStatus(`microsoft error: ${e.message}`)
    }
  }

  // Facebook Sign-In via Facebook SDK (use provider user id + email)
  const signInWithFacebook = async () => {
    try {
      setStatus('loading Facebook SDK...')
      await loadScript('https://connect.facebook.net/en_US/sdk.js', 'facebook-jssdk')

      const appId = getEnvOrProvider(providers, 'facebook')
      if (!appId) throw new Error('Missing NEXT_PUBLIC_FACEBOOK_APP_ID')

      await new Promise<void>((resolve) => {
        if (window.FB?.init) return resolve()
        ;(window as any).fbAsyncInit = function () {
          window.FB!.init({ appId, cookie: true, xfbml: false, version: 'v19.0' })
          resolve()
        }
        // If SDK already loaded and provided FB, init immediately
        if (window.FB) {
          window.FB.init({ appId, cookie: true, xfbml: false, version: 'v19.0' })
          resolve()
        }
      })

      setStatus('Facebook login popup...')
      const authResponse = await new Promise<any>((resolve, reject) => {
        window.FB!.login((resp: any) => {
          if (resp?.authResponse) resolve(resp.authResponse)
          else reject(new Error('Facebook login failed or cancelled'))
        }, { scope: 'email' })
      })

      const me = await new Promise<{ id: string; email?: string }>((resolve, reject) => {
        window.FB!.api('/me', { fields: 'id,name,email' }, (resp: any) => {
          if (resp?.id) resolve({ id: resp.id, email: resp.email })
          else reject(new Error('Failed to fetch Facebook profile'))
        })
      })

      setStatus('signing in with Facebook...')
      const res = await client.signInWithFacebook(me.id, me.email)
      setProfile({ userId: res.userId, username: res.username, email: res.email })
      setStatus('signed in (Facebook)')
    } catch (e: any) {
      setStatus(`facebook error: ${e.message}`)
    }
  }

  const callMe = async () => {
    try {
      setStatus('loading profile...')
      const me = await client.me()
      setProfile(me)
      setStatus('profile loaded')
    } catch (e: any) {
      setStatus(`error: ${e.message}`)
    }
  }

  const refresh = async () => {
    try {
      setStatus('refreshing...')
      await client.refresh()
      setStatus('refreshed')
    } catch (e: any) {
      setStatus(`error: ${e.message}`)
    }
  }

  const signOut = () => {
    client.clearTokens()
    setProfile(null)
    setStatus('signed out')
  }

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-semibold">Auth Demo</h1>
      <div className="space-x-2 flex flex-wrap gap-2">
        <button className="px-3 py-2 rounded bg-black text-white" onClick={signInDev}>Dev Sign In</button>
        <button className="px-3 py-2 rounded bg-red-600 text-white" onClick={signInWithGoogle}>Sign in with Google</button>
        <button className="px-3 py-2 rounded bg-blue-700 text-white" onClick={signInWithMicrosoft}>Sign in with Microsoft</button>
        <button className="px-3 py-2 rounded bg-blue-500 text-white" onClick={signInWithFacebook}>Sign in with Facebook</button>
        <button className="px-3 py-2 rounded bg-slate-800 text-white" onClick={callMe}>Me</button>
        <button className="px-3 py-2 rounded bg-green-700 text-white" onClick={refresh}>Refresh</button>
        <button className="px-3 py-2 rounded bg-gray-300" onClick={signOut}>Sign Out</button>
      </div>
      <div className="text-sm text-slate-600">Status: {status}</div>
      <div className="text-xs text-slate-500">Loaded IDs: {providers ? JSON.stringify(providers) : 'loading...'}</div>
      <pre className="p-3 bg-slate-100 rounded text-xs overflow-x-auto">{JSON.stringify(profile, null, 2)}</pre>
    </div>
  )
}
