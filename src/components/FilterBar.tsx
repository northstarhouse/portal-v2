'use client'
import { Search, Download } from 'lucide-react'
import { DonorStatus, MemberTier } from '@/lib/types'
import { TIERS, STATUS_LABELS } from '@/lib/tiers'

export interface Filters {
  search: string
  status: DonorStatus | 'all'
  tier: MemberTier | 'all'
  hasAddress: 'all' | 'yes' | 'no'
  donationType: string
  year: string
}

interface Props {
  filters: Filters
  onChange: (f: Filters) => void
  onExport: () => void
  count: number
  donationTypes: string[]
  years: string[]
}

const STATUSES: (DonorStatus | 'all')[] = ['all', 'current', 'recently_lapsed', 'long_lapsed']
const STATUS_DISPLAY: Record<string, string> = { all: 'All Statuses', ...STATUS_LABELS }

const selectCls = "border border-stone-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 text-stone-700"

export default function FilterBar({ filters, onChange, onExport, count, donationTypes, years }: Props) {
  function set(patch: Partial<Filters>) { onChange({ ...filters, ...patch }) }

  return (
    <div className="flex flex-wrap items-center gap-2.5 px-6 py-3 bg-white/60 border-b border-stone-200">
      <div className="relative flex-1 min-w-44">
        <Search size={14} className="absolute left-3 top-2.5 text-stone-400" />
        <input
          type="text"
          placeholder="Search donors..."
          className="w-full pl-8 pr-3 py-2 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
          value={filters.search}
          onChange={e => set({ search: e.target.value })}
        />
      </div>

      <select className={selectCls} value={filters.status} onChange={e => set({ status: e.target.value as Filters['status'] })}>
        {STATUSES.map(s => <option key={s} value={s}>{STATUS_DISPLAY[s]}</option>)}
      </select>

      <select className={selectCls} value={filters.tier} onChange={e => set({ tier: e.target.value as Filters['tier'] })}>
        <option value="all">All Tiers</option>
        {TIERS.map(t => <option key={t.tier} value={t.tier}>{t.label}</option>)}
      </select>

      <select className={selectCls} value={filters.donationType} onChange={e => set({ donationType: e.target.value })}>
        <option value="all">All Types</option>
        {donationTypes.map(t => <option key={t} value={t}>{t}</option>)}
      </select>

      <select className={selectCls} value={filters.year} onChange={e => set({ year: e.target.value })}>
        <option value="all">All Years</option>
        {years.map(y => <option key={y} value={y}>{y}</option>)}
      </select>

      <select className={selectCls} value={filters.hasAddress} onChange={e => set({ hasAddress: e.target.value as Filters['hasAddress'] })}>
        <option value="all">All</option>
        <option value="yes">Has Address</option>
        <option value="no">No Address</option>
      </select>

      <div className="flex items-center gap-3 ml-auto">
        <span className="text-xs text-stone-400">{count} donor{count !== 1 ? 's' : ''}</span>
        <button
          onClick={onExport}
          className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg font-medium text-white transition-colors"
          style={{ background: 'var(--gold)' }}
        >
          <Download size={13} />
          Export CSV
        </button>
      </div>
    </div>
  )
}
