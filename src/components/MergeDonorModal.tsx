'use client'
import { useState, useEffect, useRef } from 'react'
import { X, Search, ArrowRight, AlertTriangle, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { DonorWithStats } from '@/lib/types'

interface Props {
  donor: DonorWithStats   // the donor being merged away (will be deleted)
  onClose: () => void
  onMerged: () => void
}

const goldBtn = { background: 'var(--gold)' }

export default function MergeDonorModal({ donor, onClose, onMerged }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ id: string; formal_name: string; informal_first_name: string | null }[]>([])
  const [searching, setSearching] = useState(false)
  const [target, setTarget] = useState<{ id: string; formal_name: string } | null>(null)
  const [merging, setMerging] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(async () => {
      setSearching(true)
      const { data } = await supabase
        .from('donors')
        .select('id, formal_name, informal_first_name')
        .neq('id', donor.id)
        .ilike('formal_name', `%${query}%`)
        .limit(8)
      setResults(data ?? [])
      setSearching(false)
    }, 250)
  }, [query, donor.id])

  async function merge() {
    if (!target) return
    setMerging(true)
    setError('')
    try {
      // Move all donations from this donor to the target
      const { error: moveErr } = await supabase
        .from('donations')
        .update({ donor_id: target.id })
        .eq('donor_id', donor.id)
      if (moveErr) throw moveErr

      // Combine historical totals onto the target
      const combinedLifetime = donor.historical_lifetime_giving
      const combinedCount = donor.historical_donation_count

      if (combinedLifetime > 0 || combinedCount > 0) {
        const { data: targetRow } = await supabase
          .from('donors')
          .select('historical_lifetime_giving, historical_donation_count')
          .eq('id', target.id)
          .single()

        await supabase.from('donors').update({
          historical_lifetime_giving: (targetRow?.historical_lifetime_giving ?? 0) + combinedLifetime,
          historical_donation_count: (targetRow?.historical_donation_count ?? 0) + combinedCount,
          updated_at: new Date().toISOString(),
        }).eq('id', target.id)
      }

      // Delete the source donor (cascade removes list_donors entries)
      const { error: delErr } = await supabase.from('donors').delete().eq('id', donor.id)
      if (delErr) throw delErr

      setDone(true)
      setTimeout(() => { onMerged(); onClose() }, 900)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Merge failed')
      setMerging(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="border-b border-stone-100 px-5 py-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-stone-800">Merge Donor</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-stone-100 rounded-lg text-stone-400">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Source */}
          <div>
            <p className="text-xs text-stone-400 uppercase tracking-wider font-semibold mb-1">Merging</p>
            <div className="px-3 py-2 bg-red-50 border border-red-100 rounded-lg text-sm font-medium text-stone-700">
              {donor.formal_name}
              <span className="text-xs text-stone-400 ml-2 font-normal">will be deleted</span>
            </div>
          </div>

          <div className="flex items-center justify-center text-stone-300">
            <ArrowRight size={18} />
          </div>

          {/* Target search */}
          <div>
            <p className="text-xs text-stone-400 uppercase tracking-wider font-semibold mb-1.5">Into</p>
            {target ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                <span className="flex-1 text-sm font-medium text-stone-700">{target.formal_name}</span>
                <button onClick={() => setTarget(null)} className="text-stone-400 hover:text-stone-600">
                  <X size={13} />
                </button>
              </div>
            ) : (
              <div>
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-2.5 text-stone-400" />
                  <input
                    autoFocus
                    className="w-full border border-stone-200 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                    placeholder="Search donor name..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                  />
                </div>
                {results.length > 0 && (
                  <div className="mt-1 border border-stone-200 rounded-lg overflow-hidden shadow-sm">
                    {results.map(r => (
                      <button
                        key={r.id}
                        onClick={() => { setTarget(r); setQuery(''); setResults([]) }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left hover:bg-stone-50 border-b border-stone-100 last:border-0"
                      >
                        <span className="font-medium text-stone-700">{r.formal_name}</span>
                        {r.informal_first_name && <span className="text-stone-400 text-xs">{r.informal_first_name}</span>}
                      </button>
                    ))}
                  </div>
                )}
                {searching && <p className="text-xs text-stone-400 mt-1 pl-1">Searching...</p>}
              </div>
            )}
          </div>

          {/* Warning */}
          {target && (
            <div className="flex gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
              <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                All donations and history from <strong>{donor.formal_name}</strong> will move to <strong>{target.formal_name}</strong>.
                <strong className="block mt-0.5">{donor.formal_name} will be permanently deleted.</strong>
              </p>
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <div className="border-t border-stone-100 px-5 py-3 flex items-center justify-between">
          <button onClick={onClose} className="px-4 py-2 text-sm text-stone-500 hover:text-stone-700">Cancel</button>
          <button
            onClick={merge}
            disabled={!target || merging || done}
            className="flex items-center gap-2 px-4 py-2 text-white text-sm rounded-lg disabled:opacity-40 font-medium"
            style={goldBtn}
          >
            {done
              ? <><Check size={13} /> Merged!</>
              : merging
              ? 'Merging...'
              : 'Merge & Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
