'use client'

import { useState } from 'react'
import { getAuthClient } from '../../lib/authClient'

export default function AuthDemo() {
  const client = getAuthClient()
  const [status, setStatus] = useState<string>('idle')
  const [profile, setProfile] = useState<any>(null)

  const signInDev = async () => {
    try {
      setStatus('signing in...')
      const res = await client.signIn({ provider: 'Google', providerUserId: `dev_${Date.now()}` })
      setStatus('signed in')
      setProfile({ userId: res.userId, username: res.username, email: res.email })
    } catch (e: any) {
      setStatus(`error: ${e.message}`)
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
      <div className="space-x-2">
        <button className="px-3 py-2 rounded bg-black text-white" onClick={signInDev}>Dev Sign In</button>
        <button className="px-3 py-2 rounded bg-slate-800 text-white" onClick={callMe}>Me</button>
        <button className="px-3 py-2 rounded bg-green-700 text-white" onClick={refresh}>Refresh</button>
        <button className="px-3 py-2 rounded bg-gray-300" onClick={signOut}>Sign Out</button>
      </div>
      <div className="text-sm text-slate-600">Status: {status}</div>
      <pre className="p-3 bg-slate-100 rounded text-xs overflow-x-auto">{JSON.stringify(profile, null, 2)}</pre>
    </div>
  )
}
