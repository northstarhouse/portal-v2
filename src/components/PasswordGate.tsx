'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getAppToken, setAppToken, clearAppToken } from '@/lib/app-token'
import Sidebar from '@/components/Sidebar'

type GateState = 'checking' | 'locked' | 'unlocked'

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const [state, setState]       = useState<GateState>('checking')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [busy, setBusy]         = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      // Clear any stale Supabase auth session left over from prior magic-link flow.
      // Idempotent and harmless if no session exists.
      try { await supabase.auth.signOut({ scope: 'local' }) } catch { /* ignore */ }

      const token = getAppToken()
      if (!token) { if (!cancelled) setState('locked'); return }

      const { data, error } = await supabase.rpc('has_valid_app_session')
      if (cancelled) return

      if (error || !data) {
        clearAppToken()
        setState('locked')
      } else {
        setState('unlocked')
      }
    })()
    return () => { cancelled = true }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const { data, error } = await supabase.rpc('verify_app_password', {
        p_password:   password,
        p_user_agent: navigator.userAgent.slice(0, 200),
      })
      if (error) {
        setError('Something went wrong. Try again.')
        return
      }
      if (!data) {
        setError('Wrong password.')
        return
      }
      setAppToken(data as string)
      setPassword('')
      setState('unlocked')
    } finally {
      setBusy(false)
    }
  }

  if (state === 'checking') {
    return null
  }

  if (state === 'locked') {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--page-bg)' }}>
          <form onSubmit={handleSubmit} style={{
            background: '#fff',
            border: '0.5px solid #e8e0d5',
            borderRadius: 16,
            padding: '40px 36px',
            width: '100%',
            maxWidth: 340,
            textAlign: 'center',
            boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
          }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#2a2a2a', fontFamily: "'Cardo', serif", marginBottom: 6 }}>
              Donor Data
            </div>
            <div style={{ fontSize: 13, color: '#aaa', marginBottom: 28 }}>
              Enter password to continue
            </div>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(null) }}
              disabled={busy}
              autoFocus
              required
              placeholder="Password"
              style={{
                width: '100%',
                padding: '10px 14px',
                border: `0.5px solid ${error ? '#e05050' : '#e0d8cc'}`,
                borderRadius: 8,
                fontSize: 14,
                boxSizing: 'border-box' as const,
                marginBottom: error ? 6 : 20,
                outline: 'none',
                textAlign: 'center',
                letterSpacing: 2,
              }}
            />
            {error && (
              <div style={{ fontSize: 12, color: '#e05050', marginBottom: 14 }}>{error}</div>
            )}
            <button
              type="submit"
              disabled={busy || !password}
              style={{
                width: '100%',
                padding: '10px',
                background: '#b5a185',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                opacity: busy || !password ? 0.5 : 1,
              }}
            >
              {busy ? 'Checking…' : 'Unlock'}
            </button>
            <p style={{ fontSize: 11, color: '#ccc', marginTop: 20 }}>Need access? Ask Haley.</p>
          </form>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
