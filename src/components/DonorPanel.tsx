'use client'
import { useState, useEffect, useRef } from 'react'
import { X, MapPin, Mail, Phone, Briefcase, Plus, DollarSign, Pencil, Trash2, Check, GitMerge, Star, Tag, Camera } from 'lucide-react'
import { DonorWithStats, Donation, DonationType, PaymentType, Tag as TagType, OutreachEntry, OutreachStatus } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import TierBadge from './TierBadge'
import StatusBadge from './StatusBadge'
import MergeDonorModal from './MergeDonorModal'
import TagPickerModal from './TagPickerModal'

const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const fmtDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

interface Props {
  donor: DonorWithStats
  onClose: () => void
  onUpdated: () => void
}

const goldBtn = { background: 'var(--gold)' }

type DonationEdit = {
  amount: string
  date: string
  type: DonationType
  payment_type: PaymentType | ''
  benefits: string
  acknowledged: boolean
  donation_notes: string
}

export default function DonorPanel({ donor, onClose, onUpdated }: Props) {
  const [saving, setSaving] = useState(false)
  const [starred, setStarred] = useState(donor.starred ?? false)
  const [starNote, setStarNote] = useState(donor.star_note ?? '')
  const [showStarNote, setShowStarNote] = useState(false)
  const [starSaving, setStarSaving] = useState(false)
  const [deceased, setDeceased] = useState(donor.deceased ?? false)
  const [donorTags, setDonorTags] = useState<TagType[]>([])
  const [showTagPicker, setShowTagPicker] = useState(false)
  const [linkedOutreach, setLinkedOutreach] = useState<OutreachEntry[]>([])

  useEffect(() => {
    supabase.from('donor_tags').select('tags(*)').eq('donor_id', donor.id)
      .then(({ data }) => {
        setDonorTags((data ?? []).flatMap((r: unknown) => { const row = r as { tags: TagType | null }; return row.tags ? [row.tags] : [] }))
      })
    supabase.from('outreach_entries').select('*').eq('linked_donor_id', donor.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setLinkedOutreach((data ?? []) as OutreachEntry[]))
  }, [donor.id])

  async function toggleDeceased(val: boolean) {
    setDeceased(val)
    await supabase.from('donors').update({ deceased: val, updated_at: new Date().toISOString() }).eq('id', donor.id)
    onUpdated()
  }

  async function removeTag(tagId: string) {
    await supabase.from('donor_tags').delete().eq('donor_id', donor.id).eq('tag_id', tagId)
    setDonorTags(prev => prev.filter(t => t.id !== tagId))
  }
  const [showAddDonation, setShowAddDonation] = useState(false)
  const [newAmount, setNewAmount] = useState('')
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10))
  const [newType, setNewType] = useState<DonationType>('Donation')
  const [newPaymentType, setNewPaymentType] = useState<PaymentType | ''>('')
  const [newBenefits, setNewBenefits] = useState('')
  const [newAcknowledged, setNewAcknowledged] = useState(false)
  const [newDonationNotes, setNewDonationNotes] = useState('')
  const [editField, setEditField] = useState<string | null>(null)
  const [editValues, setEditValues] = useState({
    formal_name: donor.formal_name,
    informal_first_name: donor.informal_first_name ?? '',
    email: donor.email ?? '',
    phone: donor.phone ?? '',
    employer: donor.employer ?? '',
    address: donor.address ?? '',
    account_type: donor.account_type ?? '',
    background: donor.background ?? '',
    nsh_contact: donor.nsh_contact ?? '',
    first_connected: donor.first_connected ?? '',
    donor_notes: donor.donor_notes ?? '',
    also_supports: donor.also_supports ?? '',
  })
  const [editingDonationId, setEditingDonationId] = useState<string | null>(null)
  const [donationEdit, setDonationEdit] = useState<DonationEdit>({ amount: '', date: '', type: 'Donation', payment_type: '', benefits: '', acknowledged: false, donation_notes: '' })
  const [showMerge, setShowMerge] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(donor.avatar_url ?? null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  async function uploadAvatar(file: File) {
    setUploadingAvatar(true)
    const ext = file.name.split('.').pop()
    const path = `${donor.id}/avatar.${ext}`
    await supabase.storage.from('donor-avatars').remove([path])
    const { error: upErr } = await supabase.storage.from('donor-avatars').upload(path, file, { upsert: true })
    if (upErr) { setUploadingAvatar(false); return }
    const { data: { publicUrl } } = supabase.storage.from('donor-avatars').getPublicUrl(path)
    const urlWithBust = `${publicUrl}?t=${Date.now()}`
    await supabase.from('donors').update({ avatar_url: urlWithBust, updated_at: new Date().toISOString() }).eq('id', donor.id)
    setAvatarUrl(urlWithBust)
    setUploadingAvatar(false)
    onUpdated()
  }

  async function saveNotes() {
    setSaving(true)
    await supabase.from('donors').update({ donor_notes: editValues.donor_notes.trim() || null, updated_at: new Date().toISOString() }).eq('id', donor.id)
    setSaving(false)
    onUpdated()
  }

  async function confirmStar() {
    setStarSaving(true)
    await supabase.from('donors').update({ starred: true, star_note: starNote.trim() || null }).eq('id', donor.id)
    setStarred(true)
    setShowStarNote(false)
    setStarSaving(false)
    onUpdated()
  }

  async function removeStar() {
    await supabase.from('donors').update({ starred: false, star_note: null }).eq('id', donor.id)
    setStarred(false)
    setStarNote('')
    onUpdated()
  }

  async function saveField(field: string) {
    await supabase.from('donors').update({ [field]: editValues[field as keyof typeof editValues] || null, updated_at: new Date().toISOString() }).eq('id', donor.id)
    setEditField(null)
    onUpdated()
  }

  async function addDonation() {
    const amount = parseFloat(newAmount)
    if (!amount || !newDate) return
    const { error: insertErr } = await supabase.from('donations').insert({
      donor_id: donor.id,
      amount,
      date: newDate,
      type: newType,
      payment_type: newPaymentType || null,
      benefits: newBenefits.trim() || null,
      acknowledged: newAcknowledged,
      donation_notes: newDonationNotes.trim() || null,
    })
    if (insertErr) {
      alert(`Failed to save donation: ${insertErr.message}`)
      return
    }

    // Log to Google Sheets via Supabase Edge Function (handles redirects server-side)
    const lastName = donor.formal_name.split(' ').slice(-1)[0] ?? ''
    fetch('https://uvzwhhwzelaelfhfkvdb.supabase.co/functions/v1/log-donation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '' },
      body: JSON.stringify({
        sheet: '2026 Donations',
        row: {
          'Donor Name':     donor.formal_name,
          'Amount':         amount,
          'Close Date':     newDate,
          'Donation Type':  newType,
          'Payment Type':   newPaymentType || '',
          'Donation Notes': newDonationNotes.trim(),
          'Benefits':       newBenefits.trim(),
          'Salesforce':     '',
          'Acknowledged':   newAcknowledged ? 'TRUE' : 'FALSE',
          'Account Type':   donor.account_type ?? '',
          'Address':        donor.address ?? '',
          'Email':          donor.email ?? '',
          'Phone Number':   donor.phone ?? '',
          'Informal Names': donor.informal_first_name ?? '',
          'Last Name':      lastName,
          'Notes':          donor.background ?? '',
          'Donor Notes':    donor.donor_notes ?? '',
        },
      }),
    }).then(r => r.json()).then(j => { if (!j.ok) console.error('Sheet log failed:', j) }).catch(err => console.error('Sheet log error:', err))

    setShowAddDonation(false)
    setNewAmount('')
    setNewPaymentType('')
    setNewBenefits('')
    setNewAcknowledged(false)
    setNewDonationNotes('')
    onUpdated()
  }

  function startEditDonation(d: Donation) {
    setEditingDonationId(d.id)
    setDonationEdit({
      amount: String(d.amount),
      date: d.date,
      type: d.type,
      payment_type: (d.payment_type as PaymentType | null) ?? '',
      benefits: d.benefits ?? '',
      acknowledged: d.acknowledged ?? false,
      donation_notes: d.donation_notes ?? '',
    })
  }

  async function saveDonation(id: string) {
    const amount = parseFloat(donationEdit.amount)
    if (!amount || !donationEdit.date) return
    await supabase.from('donations').update({
      amount,
      date: donationEdit.date,
      type: donationEdit.type,
      payment_type: donationEdit.payment_type || null,
      benefits: donationEdit.benefits.trim() || null,
      acknowledged: donationEdit.acknowledged,
      donation_notes: donationEdit.donation_notes.trim() || null,
    }).eq('id', id)
    setEditingDonationId(null)
    onUpdated()
  }

  async function deleteDonor() {
    await supabase.from('donations').delete().eq('donor_id', donor.id)
    await supabase.from('donor_tags').delete().eq('donor_id', donor.id)
    await supabase.from('list_donors').delete().eq('donor_id', donor.id)
    await supabase.from('donors').delete().eq('id', donor.id)
    onClose()
    onUpdated()
  }

  async function deleteDonation(id: string) {
    if (!confirm('Delete this gift?')) return
    await supabase.from('donations').delete().eq('id', id)
    onUpdated()
  }

  const historicalExtra = donor.historical_donation_count - donor.donations.length
  const displayLifetime = Math.max(donor.lifetime_total, donor.historical_lifetime_giving)

  const sortedDonations = [...donor.donations].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // Group donations by year, newest first
  const donationsByYear = sortedDonations.reduce<Record<number, Donation[]>>((acc, d) => {
    const yr = new Date(d.date).getFullYear()
    if (!acc[yr]) acc[yr] = []
    acc[yr].push(d)
    return acc
  }, {})
  const years = Object.keys(donationsByYear).map(Number).sort((a, b) => b - a)

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white h-full overflow-y-auto shadow-2xl flex flex-col">

        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-stone-100 px-6 py-4 z-10">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              {/* Avatar bubble */}
              <div
                onClick={() => !uploadingAvatar && avatarInputRef.current?.click()}
                title="Upload photo"
                style={{ width: 48, height: 48, borderRadius: '50%', background: avatarUrl ? 'transparent' : '#e7e5e4', flexShrink: 0, position: 'relative', overflow: 'hidden', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}
                onMouseEnter={e => { (e.currentTarget.lastElementChild as HTMLElement).style.opacity = '1' }}
                onMouseLeave={e => { (e.currentTarget.lastElementChild as HTMLElement).style.opacity = '0' }}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: 18, fontWeight: 600, color: '#78716c', userSelect: 'none' }}>
                    {donor.formal_name.charAt(0).toUpperCase()}
                  </span>
                )}
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.15s' }}>
                  {uploadingAvatar
                    ? <div style={{ width: 16, height: 16, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                    : <Camera size={14} color="white" />}
                </div>
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); e.target.value = '' }}
              />
              <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-stone-800" style={{ fontFamily: 'var(--font-serif)' }}>
                  {donor.formal_name}
                </h2>
                {starred && (
                  <Star size={16} fill="#b5a185" stroke="#b5a185" className="flex-shrink-0 mt-0.5" />
                )}
              </div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <TierBadge tier={donor.tier} />
                <StatusBadge status={donor.status} />
              </div>
              </div>
            </div>
            <div className="flex items-center gap-1 ml-2 flex-shrink-0">
              <button
                onClick={() => setShowMerge(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-stone-500 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
                title="Merge with another donor"
              >
                <GitMerge size={13} />
                Merge
              </button>
              {confirmDelete ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={deleteDonor}
                    className="px-2.5 py-1.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                  >
                    Delete?
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="px-2.5 py-1.5 text-xs text-stone-500 hover:bg-stone-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="p-1.5 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete donor"
                >
                  <Trash2 size={14} />
                </button>
              )}
              <button onClick={onClose} className="p-1.5 hover:bg-stone-100 rounded-lg text-stone-400">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Deceased toggle */}
          <label className={`flex items-center gap-2 mt-3 cursor-pointer w-fit px-3 py-1.5 rounded-lg border transition-colors ${deceased ? 'bg-stone-100 border-stone-300' : 'border-stone-200 hover:border-stone-300'}`}>
            <input type="checkbox" checked={deceased} onChange={e => toggleDeceased(e.target.checked)}
              className="rounded border-stone-300 accent-stone-600 cursor-pointer" />
            <span className={`text-xs font-medium select-none ${deceased ? 'text-stone-600' : 'text-stone-400'}`}>Deceased</span>
          </label>

          {/* Star controls */}
          {starred ? (
            <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
              <Star size={13} fill="#b5a185" stroke="#b5a185" className="flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                {starNote && <p className="text-xs text-stone-600 leading-relaxed">{starNote}</p>}
                {!starNote && <p className="text-xs text-stone-400 italic">No note</p>}
              </div>
              <button onClick={removeStar} className="text-[10px] text-stone-300 hover:text-red-400 flex-shrink-0 transition-colors">Remove</button>
            </div>
          ) : showStarNote ? (
            <div className="mt-3 space-y-2">
              <textarea
                autoFocus
                className="w-full border border-amber-300 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-300 text-stone-700 bg-amber-50/50"
                rows={2}
                placeholder="Add a note about this donor… (optional)"
                value={starNote}
                onChange={e => setStarNote(e.target.value)}
              />
              <div className="flex gap-2">
                <button onClick={confirmStar} disabled={starSaving}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-white text-xs rounded-lg font-medium disabled:opacity-50"
                  style={{ background: 'var(--gold)' }}>
                  <Star size={11} fill="white" stroke="white" />
                  {starSaving ? 'Saving…' : 'Star Donor'}
                </button>
                <button onClick={() => { setShowStarNote(false); setStarNote('') }}
                  className="px-3 py-1.5 bg-stone-100 text-stone-600 text-xs rounded-lg hover:bg-stone-200">Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowStarNote(true)}
              className="mt-2.5 flex items-center gap-1.5 text-xs text-stone-400 hover:text-amber-600 transition-colors">
              <Star size={12} /> Star this donor
            </button>
          )}
        </div>

        <div className="flex-1 px-6 py-5 space-y-6">
          {/* Giving summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-stone-50 rounded-xl p-3 text-center border border-stone-100">
              <p className="text-xs text-stone-400 font-medium mb-1">This Year</p>
              <p className="text-lg font-semibold text-stone-800">{fmt(donor.current_year_total)}</p>
            </div>
            <div className="bg-stone-50 rounded-xl p-3 text-center border border-stone-100">
              <p className="text-xs text-stone-400 font-medium mb-1">Lifetime</p>
              <p className="text-lg font-semibold text-stone-800">{fmt(displayLifetime)}</p>
            </div>
            <div className="bg-stone-50 rounded-xl p-3 text-center border border-stone-100">
              <p className="text-xs text-stone-400 font-medium mb-1">Gifts</p>
              <p className="text-lg font-semibold text-stone-800">{donor.total_donation_count}</p>
            </div>
          </div>

          {/* Contact info */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Contact</h3>
              <span className="text-[10px] text-stone-300 italic">Click any field to edit</span>
            </div>
            <div className="space-y-1.5">
              {(['formal_name', 'informal_first_name', 'email', 'phone', 'employer', 'account_type', 'address'] as const).map(field => {
                const icons: Record<string, React.ReactNode> = {
                  email: <Mail size={13} />, phone: <Phone size={13} />,
                  employer: <Briefcase size={13} />, address: <MapPin size={13} />,
                }
                const labels: Record<string, string> = {
                  formal_name: 'Formal Name', informal_first_name: 'Informal First Name',
                  email: 'Email', phone: 'Phone', employer: 'Employer',
                  account_type: 'Account Type', address: 'Address',
                }
                return (
                  <div key={field} className="flex items-start gap-2">
                    <span className="text-stone-300 mt-3.5 w-4 flex-shrink-0">{icons[field]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-stone-400 uppercase tracking-wide">{labels[field]}</p>
                      {editField === field ? (
                        <div className="flex gap-1 mt-0.5">
                          {field === 'address' ? (
                            <textarea
                              className="flex-1 text-sm border border-stone-200 rounded-lg px-2 py-1 resize-none focus:outline-none focus:ring-2 focus:ring-amber-300"
                              rows={2}
                              autoFocus
                              value={editValues[field]}
                              onChange={e => setEditValues(v => ({ ...v, [field]: e.target.value }))}
                            />
                          ) : field === 'account_type' ? (
                            <select
                              autoFocus
                              className="flex-1 text-sm border border-stone-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white text-stone-700"
                              value={editValues[field]}
                              onChange={e => setEditValues(v => ({ ...v, [field]: e.target.value }))}
                            >
                              <option value="">— unset —</option>
                              {['Individual','Family','Household','Foundation','Corporate','Organization'].map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          ) : (
                            <input
                              className="flex-1 text-sm border border-stone-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-300"
                              autoFocus
                              value={editValues[field]}
                              onChange={e => setEditValues(v => ({ ...v, [field]: e.target.value }))}
                              onKeyDown={e => { if (e.key === 'Enter') saveField(field); if (e.key === 'Escape') setEditField(null) }}
                            />
                          )}
                          <button onClick={() => saveField(field)} className="px-2 py-1 text-white text-xs rounded-lg" style={goldBtn}>Save</button>
                          <button onClick={() => setEditField(null)} className="px-2 py-1 bg-stone-100 text-stone-600 text-xs rounded-lg hover:bg-stone-200">✕</button>
                        </div>
                      ) : (
                        <p
                          className="text-sm text-stone-700 cursor-pointer hover:bg-stone-50 rounded px-1 -mx-1 min-h-[1.5rem] py-0.5 group flex items-center gap-1"
                          onClick={() => setEditField(field)}
                        >
                          <span className="flex-1">{editValues[field] || <span className="text-stone-300 italic text-xs">—</span>}</span>
                          <Pencil size={10} className="text-stone-300 opacity-0 group-hover:opacity-100 flex-shrink-0" />
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Profile */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Profile</h3>
              <span className="text-[10px] text-stone-300 italic">Click any field to edit</span>
            </div>
            <div className="space-y-3">
              {([
                { field: 'background', label: 'Background', type: 'textarea' },
                { field: 'first_connected', label: 'What Ties Them to North Star House', type: 'textarea' },
                { field: 'nsh_contact', label: 'Main NSH Contact', type: 'select' },
              ] as { field: 'nsh_contact' | 'first_connected' | 'background'; label: string; type: string }[]).map(({ field, label, type }) => (
                <div key={field}>
                  <p className="text-[10px] text-stone-400 uppercase tracking-wide mb-0.5">{label}</p>
                  {editField === field ? (
                    <div className="flex gap-1 mt-0.5">
                      {type === 'select' ? (
                        <select
                          autoFocus
                          className="flex-1 text-sm border border-stone-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white text-stone-700"
                          value={editValues[field]}
                          onChange={e => setEditValues(v => ({ ...v, [field]: e.target.value }))}
                        >
                          <option value="">— unassigned —</option>
                          {['Kaelen', 'Haley', 'Derek'].map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      ) : (
                        <textarea
                          autoFocus
                          className="flex-1 text-sm border border-stone-200 rounded-lg px-2 py-1 resize-none focus:outline-none focus:ring-2 focus:ring-amber-300 text-stone-700"
                          rows={3}
                          value={editValues[field]}
                          onChange={e => setEditValues(v => ({ ...v, [field]: e.target.value }))}
                        />
                      )}
                      <div className="flex flex-col gap-1">
                        <button onClick={() => saveField(field)} className="px-2 py-1 text-white text-xs rounded-lg" style={goldBtn}>Save</button>
                        <button onClick={() => setEditField(null)} className="px-2 py-1 bg-stone-100 text-stone-600 text-xs rounded-lg hover:bg-stone-200">✕</button>
                      </div>
                    </div>
                  ) : (
                    <p
                      className="text-sm text-stone-700 cursor-pointer hover:bg-stone-50 rounded px-1 -mx-1 min-h-[1.5rem] py-0.5 group flex items-start gap-1 whitespace-pre-wrap"
                      onClick={() => setEditField(field)}
                    >
                      <span className="flex-1">{editValues[field] || <span className="text-stone-300 italic text-xs">—</span>}</span>
                      <Pencil size={10} className="text-stone-300 opacity-0 group-hover:opacity-100 flex-shrink-0 mt-1" />
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Notes + Also Supports */}
          {([
            { field: 'donor_notes', label: 'More Donor Notes', placeholder: 'Add notes about this donor...' },
            { field: 'also_supports', label: 'Also Supports', placeholder: 'Other organizations or causes this donor supports...' },
          ] as { field: 'donor_notes' | 'also_supports'; label: string; placeholder: string }[]).map(({ field, label, placeholder }) => (
            <div key={field} className="space-y-1">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">{label}</p>
              {editField === field ? (
                <div className="flex gap-1">
                  <textarea
                    autoFocus
                    className="flex-1 text-sm border border-stone-200 rounded-lg px-2 py-1 resize-none focus:outline-none focus:ring-2 focus:ring-amber-300 text-stone-700"
                    rows={4}
                    value={editValues[field]}
                    onChange={e => setEditValues(v => ({ ...v, [field]: e.target.value }))}
                  />
                  <div className="flex flex-col gap-1">
                    <button onClick={() => saveField(field)} className="px-2 py-1 text-white text-xs rounded-lg" style={goldBtn}>Save</button>
                    <button onClick={() => setEditField(null)} className="px-2 py-1 bg-stone-100 text-stone-600 text-xs rounded-lg hover:bg-stone-200">✕</button>
                  </div>
                </div>
              ) : (
                <p
                  className="text-sm text-stone-700 cursor-pointer hover:bg-stone-50 rounded px-1 -mx-1 min-h-[1.5rem] py-0.5 group flex items-start gap-1 whitespace-pre-wrap"
                  onClick={() => setEditField(field)}
                >
                  <span className="flex-1">{editValues[field] || <span className="text-stone-300 italic text-xs">{placeholder}</span>}</span>
                  <Pencil size={10} className="text-stone-300 opacity-0 group-hover:opacity-100 flex-shrink-0 mt-1" />
                </p>
              )}
            </div>
          ))}

          {/* Tags */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Tags</h3>
            <div className="flex flex-wrap gap-1.5 items-center">
              {donorTags.map(tag => (
                <span key={tag.id}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                  style={{ background: tag.color }}>
                  {tag.name}
                  <button onClick={() => removeTag(tag.id)} className="hover:opacity-70 leading-none ml-0.5">×</button>
                </span>
              ))}
              <button onClick={() => setShowTagPicker(true)}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs border border-dashed border-stone-300 text-stone-400 hover:border-stone-400 hover:text-stone-600 transition-colors">
                <Tag size={10} /> Add tag
              </button>
            </div>
          </div>

          {/* Linked Outreach */}
          {linkedOutreach.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Linked Outreach</h3>
              <div className="space-y-2">
                {linkedOutreach.map(entry => (
                  <div key={entry.id} className="border border-stone-100 rounded-xl px-3 py-2.5 bg-stone-50">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-stone-700 truncate">{entry.title}</p>
                        {entry.area && <p className="text-xs text-stone-400">{entry.area}</p>}
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                        entry.status === 'completed' ? 'bg-green-100 text-green-700' :
                        entry.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                        entry.status === 'follow_up' ? 'bg-amber-100 text-amber-700' :
                        entry.status === 'no_response' ? 'bg-red-100 text-red-600' :
                        'bg-stone-100 text-stone-500'
                      }`}>
                        {entry.status.replace('_', ' ')}
                      </span>
                    </div>
                    {entry.notes && <p className="text-xs text-stone-500 mt-1.5 leading-relaxed line-clamp-2">{entry.notes}</p>}
                    {entry.date && <p className="text-[10px] text-stone-300 mt-1">{fmtDate(entry.date)}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Donation history */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Donation History</h3>
              <button onClick={() => setShowAddDonation(!showAddDonation)}
                className="flex items-center gap-1 px-2.5 py-1 text-white text-xs rounded-lg" style={goldBtn}>
                <Plus size={11} /> Add Gift
              </button>
            </div>

            {showAddDonation && (
              <div className="border border-stone-200 rounded-xl p-4 bg-stone-50 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-stone-400">Amount</label>
                    <div className="relative mt-0.5">
                      <DollarSign size={12} className="absolute left-2.5 top-2 text-stone-400" />
                      <input type="number" className="w-full border border-stone-200 rounded-lg px-2 py-1.5 pl-6 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                        placeholder="0" value={newAmount} onChange={e => setNewAmount(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-stone-400">Date</label>
                    <input type="date" className="w-full border border-stone-200 rounded-lg px-2 py-1.5 text-sm mt-0.5 focus:outline-none focus:ring-2 focus:ring-amber-300"
                      value={newDate} onChange={e => setNewDate(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-stone-400">Donation Type</label>
                    <select className="w-full border border-stone-200 rounded-lg px-2 py-1.5 text-sm mt-0.5 focus:outline-none focus:ring-2 focus:ring-amber-300"
                      value={newType} onChange={e => setNewType(e.target.value as DonationType)}>
                      <option value="Donation">Donation</option>
                      <option value="Membership">Membership</option>
                      <option value="Restricted">Restricted</option>
                      <option value="Membership, Donation">Membership, Donation</option>
                      <option value="Brick Purchase">Brick Purchase</option>
                      <option value="Tribute">Tribute</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-stone-400">Payment Type</label>
                    <select className="w-full border border-stone-200 rounded-lg px-2 py-1.5 text-sm mt-0.5 focus:outline-none focus:ring-2 focus:ring-amber-300"
                      value={newPaymentType} onChange={e => setNewPaymentType(e.target.value as PaymentType | '')}>
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
                  <label className="text-xs text-stone-400">Benefits</label>
                  <input className="w-full border border-stone-200 rounded-lg px-2 py-1.5 text-sm mt-0.5 focus:outline-none focus:ring-2 focus:ring-amber-300"
                    placeholder="Any benefits..." value={newBenefits} onChange={e => setNewBenefits(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-stone-400">Donation Notes</label>
                  <input className="w-full border border-stone-200 rounded-lg px-2 py-1.5 text-sm mt-0.5 focus:outline-none focus:ring-2 focus:ring-amber-300"
                    placeholder="Notes about this gift..." value={newDonationNotes} onChange={e => setNewDonationNotes(e.target.value)} />
                </div>
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={newAcknowledged} onChange={e => setNewAcknowledged(e.target.checked)} className="rounded border-stone-300 accent-amber-500" />
                    <span className="text-xs text-stone-500">Acknowledged</span>
                  </label>
                </div>
                <div className="flex gap-2">
                  <button onClick={addDonation} className="px-3 py-1.5 text-white text-sm rounded-lg" style={goldBtn}>Add</button>
                  <button onClick={() => setShowAddDonation(false)} className="px-3 py-1.5 bg-stone-100 text-stone-600 text-sm rounded-lg hover:bg-stone-200">Cancel</button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {years.map(yr => {
                const gifts = donationsByYear[yr]
                const yearTotal = gifts.reduce((s, d) => s + d.amount, 0)
                return (
                  <div key={yr}>
                    <div className="flex items-center justify-between mb-1 pb-1 border-b border-stone-100">
                      <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">{yr}</span>
                      <span className="text-xs font-semibold" style={{ color: 'var(--gold)' }}>{fmt(yearTotal)}</span>
                    </div>
                    <div className="space-y-0">
                      {gifts.map(d => (
                        <div key={d.id} className="border-b border-stone-100 last:border-0">
                          {editingDonationId === d.id ? (
                            <div className="py-3 space-y-2 bg-stone-50 rounded-lg px-3 my-1">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-xs text-stone-400">Amount</label>
                                  <div className="relative mt-0.5">
                                    <DollarSign size={12} className="absolute left-2.5 top-2 text-stone-400" />
                                    <input type="number" className="w-full border border-stone-200 rounded-lg px-2 py-1.5 pl-6 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                                      value={donationEdit.amount} onChange={e => setDonationEdit(v => ({ ...v, amount: e.target.value }))} />
                                  </div>
                                </div>
                                <div>
                                  <label className="text-xs text-stone-400">Date</label>
                                  <input type="date" className="w-full border border-stone-200 rounded-lg px-2 py-1.5 text-sm mt-0.5 focus:outline-none focus:ring-2 focus:ring-amber-300"
                                    value={donationEdit.date} onChange={e => setDonationEdit(v => ({ ...v, date: e.target.value }))} />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-xs text-stone-400">Donation Type</label>
                                  <select className="w-full border border-stone-200 rounded-lg px-2 py-1.5 text-sm mt-0.5 focus:outline-none focus:ring-2 focus:ring-amber-300"
                                    value={donationEdit.type} onChange={e => setDonationEdit(v => ({ ...v, type: e.target.value as DonationType }))}>
                                    <option value="Donation">Donation</option>
                                    <option value="Membership">Membership</option>
                                    <option value="Restricted">Restricted</option>
                                    <option value="Membership, Donation">Membership, Donation</option>
                                    <option value="Brick Purchase">Brick Purchase</option>
                                    <option value="Tribute">Tribute</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-xs text-stone-400">Payment Type</label>
                                  <select className="w-full border border-stone-200 rounded-lg px-2 py-1.5 text-sm mt-0.5 focus:outline-none focus:ring-2 focus:ring-amber-300"
                                    value={donationEdit.payment_type} onChange={e => setDonationEdit(v => ({ ...v, payment_type: e.target.value as PaymentType | '' }))}>
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
                                <label className="text-xs text-stone-400">Benefits</label>
                                <input className="w-full border border-stone-200 rounded-lg px-2 py-1.5 text-sm mt-0.5 focus:outline-none focus:ring-2 focus:ring-amber-300"
                                  placeholder="Any benefits..." value={donationEdit.benefits} onChange={e => setDonationEdit(v => ({ ...v, benefits: e.target.value }))} />
                              </div>
                              <div>
                                <label className="text-xs text-stone-400">Donation Notes</label>
                                <input className="w-full border border-stone-200 rounded-lg px-2 py-1.5 text-sm mt-0.5 focus:outline-none focus:ring-2 focus:ring-amber-300"
                                  value={donationEdit.donation_notes} onChange={e => setDonationEdit(v => ({ ...v, donation_notes: e.target.value }))} />
                              </div>
                              <div>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input type="checkbox" checked={donationEdit.acknowledged} onChange={e => setDonationEdit(v => ({ ...v, acknowledged: e.target.checked }))} className="rounded border-stone-300 accent-amber-500" />
                                  <span className="text-xs text-stone-500">Acknowledged</span>
                                </label>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => saveDonation(d.id)} className="flex items-center gap-1 px-3 py-1.5 text-white text-xs rounded-lg" style={goldBtn}>
                                  <Check size={11} /> Save
                                </button>
                                <button onClick={() => setEditingDonationId(null)} className="px-3 py-1.5 bg-stone-100 text-stone-600 text-xs rounded-lg hover:bg-stone-200">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between py-2.5 group">
                              <div>
                                <span className="text-sm font-medium text-stone-800">{fmt(d.amount)}</span>
                                {d.donation_notes && <p className="text-xs text-stone-400 mt-0.5">{d.donation_notes}</p>}
                                {d.acknowledged && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full mt-0.5 inline-block">Acknowledged</span>}
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <p className="text-sm text-stone-500">{fmtDate(d.date)}</p>
                                  <span className="text-xs text-stone-400">{d.type}</span>
                                  {d.payment_type && <p className="text-xs text-stone-300">{d.payment_type}</p>}
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => startEditDonation(d)} className="p-1 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded">
                                    <Pencil size={12} />
                                  </button>
                                  <button onClick={() => deleteDonation(d.id)} className="p-1 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded">
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
              {years.length === 0 && (
                <p className="text-xs text-stone-300 italic">No donations recorded yet.</p>
              )}
              {historicalExtra > 0 && (
                <div className="border-t border-stone-100 pt-2 mt-2 space-y-0">
                  {Array.from({ length: historicalExtra }).map((_, i) => (
                    <div key={`hist-${i}`} className="flex items-center justify-between py-2 opacity-50">
                      <span className="text-sm text-stone-500 italic">Historical gift</span>
                      <span className="text-xs text-stone-400">pre-import</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {showMerge && (
        <MergeDonorModal
          donor={donor}
          onClose={() => setShowMerge(false)}
          onMerged={() => { onClose(); onUpdated() }}
        />
      )}

      {showTagPicker && (
        <TagPickerModal
          donorIds={[donor.id]}
          onClose={() => setShowTagPicker(false)}
          onDone={newTags => { setDonorTags(newTags); setShowTagPicker(false) }}
        />
      )}
    </div>
  )
}
