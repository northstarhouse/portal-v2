const PREFIX = 'north-star:'
export const TTL_SHORT = 1000 * 60 * 5   // 5 min — frequently edited tables
export const TTL_MED   = 1000 * 60 * 15  // 15 min — less volatile tables

export function cacheRead<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return null
    const { data, expires } = JSON.parse(raw)
    if (Date.now() > expires) { localStorage.removeItem(PREFIX + key); return null }
    return data as T
  } catch { return null }
}

export function cacheWrite<T>(key: string, data: T, ttl: number) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(PREFIX + key, JSON.stringify({ data, expires: Date.now() + ttl })) } catch { /* quota */ }
}

export function cacheDel(key: string) {
  if (typeof window === 'undefined') return
  localStorage.removeItem(PREFIX + key)
}
