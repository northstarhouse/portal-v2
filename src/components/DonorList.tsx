'use client'
import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, Star } from 'lucide-react'
import { DonorWithStats } from '@/lib/types'
import { getTierInfo } from '@/lib/tiers'

const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const fmtDate = (d: string | null) => d
  ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  : '—'

type SortKey = 'formal_name' | 'tier' | 'current_year_total' | 'lifetime_total' | 'last_gift_date' | 'status'
type SortDir = 'asc' | 'desc'

const TIER_ORDER = { blue_giant: 6, red_giant: 5, evening_star: 4, morning_star: 3, rising_star: 2, shooting_star: 1, none: 0 }
const STATUS_ORDER = { current: 3, recently_lapsed: 2, long_lapsed: 1, non_donor: 0 }

const TIER_DOTS: Record<string, string> = {
  blue_giant: '#2563eb', red_giant: '#dc2626', evening_star: '#7c3aed',
  morning_star: '#d97706', rising_star: '#059669', shooting_star: '#0284c7', none: '#9ca3af',
}

const STATUS_PILL: Record<string, string> = {
  current: 'bg-emerald-50 text-emerald-700',
  recently_lapsed: 'bg-amber-50 text-amber-700',
  long_lapsed: 'bg-orange-50 text-orange-700',
  non_donor: 'bg-stone-100 text-stone-500',
}
const STATUS_LABEL: Record<string, string> = {
  current: 'Current', recently_lapsed: 'Lapsed', long_lapsed: 'Long Lapsed', non_donor: 'Non-donor',
}

interface Props {
  donors: DonorWithStats[]
  onSelect: (d: DonorWithStats) => void
  selectedIds: Set<string>
  onToggle: (id: string) => void
  onToggleAll: (ids: string[]) => void
}

export default function DonorList({ donors, onSelect, selectedIds, onToggle, onToggleAll }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('last_gift_date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const sorted = useMemo(() => [...donors].sort((a, b) => {
    let cmp = 0
    switch (sortKey) {
      case 'formal_name': cmp = a.formal_name.localeCompare(b.formal_name); break
      case 'tier': cmp = TIER_ORDER[a.tier] - TIER_ORDER[b.tier]; break
      case 'current_year_total': cmp = a.current_year_total - b.current_year_total; break
      case 'lifetime_total': cmp = a.lifetime_total - b.lifetime_total; break
      case 'last_gift_date':
        cmp = new Date(a.last_gift_date ?? '1900').getTime() - new Date(b.last_gift_date ?? '1900').getTime(); break
      case 'status': cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]; break
    }
    return sortDir === 'asc' ? cmp : -cmp
  }), [donors, sortKey, sortDir])

  const allVisibleIds = sorted.map(d => d.id)
  const allChecked = allVisibleIds.length > 0 && allVisibleIds.every(id => selectedIds.has(id))
  const someChecked = allVisibleIds.some(id => selectedIds.has(id))

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ChevronsUpDown size={12} className="text-stone-300" />
    return sortDir === 'asc' ? <ChevronUp size={12} className="text-stone-500" /> : <ChevronDown size={12} className="text-stone-500" />
  }

  function Th({ label, k, right }: { label: string; k: SortKey; right?: boolean }) {
    return (
      <th
        className={`px-4 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wider cursor-pointer hover:text-stone-600 select-none ${right ? 'text-right' : 'text-left'}`}
        onClick={() => handleSort(k)}
      >
        <span className={`inline-flex items-center gap-1 ${right ? 'flex-row-reverse' : ''}`}>
          {label} <SortIcon k={k} />
        </span>
      </th>
    )
  }

  if (donors.length === 0) {
    return <div className="text-center py-16 text-stone-400 text-sm">No donors match your filters.</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone-100">
            <th className="pl-4 pr-2 py-3 w-8">
              <input
                type="checkbox"
                className="rounded border-stone-300 accent-amber-600 cursor-pointer"
                checked={allChecked}
                ref={el => { if (el) el.indeterminate = someChecked && !allChecked }}
                onChange={() => onToggleAll(allVisibleIds)}
              />
            </th>
            <Th label="Donor" k="formal_name" />
            <Th label="Status" k="status" />
            <Th label="Tier" k="tier" />
            <Th label="This Year" k="current_year_total" right />
            <Th label="Lifetime" k="lifetime_total" right />
            <Th label="Last Gift" k="last_gift_date" right />
          </tr>
        </thead>
        <tbody>
          {sorted.map(donor => {
            const tierInfo = getTierInfo(donor.tier)
            const checked = selectedIds.has(donor.id)
            return (
              <tr
                key={donor.id}
                className={`border-b border-stone-100 cursor-pointer transition-colors group ${donor.deceased ? 'opacity-50' : ''} ${checked ? 'bg-amber-50/70' : 'hover:bg-amber-50/50'}`}
              >
                <td className="pl-4 pr-2 py-3 w-8" onClick={e => { e.stopPropagation(); onToggle(donor.id) }}>
                  <input
                    type="checkbox"
                    className="rounded border-stone-300 accent-amber-600 cursor-pointer"
                    checked={checked}
                    onChange={() => onToggle(donor.id)}
                    onClick={e => e.stopPropagation()}
                  />
                </td>
                <td className="px-4 py-3" onClick={() => onSelect(donor)}>
                  <div className="flex items-center gap-2.5">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium text-stone-800 group-hover:text-amber-800">{donor.formal_name}</p>
                        {donor.starred && <Star size={11} fill="#b5a185" stroke="#b5a185" className="flex-shrink-0" />}
                        {donor.deceased && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-stone-200 text-stone-500 flex-shrink-0">Deceased</span>}
                        {donor.tags?.map(tag => (
                          <span key={tag.id} className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: tag.color }} title={tag.name} />
                        ))}
                      </div>
                      {donor.informal_first_name && (
                        <p className="text-xs text-stone-400">{donor.informal_first_name}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3" onClick={() => onSelect(donor)}>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_PILL[donor.status]}`}>
                    {STATUS_LABEL[donor.status]}
                  </span>
                  {donor.tags && donor.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {donor.tags.map(tag => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                          style={{ background: tag.color + '22', color: tag.color }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3" onClick={() => onSelect(donor)}>
                  {donor.tier === 'none'
                    ? <span className="text-stone-300 text-xs">—</span>
                    : <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${tierInfo.color}`}>
                        {tierInfo.label}
                      </span>
                  }
                </td>
                <td className="px-4 py-3 text-right font-medium text-stone-700" onClick={() => onSelect(donor)}>
                  {donor.current_year_total > 0 ? fmt(donor.current_year_total) : <span className="text-stone-300">—</span>}
                </td>
                <td className="px-4 py-3 text-right text-stone-600" onClick={() => onSelect(donor)}>
                  {fmt(Math.max(donor.lifetime_total, donor.historical_lifetime_giving))}
                </td>
                <td className="px-4 py-3 text-right text-stone-500 text-xs" onClick={() => onSelect(donor)}>
                  {fmtDate(donor.last_gift_date)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="px-4 py-2.5 text-xs text-stone-400 border-t border-stone-100">
        {sorted.length} donor{sorted.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
