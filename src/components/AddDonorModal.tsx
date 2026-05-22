'use client'
import { useState, useEffect, useRef } from 'react'
import { X, DollarSign, Search, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { DonationType, PaymentType } from '@/lib/types'

interface Props {
  onClose: () => void
  onCreated: () => void
}

interface DonorMatch {
  id: string
  formal_name: string
  informal_first_name: string | null
  email: string | null
}

const goldBtn = { background: 'var(--gold)' }
const inputCls = "w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 text-stone-700"

type Mode = 'search' | 'existing' | 'new'

export default function AddDonorModal({ onClose, onCreated }: Props) {
  const [mode, setMode] = useState<Mode>('search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<DonorMatch[]>([])
  const [searching, setSearching] = useState(false)
  const [existingDonor, setExistingDonor] = useState<DonorMatch | null>(null)

  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    formal_name: '',
    informal_first_name: '',
    email: '',
    phone: '',
    employer: '',
    address: '',
    account_type: '',
  })
  const [giftAmount, setGiftAmount] = useState('')
  const [giftDate, setGiftDate] = useState(new Date().toISOString().slice(0, 10))
  const [giftType, setGiftType] = useState<DonationType>('Donation')
  const [giftPaymentType, setGiftPaymentType] = useState<PaymentType | ''>('')
  const [giftBenefits, setGiftBenefits] = useState('')
  const [giftAcknowledged, setGiftAcknowledged] = useState(false)
  const [giftDonationNotes, setGiftDonationNotes] = useState('')
  const [error, setError] = useState('')

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!query.trim()) { setResults([]); setSearching(false); return }
    setSearching(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const [{ data: byFormal }, { data: byInformal }] = await Promise.all([
        supabase.from('donors').select('id, formal_name, informal_first_name, email')
          .ilike('formal_name', `%${query}%`).order('formal_name').limit(8),
        supabase.from('donors').select('id, formal_name, informal_first_name, email')
          .ilike('informal_first_name', `%${query}%`).order('formal_name').limit(8),
      ])
      const seen = new Set<string>()
      const merged = [...(byFormal ?? []), ...(byInformal ?? [])].filter(d => {
        if (seen.has(d.id)) return false
        seen.add(d.id)
        return true
      }).slice(0, 8)
      setResults(merged as DonorMatch[])
      setSearching(false)
    }, 250)
  }, [query])

  function set(patch: Partial<typeof form>) { setForm(f => ({ ...f, ...patch })) }

  function selectExisting(donor: DonorMatch) {
    setExistingDonor(donor)
    setMode('existing')
  }

  async function saveToExisting() {
    if (!existingDonor) return
    const amount = parseFloat(giftAmount)
    if (!amount || !giftDate) { setError('Amount and date are required.'); return }
    setSaving(true)
    setError('')
    await supabase.from('donations').insert({
      donor_id: existingDonor.id,
      amount,
      date: giftDate,
      type: giftType,
      payment_type: giftPaymentType || null,
      benefits: giftBenefits.trim() || null,
      acknowledged: giftAcknowledged,
      donation_notes: giftDonationNotes.trim() || null,
    })
    onCreated()
    onClose()
  }

  async function saveNew() {
    if (!form.formal_name.trim()) { setError('Formal name is required.'); return }
    if (!form.formal_name.trim().includes(' ')) { setError('Formal name should be a full name (e.g. "Susan Johnson"), not just a first name.'); return }
    setSaving(true)
    setError('')
    try {
      const { data: donor, error: dErr } = await supabase
        .from('donors')
        .insert({
          formal_name: form.formal_name.trim(),
          informal_first_name: form.informal_first_name.trim() || null,
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          employer: form.employer.trim() || null,
          address: form.address.trim() || null,
          account_type: form.account_type || null,
          historical_lifetime_giving: 0,
          historical_donation_count: 0,
        })
        .select('id')
        .single()

      if (dErr) throw dErr

      const amount = parseFloat(giftAmount)
      if (amount > 0 && giftDate && donor) {
        await supabase.from('donations').insert({
          donor_id: donor.id,
          amount,
          date: giftDate,
          type: giftType,
          payment_type: giftPaymentType || null,
          benefits: giftBenefits.trim() || null,
          acknowledged: giftAcknowledged,
        })
      }

      onCreated()
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save donor')
      setSaving(false)
    }
  }

  const giftFields = (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-stone-500 mb-1 block">Amount <span className="text-red-400">*</span></label>
          <div className="relative">
            <DollarSign size={12} className="absolute left-2.5 top-2.5 text-stone-400" />
            <input type="number" className={inputCls + ' pl-6'} placeholder="0" value={giftAmount} onChange={e => setGiftAmount(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="text-xs text-stone-500 mb-1 block">Date <span className="text-red-400">*</span></label>
          <input type="date" className={inputCls} value={giftDate} onChange={e => setGiftDate(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-stone-500 mb-1 block">Donation Type</label>
          <select className={inputCls} value={giftType} onChange={e => setGiftType(e.target.value as DonationType)}>
            <option value="Donation">Donation</option>
            <option value="Membership">Membership</option>
            <option value="Restricted">Restricted</option>
            <option value="Membership, Donation">Membership, Donation</option>
            <option value="Brick Purchase">Brick Purchase</option>
            <option value="Tribute">Tribute</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-stone-500 mb-1 block">Payment Type</label>
          <select className={inputCls} value={giftPaymentType} onChange={e => setGiftPaymentType(e.target.value as PaymentType | '')}>
            <option value="">—</option>
            <option value="Website">Website</option>
            <option value="Check">Check</option>
            <option value="Cash">Cash</option>
            <option value="Credit Card">Credit Card</option>
            <option value="ACH">ACH</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs text-stone-500 mb-1 block">Benefits</label>
        <input className={inputCls} placeholder="Any benefits associated with this gift..." value={giftBenefits} onChange={e => setGiftBenefits(e.target.value)} />
      </div>
      <div>
        <label className="text-xs text-stone-500 mb-1 block">Donation Notes</label>
        <input className={inputCls} placeholder="Notes about this gift..." value={giftDonationNotes} onChange={e => setGiftDonationNotes(e.target.value)} />
      </div>
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={giftAcknowledged} onChange={e => setGiftAcknowledged(e.target.checked)} className="rounded border-stone-300 accent-amber-500" />
          <span className="text-xs text-stone-500">Acknowledged / Thanked</span>
        </label>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-stone-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-2">
            {mode !== 'search' && (
              <button onClick={() => { setMode('search'); setExistingDonor(null); setError('') }}
                className="p-1 text-stone-400 hover:text-stone-600 rounded">
                <ChevronRight size={14} className="rotate-180" />
              </button>
            )}
            <h2 className="text-lg font-semibold text-stone-800" style={{ fontFamily: 'var(--font-serif)' }}>
              {mode === 'existing' ? `Gift for ${existingDonor?.formal_name}` : mode === 'new' ? 'New Donor' : 'Add Donation'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-stone-100 rounded-lg text-stone-400">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Search step */}
          {mode === 'search' && (
            <>
              <div>
                <label className="text-xs text-stone-500 mb-1.5 block">Search for an existing donor</label>
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-2.5 text-stone-400" />
                  <input
                    autoFocus
                    className={inputCls + ' pl-8'}
                    placeholder="Type a name…"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                  />
                </div>
                {query.trim() && (
                  <div className="mt-1 border border-stone-200 rounded-lg overflow-hidden">
                    {searching ? (
                      <p className="px-3 py-2 text-xs text-stone-400">Searching…</p>
                    ) : results.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-stone-400">No matches found</p>
                    ) : (
                      results.map(d => (
                        <button key={d.id} onClick={() => selectExisting(d)}
                          className="w-full text-left px-3 py-2.5 hover:bg-amber-50 border-b border-stone-100 last:border-0 transition-colors">
                          <p className="text-sm font-medium text-stone-800">{d.formal_name}</p>
                          {(d.informal_first_name || d.email) && (
                            <p className="text-xs text-stone-400">{[d.informal_first_name, d.email].filter(Boolean).join(' · ')}</p>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-stone-100" />
                <span className="text-xs text-stone-400">or</span>
                <div className="flex-1 h-px bg-stone-100" />
              </div>

              <button onClick={() => setMode('new')}
                className="w-full py-2 border border-dashed border-stone-300 rounded-lg text-sm text-stone-500 hover:border-amber-300 hover:text-amber-700 transition-colors">
                + Create new donor profile
              </button>
            </>
          )}

          {/* Add gift to existing donor */}
          {mode === 'existing' && (
            <>
              <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Gift Details</h3>
              {giftFields}
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button onClick={saveToExisting} disabled={saving || !giftAmount || !giftDate}
                  className="px-4 py-2 text-white text-sm rounded-lg disabled:opacity-50 font-medium" style={goldBtn}>
                  {saving ? 'Saving...' : 'Add Gift'}
                </button>
                <button onClick={onClose} className="px-4 py-2 bg-stone-100 text-stone-600 text-sm rounded-lg hover:bg-stone-200">
                  Cancel
                </button>
              </div>
            </>
          )}

          {/* Create new donor */}
          {mode === 'new' && (
            <>
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Contact Info</h3>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-stone-500 mb-1 block">
                      Formal Name <span className="text-red-400">*</span>
                      <span className="font-normal text-stone-300 ml-1">— full name as it appears on correspondence</span>
                    </label>
                    <input className={inputCls} placeholder="e.g. Mr. and Mrs. John Smith" value={form.formal_name} onChange={e => set({ formal_name: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-stone-500 mb-1 block">Informal First Name <span className="text-stone-300">— for personal communication</span></label>
                    <input className={inputCls} placeholder="e.g. John" value={form.informal_first_name} onChange={e => set({ informal_first_name: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-stone-500 mb-1 block">Email</label>
                      <input className={inputCls} type="email" placeholder="email@example.com" value={form.email} onChange={e => set({ email: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs text-stone-500 mb-1 block">Phone</label>
                      <input className={inputCls} type="tel" placeholder="(555) 000-0000" value={form.phone} onChange={e => set({ phone: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-stone-500 mb-1 block">Employer</label>
                      <input className={inputCls} placeholder="Company or organization" value={form.employer} onChange={e => set({ employer: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs text-stone-500 mb-1 block">Account Type</label>
                      <select className={inputCls} value={form.account_type} onChange={e => set({ account_type: e.target.value })}>
                        <option value="">—</option>
                        <option value="Individual">Individual</option>
                        <option value="Family">Family</option>
                        <option value="Household">Household</option>
                        <option value="Foundation">Foundation</option>
                        <option value="Corporate">Corporate</option>
                        <option value="Organization">Organization</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-stone-500 mb-1 block">Address</label>
                    <textarea className={inputCls + ' resize-none'} rows={2} placeholder="Mailing address" value={form.address} onChange={e => set({ address: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">First Gift <span className="font-normal normal-case text-stone-300">(optional)</span></h3>
                {giftFields}
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <div className="flex gap-2 pt-1">
                <button onClick={saveNew} disabled={saving} className="px-4 py-2 text-white text-sm rounded-lg disabled:opacity-50 font-medium" style={goldBtn}>
                  {saving ? 'Saving...' : 'Add Donor'}
                </button>
                <button onClick={onClose} className="px-4 py-2 bg-stone-100 text-stone-600 text-sm rounded-lg hover:bg-stone-200">
                  Cancel
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
