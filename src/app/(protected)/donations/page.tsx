'use client'
import { useState, useEffect, useMemo } from 'react'
import { Heart, UserPlus, Tags, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cacheRead, cacheWrite, TTL_SHORT } from '@/lib/cache'
import { Donor, Donation, DonorWithStats, Tag } from '@/lib/types'
import { getTier, getStatus } from '@/lib/tiers'
import DonorList from '@/components/DonorList'
import DonorPanel from '@/components/DonorPanel'
import FilterBar, { Filters } from '@/components/FilterBar'
import Sidebar from '@/components/Sidebar'
import AddDonorModal from '@/components/AddDonorModal'
import AddToListModal from '@/components/AddToListModal'

const CURRENT_YEAR = new Date().getFullYear()

function buildDonorWithStats(donor: Donor, donations: Donation[]): DonorWithStats {
  const currentYearTotal = donations
    .filter(d => new Date(d.date).getFullYear() === CURRENT_YEAR)
    .reduce((sum, d) => sum + d.amount, 0)

  const lifetimeFromDB = donations.reduce((sum, d) => sum + d.amount, 0)
  const lifetimeTotal = Math.max(lifetimeFromDB, donor.historical_lifetime_giving)

  const sortedDonations = [...donations].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const lastGift = sortedDonations[0] ?? null

  const status = getStatus(lastGift?.date ?? null)
  const tier = getTier(currentYearTotal)
  const totalDonationCount = Math.max(donations.length, donor.historical_donation_count)

  return {
    ...donor,
    donations,
    current_year_total: currentYearTotal,
    lifetime_total: lifetimeTotal,
    last_gift_amount: lastGift?.amount ?? null,
    last_gift_date: lastGift?.date ?? null,
    total_donation_count: totalDonationCount,
    status,
    tier,
  }
}

export default function Home() {
  const [donors, setDonors] = useState<DonorWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<DonorWithStats | null>(null)
  const [showAddDonor, setShowAddDonor] = useState(false)
  const [showAddToList, setShowAddToList] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: 'current',
    tier: 'all',
    hasAddress: 'all',
    donationType: 'all',
    year: 'all',
  })

  async function loadDonors() {
    try {
      const { data: donorRows, error: donorErr } = await supabase
        .from('donors')
        .select('*')
        .order('formal_name')

      if (donorErr) throw new Error(donorErr.message)

      const { data: donationRows, error: donationErr } = await supabase
        .from('donations')
        .select('*')

      if (donationErr) throw new Error(donationErr.message)

      const donationsByDonor = (donationRows ?? []).reduce<Record<string, Donation[]>>((acc, d) => {
        if (!acc[d.donor_id]) acc[d.donor_id] = []
        acc[d.donor_id].push(d)
        return acc
      }, {})

      const donorIds = (donorRows ?? []).map((d: Donor) => d.id)
      const { data: tagRows } = donorIds.length
        ? await supabase.from('donor_tags').select('donor_id, tags(*)').in('donor_id', donorIds)
        : { data: [] }

      const tagsByDonor = (tagRows ?? []).reduce<Record<string, Tag[]>>((acc, row) => {
        const r = row as unknown as { donor_id: string; tags: Tag | null }
        if (!r.tags) return acc
        if (!acc[r.donor_id]) acc[r.donor_id] = []
        acc[r.donor_id].push(r.tags)
        return acc
      }, {})

      const built = (donorRows ?? []).map((d: Donor) => ({
        ...buildDonorWithStats(d, donationsByDonor[d.id] ?? []),
        tags: tagsByDonor[d.id] ?? [],
      }))
      setDonors(built)
      cacheWrite('donors', built, TTL_SHORT)
      setError(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load donors')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const cached = cacheRead<DonorWithStats[]>('donors')
    if (cached) { setDonors(cached); setLoading(false) }
    loadDonors()
  }, [])

  async function handleUpdated() {
    await loadDonors()
  }

  const donationTypes = useMemo(() => {
    const types = new Set<string>()
    donors.forEach(d => d.donations.forEach(don => { if (don.type) types.add(don.type) }))
    return [...types].sort()
  }, [donors])

  const years = useMemo(() => {
    const ys = new Set<string>()
    donors.forEach(d => d.donations.forEach(don => ys.add(String(new Date(don.date).getFullYear()))))
    return [...ys].sort((a, b) => Number(b) - Number(a))
  }, [donors])

  const filtered = useMemo(() => {
    return donors.filter(d => {
      if (filters.search) {
        const q = filters.search.toLowerCase()
        if (!d.formal_name.toLowerCase().includes(q) &&
            !(d.informal_first_name ?? '').toLowerCase().includes(q) &&
            !(d.email ?? '').toLowerCase().includes(q)) return false
      }
      if (filters.status !== 'all' && d.status !== filters.status) return false
      if (filters.tier !== 'all' && d.tier !== filters.tier) return false
      if (filters.hasAddress === 'yes' && !d.address) return false
      if (filters.hasAddress === 'no' && d.address) return false
      if (filters.donationType !== 'all' && !d.donations.some(don => don.type === filters.donationType)) return false
      if (filters.year !== 'all') {
        const yr = Number(filters.year)
        const hasDonationInYear = d.donations.some(don => new Date(don.date).getFullYear() === yr)
        if (!hasDonationInYear) return false
      }
      return true
    })
  }, [donors, filters])

  function handleExport() {
    const rows = [
      ['Formal Name', 'Informal First Name', 'Address', 'Status', 'Member Tier', 'This Year', 'Lifetime', 'Last Gift Date', 'Email', 'Phone'],
      ...filtered.map(d => [
        d.formal_name,
        d.informal_first_name ?? '',
        d.address ?? '',
        d.status.replace(/_/g, ' '),
        d.tier.replace(/_/g, ' '),
        d.current_year_total.toFixed(2),
        Math.max(d.lifetime_total, d.historical_lifetime_giving).toFixed(2),
        d.last_gift_date ?? '',
        d.email ?? '',
        d.phone ?? '',
      ])
    ]
    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `north-star-donors-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleToggle(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function handleToggleAll(ids: string[]) {
    const allChecked = ids.every(id => selectedIds.has(id))
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (allChecked) ids.forEach(id => next.delete(id))
      else ids.forEach(id => next.add(id))
      return next
    })
  }

  const selectedFresh = selected ? donors.find(d => d.id === selected.id) ?? selected : null

  const currentYear = new Date().getFullYear()
  const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

  const statsYear = filters.year !== 'all' ? Number(filters.year) : null
  const statsType = filters.donationType !== 'all' ? filters.donationType : null

  const statsTotal = filtered.reduce((sum, d) => {
    return sum + d.donations
      .filter(don => {
        if (statsYear && new Date(don.date).getFullYear() !== statsYear) return false
        if (statsType && don.type !== statsType) return false
        return true
      })
      .reduce((s, don) => s + don.amount, 0)
  }, 0)

  const statsDonorCount = filtered.length

  const statsMemberCount = filtered.filter(d => {
    const memberDonations = d.donations.filter(don => {
      if (statsYear && new Date(don.date).getFullYear() !== statsYear) return false
      return don.type === 'Membership' || don.type === 'Membership, Donation'
    })
    return memberDonations.length > 0
  }).length

  const statsLabel = [
    statsYear ? String(statsYear) : `${currentYear} YTD`,
    statsType ?? '',
  ].filter(Boolean).join(' · ')

  const isFiltered = filters.status !== 'all' || filters.tier !== 'all' || filters.search ||
    filters.hasAddress !== 'all' || statsYear || statsType

  return (
    <div className="flex min-h-screen flex-1">
      <Sidebar activePage="donations" />

      <div className="flex-1 flex flex-col min-h-screen overflow-hidden" style={{ background: 'var(--page-bg)' }}>
        {/* Page header */}
        <div className="px-8 pt-8 pb-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white border border-stone-200 flex items-center justify-center shadow-sm">
                <Heart size={16} className="text-stone-400" strokeWidth={1.5} />
              </div>
              <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-serif)', color: 'var(--gold)' }}>
                Donors
              </h1>
            </div>
            <button
              onClick={() => setShowAddDonor(true)}
              className="flex items-center gap-2 px-4 py-2 text-white text-sm rounded-xl font-medium shadow-sm"
              style={{ background: 'var(--gold)' }}
            >
              <UserPlus size={15} />
              Add Donor
            </button>
          </div>

          {/* Stats cards */}
          {!loading && !error && (
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className={`rounded-xl border px-5 py-4 shadow-sm ${isFiltered ? 'bg-amber-50 border-amber-200' : 'bg-white border-stone-200'}`}>
                <p className="text-xs text-stone-400 font-medium mb-1">Total Raised</p>
                <p className="text-2xl font-semibold text-stone-800">{fmt(statsTotal)}</p>
                <p className="text-xs text-stone-400 mt-0.5">{statsLabel}</p>
              </div>
              <div className={`rounded-xl border px-5 py-4 shadow-sm ${isFiltered ? 'bg-amber-50 border-amber-200' : 'bg-white border-stone-200'}`}>
                <p className="text-xs text-stone-400 font-medium mb-1">Donors in View</p>
                <p className="text-2xl font-semibold text-stone-800">{statsDonorCount}</p>
                <p className="text-xs text-stone-400 mt-0.5">{isFiltered ? 'matching filters' : `gave in ${currentYear - 1}–${currentYear}`}</p>
              </div>
              <div className={`rounded-xl border px-5 py-4 shadow-sm ${isFiltered ? 'bg-amber-50 border-amber-200' : 'bg-white border-stone-200'}`}>
                <p className="text-xs text-stone-400 font-medium mb-1">Members</p>
                <p className="text-2xl font-semibold text-stone-800">{statsMemberCount}</p>
                <p className="text-xs text-stone-400 mt-0.5">{statsYear ? `membership in ${statsYear}` : 'membership donations'}</p>
              </div>
              <div className="bg-white rounded-xl border border-stone-200 px-5 py-4 shadow-sm">
                <p className="text-xs text-stone-400 font-medium mb-1">Total Records</p>
                <p className="text-2xl font-semibold text-stone-800">{donors.length}</p>
                <p className="text-xs text-stone-400 mt-0.5">all time</p>
              </div>
            </div>
          )}
        </div>

        {/* Table card */}
        <div className="mx-8 mb-8 bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden flex-1">
          <FilterBar filters={filters} onChange={setFilters} onExport={handleExport} count={filtered.length} donationTypes={donationTypes} years={years} />

          {loading ? (
            <div className="flex items-center justify-center py-24 text-stone-400 text-sm">
              Loading donors...
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-24 gap-2">
              <p className="text-red-500 font-medium text-sm">Failed to load donors</p>
              <p className="text-xs text-stone-400">{error}</p>
              <button onClick={loadDonors} className="mt-2 px-4 py-2 text-white text-sm rounded-lg" style={{ background: 'var(--gold)' }}>
                Retry
              </button>
            </div>
          ) : (
            <DonorList
              donors={filtered}
              onSelect={setSelected}
              selectedIds={selectedIds}
              onToggle={handleToggle}
              onToggleAll={handleToggleAll}
            />
          )}
        </div>
      </div>

      {/* Selection action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-stone-900 text-white px-5 py-3 rounded-2xl shadow-2xl">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <div className="w-px h-4 bg-white/20" />
          <button
            onClick={() => setShowAddToList(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-white/10"
            style={{ color: '#f0ebe3' }}
          >
            <Tags size={14} />
            Add to a new or existing list...
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="p-1 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {selectedFresh && (
        <DonorPanel
          donor={selectedFresh}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
        />
      )}

      {showAddDonor && (
        <AddDonorModal
          onClose={() => setShowAddDonor(false)}
          onCreated={handleUpdated}
        />
      )}

      {showAddToList && (
        <AddToListModal
          donorIds={[...selectedIds]}
          onClose={() => setShowAddToList(false)}
          onDone={() => setSelectedIds(new Set())}
        />
      )}
    </div>
  )
}
