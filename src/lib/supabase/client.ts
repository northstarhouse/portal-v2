'use client'
import { createBrowserClient } from '@supabase/ssr'
import { getAppToken } from '../app-token'

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: (input, init) => {
      const token = getAppToken()
      const headers = new Headers(init?.headers)
      if (token) headers.set('x-app-token', token)
      return fetch(input, { ...init, headers })
    },
  },
})
