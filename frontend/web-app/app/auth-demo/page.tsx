'use client'

import { useState, useEffect } from 'react'
import { getAuthClient } from '../../lib/authClient'
import { fetchProviderIds, getEnvOrProvider, ProviderIds } from '../../lib/providerIds'

const REDIRECT_STORAGE_KEY = 'auth-demo.redirect'

type RedirectProvider = 'google' | 'microsoft' | 'facebook'

interface RedirectState {
  provider: RedirectProvider
  state: string
  nonce?: string
  returnUrl?: string
}

interface DemoProfile {
  userId: string
  username: string
  email?: string | null
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'unknown error'
}

function randomHex(bytes = 32) {
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const arr = new Uint8Array(bytes)
    window.crypto.getRandomValues(arr)
    return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('')
  }
  return Array.from({ length: bytes }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('')
}

function storeRedirectState(state: RedirectState) {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(REDIRECT_STORAGE_KEY, JSON.stringify(state))
}

function readRedirectState(): RedirectState | null {
  if (typeof window === 'undefined') return null
  const raw = window.sessionStorage.getItem(REDIRECT_STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as RedirectState
  } catch {
    return null
  }
}

function clearRedirectArtifacts(returnUrl?: string) {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(REDIRECT_STORAGE_KEY)
  if (returnUrl) {
    window.history.replaceState(null, '', returnUrl)
    return
  }
  const url = new URL(window.location.href)
  url.hash = ''
  url.searchParams.delete('state')
  url.searchParams.delete('error')
  url.searchParams.delete('error_description')
  url.searchParams.delete('code')
  const sanitized = url.pathname + (url.search ? url.search : '')
  window.history.replaceState(null, '', sanitized)
}

function getCombinedParams() {
  if (typeof window === 'undefined') return new URLSearchParams()
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash
  const hashParams = new URLSearchParams(hash)
  const searchParams = new URLSearchParams(window.location.search)
  const combined = new URLSearchParams()
  hashParams.forEach((value, key) => combined.set(key, value))
  searchParams.forEach((value, key) => {
    if (!combined.has(key)) combined.set(key, value)
  })
  return combined
}

export default function AuthDemo() {
  const client = getAuthClient()
  const [status, setStatus] = useState<string>('idle')
  const [profile, setProfile] = useState<DemoProfile | null>(null)
  const [providers, setProviders] = useState<ProviderIds | null>(null)

  useEffect(() => {
    const load = async () => {
      const baseUrl = process.env.NEXT_PUBLIC_FUNCTIONS_BASE_URL || 'http://localhost:7071'
      const ids = await fetchProviderIds(baseUrl)
      setProviders(ids)
    }
    load()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = readRedirectState()
    if (!stored) return

    const params = getCombinedParams()
    const returnedState = params.get('state')
    const error = params.get('error') || params.get('error_description')

    if (!returnedState || returnedState !== stored.state) {
      clearRedirectArtifacts()
      return
    }

    if (error) {
      setStatus(`${stored.provider} redirect error: ${error}`)
      clearRedirectArtifacts()
      return
    }

    const run = async () => {
      try {
        if (stored.provider === 'google') {
          const idToken = params.get('id_token')
          if (!idToken) throw new Error('Missing Google id_token from redirect')
          const clientId = getEnvOrProvider(providers, 'google')
          if (!clientId) throw new Error('Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID')
          setStatus('signing in with Google...')
          const res = await client.signInWithGoogleIdToken(idToken, clientId)
          setProfile({ userId: res.userId, username: res.username, email: res.email })
          setStatus('signed in (Google)')
        } else if (stored.provider === 'microsoft') {
          const idToken = params.get('id_token')
          if (!idToken) throw new Error('Missing Microsoft id_token from redirect')
          const clientId = getEnvOrProvider(providers, 'microsoft')
          if (!clientId) throw new Error('Missing NEXT_PUBLIC_MSAL_CLIENT_ID')
          setStatus('signing in with Microsoft...')
          const res = await client.signInWithMicrosoftIdToken(idToken, clientId)
          setProfile({ userId: res.userId, username: res.username, email: res.email })
          setStatus('signed in (Microsoft)')
        } else if (stored.provider === 'facebook') {
          const accessToken = params.get('access_token')
          if (!accessToken) throw new Error('Missing Facebook access_token from redirect')
          setStatus('fetching Facebook profile...')
          const graphResp = await fetch(`https://graph.facebook.com/me?fields=id,email&access_token=${encodeURIComponent(accessToken)}`)
          if (!graphResp.ok) throw new Error(`Facebook profile fetch failed: ${graphResp.status}`)
          const graphData: { id: string; email?: string } = await graphResp.json()
          if (!graphData.id) throw new Error('Facebook profile missing id')
          setStatus('signing in with Facebook...')
          const res = await client.signInWithFacebook(graphData.id, graphData.email)
          setProfile({ userId: res.userId, username: res.username, email: res.email })
          setStatus('signed in (Facebook)')
        }
      } catch (err: unknown) {
        setStatus(`redirect error: ${getErrorMessage(err)}`)
      } finally {
        clearRedirectArtifacts(stored.returnUrl)
      }
    }

    run()
  }, [client, providers])

  const signInDev = async () => {
    try {
      setStatus('signing in (dev)...')
      const res = await client.signIn({ provider: 'Google', providerUserId: `dev_${Date.now()}` })
      setStatus('signed in')
      setProfile({ userId: res.userId, username: res.username, email: res.email })
    } catch (error: unknown) {
      setStatus(`error: ${getErrorMessage(error)}`)
    }
  }

  // Google Sign-In via Google Identity Services (ID token)
  const signInWithGoogle = async () => {
    try {
      const clientId = getEnvOrProvider(providers, 'google')
      if (!clientId) throw new Error('Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID')
      const redirectUri = window.location.origin
      const returnUrl = `${window.location.pathname}${window.location.search}${window.location.hash}` || '/'
      const state = randomHex()
      const nonce = randomHex()
      storeRedirectState({ provider: 'google', state, nonce, returnUrl })
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
      authUrl.searchParams.set('client_id', clientId)
      authUrl.searchParams.set('redirect_uri', redirectUri)
      authUrl.searchParams.set('response_type', 'id_token')
      authUrl.searchParams.set('scope', 'openid email profile')
      authUrl.searchParams.set('state', state)
      authUrl.searchParams.set('nonce', nonce)
      authUrl.searchParams.set('prompt', 'select_account')
      setStatus('redirecting to Google...')
      window.location.assign(authUrl.toString())
    } catch (error: unknown) {
      setStatus(`google error: ${getErrorMessage(error)}`)
    }
  }

  // Microsoft Sign-In via MSAL (ID token)
  const signInWithMicrosoft = async () => {
    try {
      const clientId = getEnvOrProvider(providers, 'microsoft')
      if (!clientId) throw new Error('Missing NEXT_PUBLIC_MSAL_CLIENT_ID')
      const redirectUri = `${window.location.origin}${window.location.pathname}`
      const returnUrl = `${window.location.pathname}${window.location.search}${window.location.hash}` || '/'
      const state = randomHex()
      const nonce = randomHex()
      storeRedirectState({ provider: 'microsoft', state, nonce, returnUrl })
      const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize')
      authUrl.searchParams.set('client_id', clientId)
      authUrl.searchParams.set('redirect_uri', redirectUri)
      authUrl.searchParams.set('response_type', 'id_token')
      authUrl.searchParams.set('response_mode', 'fragment')
      authUrl.searchParams.set('scope', 'openid profile email')
      authUrl.searchParams.set('state', state)
      authUrl.searchParams.set('nonce', nonce)
      authUrl.searchParams.set('prompt', 'select_account')
      setStatus('redirecting to Microsoft...')
      window.location.assign(authUrl.toString())
    } catch (error: unknown) {
      setStatus(`microsoft error: ${getErrorMessage(error)}`)
    }
  }

  // Facebook Sign-In via Facebook SDK (use provider user id + email)
  const signInWithFacebook = async () => {
    try {
      const appId = getEnvOrProvider(providers, 'facebook')
      if (!appId) throw new Error('Missing NEXT_PUBLIC_FACEBOOK_APP_ID')
      const redirectUri = `${window.location.origin}${window.location.pathname}`
      const returnUrl = `${window.location.pathname}${window.location.search}${window.location.hash}` || '/'
      const state = randomHex()
      storeRedirectState({ provider: 'facebook', state, returnUrl })
      const authUrl = new URL('https://www.facebook.com/v19.0/dialog/oauth')
      authUrl.searchParams.set('client_id', appId)
      authUrl.searchParams.set('redirect_uri', redirectUri)
      authUrl.searchParams.set('state', state)
      authUrl.searchParams.set('response_type', 'token')
      authUrl.searchParams.set('scope', 'email')
      setStatus('redirecting to Facebook...')
      window.location.assign(authUrl.toString())
    } catch (error: unknown) {
      setStatus(`facebook error: ${getErrorMessage(error)}`)
    }
  }

  const callMe = async () => {
    try {
      setStatus('loading profile...')
      const me = await client.me()
      setProfile(me)
      setStatus('profile loaded')
    } catch (error: unknown) {
      setStatus(`error: ${getErrorMessage(error)}`)
    }
  }

  const refresh = async () => {
    try {
      setStatus('refreshing...')
      await client.refresh()
      setStatus('refreshed')
    } catch (error: unknown) {
      setStatus(`error: ${getErrorMessage(error)}`)
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
