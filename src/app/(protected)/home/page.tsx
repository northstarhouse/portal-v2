'use client'
import { useState, useEffect } from 'react'
import { LayoutDashboard, Plus, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { fetchCalendarEvents, parseIcalDate, driveImg, CalEvent } from '@/lib/calendar'
import { nextUpcomingDue } from '@/lib/quarterly'

const GOLD = '#886c44'

type Volunteer = {
  id: string
  'First Name': string
  'Last Name': string
  Status: string
  Birthday?: string
  'Picture URL'?: string
}

type OotNotice = {
  id: number
  name: string
  start_date: string
  end_date: string
  notes?: string
}

type InHouseEvent = {
  id: number
  name: string
  date: string
  cost?: number | null
  link?: string | null
}

function StatCard({ label, value, sub, onClick }: { label: string; value: string | number | null; sub?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white border border-stone-200 rounded-xl px-5 py-4 shadow-sm ${onClick ? 'cursor-pointer hover:border-amber-300 transition-colors' : ''}`}
    >
      <p className="text-xs text-stone-400 font-medium mb-1">{label}</p>
      <p className="text-2xl font-semibold text-stone-800">{value ?? '…'}</p>
      {sub && <p className="text-xs text-stone-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function eventCategory(title: string): { label: string; dot: string; bg: string } {
  const t = title.toLowerCase()
  if (/docent/.test(t))          return { label: 'Docent Tour', dot: '#2e7d32', bg: '#e8f5e9' }
  if (/estate|walk.?thr|sierra|\(j\)|tour/.test(t)) return { label: 'Estate Tour', dot: '#c2185b', bg: '#fce4ec' }
  if (/wedding/.test(t))         return { label: 'Wedding',    dot: '#b71c1c', bg: '#ffebee' }
  if (/committee/.test(t))       return { label: 'Committee',  dot: '#e65100', bg: '#fff3e0' }
  if (/meeting/.test(t))         return { label: 'Meeting',    dot: '#f6c900', bg: '#fff9c4' }
  if (/creative|class/.test(t))  return { label: 'Creative',   dot: '#00838f', bg: '#e0f7fa' }
  if (/event|party/.test(t))     return { label: 'Event',      dot: '#1565c0', bg: '#e3f2fd' }
  if (/goal/.test(t))            return { label: 'Goals',      dot: '#f57c00', bg: '#fff8e1' }
  return { label: 'Other', dot: GOLD, bg: '#f0ebe2' }
}

const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

const fmtTime = (d: Date) =>
  d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

export default function HomePage() {
  const [donationTotal, setDonationTotal] = useState<number | null>(null)
  const [activeVols, setActiveVols]       = useState<number | null>(null)
  const [sponsorCount, setSponsorCount]   = useState<number | null>(null)
  const [calEvents, setCalEvents]         = useState<CalEvent[] | null>(null)
  const [birthdays, setBirthdays]         = useState<(Volunteer & { _bday: Date })[] | null>(null)
  const [ootNotices, setOotNotices]       = useState<OotNotice[] | null>(null)
  const [inHouseEvents, setInHouseEvents] = useState<InHouseEvent[]>([])
  const [iheAdding, setIheAdding]         = useState(false)
  const [iheSaving, setIheSaving]         = useState(false)
  const [iheForm, setIheForm]             = useState({ name: '', date: '', cost: '', link: '' })

  useEffect(() => {
    // Donation total
    supabase.from('donations').select('amount').then(({ data }) => {
      if (data) setDonationTotal(data.reduce((s, r) => s + (r.amount ?? 0), 0))
    })

    // Current sponsors
    supabase.from('Sponsors').select('id, sponsor_status').then(({ data }) => {
      if (data) setSponsorCount(data.filter(r => r.sponsor_status === 'current').length)
    })

    // Volunteers: active count + birthdays
    supabase.from('2026 Volunteers').select('id, "First Name", "Last Name", Status, Birthday, "Picture URL"').then(({ data }) => {
      if (!data) return
      const vols = data as unknown as Volunteer[]
      setActiveVols(vols.filter(v => (v.Status ?? '').trim().toLowerCase() === 'active').length)
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const windowEnd = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
      const upcoming = vols
        .filter(v => {
          if (!v.Birthday) return false
          const [, mo, dy] = v.Birthday.split('-').map(Number)
          const thisYear = new Date(today.getFullYear(), mo - 1, dy)
          const nextYear = new Date(today.getFullYear() + 1, mo - 1, dy)
          return (thisYear >= today && thisYear <= windowEnd) || (nextYear >= today && nextYear <= windowEnd)
        })
        .map(v => {
          const [, mo, dy] = v.Birthday!.split('-').map(Number)
          const thisYear = new Date(today.getFullYear(), mo - 1, dy)
          const bday = thisYear >= today ? thisYear : new Date(today.getFullYear() + 1, mo - 1, dy)
          return { ...v, _bday: bday }
        })
        .sort((a, b) => a._bday.getTime() - b._bday.getTime())
      setBirthdays(upcoming)
    })

    // Out of town notices
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const future = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000)
    const todayStr = today.toISOString().slice(0, 10)
    const futureStr = future.toISOString().slice(0, 10)
    supabase.from('oot_notices').select('*')
      .gte('end_date', todayStr).lte('start_date', futureStr).order('start_date')
      .then(({ data }) => setOotNotices((data ?? []) as OotNotice[]))

    // In-house events
    supabase.from('In-House Events').select('*').order('date').then(({ data }) => {
      if (data) setInHouseEvents(data as InHouseEvent[])
    })

    // Google Calendar
    fetchCalendarEvents().then(events => {
      const now = new Date()
      const windowEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
      setCalEvents(
        events
          .filter(ev => { const s = parseIcalDate(ev.DTSTART); return s && s >= now && s <= windowEnd })
          .sort((a, b) => (parseIcalDate(a.DTSTART)?.getTime() ?? 0) - (parseIcalDate(b.DTSTART)?.getTime() ?? 0))
          .slice(0, 8)
      )
    }).catch(() => setCalEvents([]))
  }, [])

  async function addInHouseEvent() {
    if (!iheForm.name || !iheForm.date) return
    setIheSaving(true)
    const { data, error } = await supabase.from('In-House Events').insert({
      name: iheForm.name,
      date: iheForm.date,
      cost: iheForm.cost ? parseFloat(iheForm.cost) : null,
      link: iheForm.link || null,
    }).select().single()
    setIheSaving(false)
    if (error || !data) return
    setInHouseEvents(prev => [...prev, data as InHouseEvent].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '')))
    setIheAdding(false)
    setIheForm({ name: '', date: '', cost: '', link: '' })
  }

  async function deleteInHouseEvent(id: number) {
    await supabase.from('In-House Events').delete().eq('id', id)
    setInHouseEvents(prev => prev.filter(e => e.id !== id))
  }

  const due = nextUpcomingDue()
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const daysUntilDue = Math.round((due.date.getTime() - now.getTime()) / 86400000)
  const dueLabel = daysUntilDue === 0 ? 'Due today' : `${daysUntilDue} days away`

  const fmt = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="flex min-h-screen flex-1">
      <Sidebar activePage="home" />

      <div className="flex-1 flex flex-col min-h-screen overflow-hidden" style={{ background: 'var(--page-bg)' }}>
        <div className="px-8 pt-8 pb-6">

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-white border border-stone-200 flex items-center justify-center shadow-sm">
              <LayoutDashboard size={16} className="text-stone-400" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: GOLD }}>
                Today — {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
              <p className="text-xs text-stone-400">Here&apos;s your organization at a glance.</p>
            </div>
          </div>

          {/* Quarterly due banner */}
          <a
            href="/quarterly"
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg border mb-6 text-sm font-medium transition-colors"
            style={{ background: '#fce4e4', borderColor: '#e8a0a0', color: '#c0392b', textDecoration: 'none' }}
          >
            <span>⚠</span>
            <span className="italic">Quarterly Update Due — {due.q} · {due.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            <span className="ml-auto font-semibold flex-shrink-0">{dueLabel} →</span>
          </a>

          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <StatCard label="Donations" value={donationTotal !== null ? fmt(donationTotal) : null} />
            <StatCard label="Active Volunteers" value={activeVols} />
            <StatCard label="Current Sponsors" value={sponsorCount} />
          </div>

          {/* Main grid */}
          <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 300px' }}>

            {/* Calendar */}
            <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm">
              <p className="text-xs font-semibold mb-4 flex items-center gap-1.5" style={{ color: GOLD }}>
                <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                Happening This Week at North Star House
              </p>
              {calEvents === null && <p className="text-xs text-stone-400">Loading…</p>}
              {calEvents?.length === 0 && <p className="text-xs text-stone-400">No upcoming events in the next 2 weeks.</p>}
              {calEvents?.map((ev, i) => {
                const start = parseIcalDate(ev.DTSTART)
                if (!start) return null
                const isAllDay = (ev.DTSTART ?? '').replace(/[^0-9TZ]/g, '').length === 8
                const dayStr = start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                const todayDayStr = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                const isToday = dayStr === todayDayStr
                const end = parseIcalDate(ev.DTEND)
                const timeStr = isAllDay ? 'All day' : end && end > start ? `${fmtTime(start)} – ${fmtTime(end)}` : fmtTime(start)
                const title = (ev.SUMMARY ?? 'Untitled').replace(/\\,/g, ',').replace(/\\n/g, ' ')
                const { label, dot, bg } = eventCategory(title)
                return (
                  <div key={i} className={`flex gap-3 items-start mb-2.5 ${isToday ? 'rounded-lg px-2.5 py-2' : 'py-0.5'}`}
                    style={isToday ? { background: '#fffbf0', border: '0.5px solid #e8d9b0' } : undefined}>
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: dot }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs ${isToday ? 'font-bold' : 'font-medium'} text-stone-800`}>{title}</span>
                        {isToday && <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: GOLD }}>Today</span>}
                      </div>
                      <p className="text-xs text-stone-500 mt-0.5">{dayStr}{timeStr !== 'All day' ? ` · ${timeStr}` : ''}</p>
                    </div>
                    <span className="text-[11px] font-medium rounded-full px-2 py-0.5 flex-shrink-0 w-24 text-center"
                      style={{ background: bg, color: dot }}>{label}</span>
                  </div>
                )
              })}
              <p className="text-xs text-stone-300 mt-4 pt-4 border-t border-stone-100">Synced from Google Calendar</p>
            </div>

            {/* Right column */}
            <div className="flex flex-col gap-4">

              {/* Birthdays */}
              <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
                <p className="text-xs font-semibold mb-3 flex items-center gap-1.5" style={{ color: GOLD }}>
                  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                  Upcoming Birthdays
                </p>
                {birthdays === null && <p className="text-xs text-stone-300">Loading…</p>}
                {birthdays?.length === 0 && <p className="text-xs text-stone-300 italic">No birthdays in the next 30 days.</p>}
                {birthdays?.map((v, i) => {
                  const isToday = v._bday.toDateString() === new Date().toDateString()
                  return (
                    <div key={i} className={`flex items-center gap-2.5 mb-3 ${isToday ? 'rounded-lg px-2 py-1.5' : ''}`}
                      style={isToday ? { background: '#fffbf0', border: '0.5px solid #e8d9b0' } : undefined}>
                      {v['Picture URL'] ? (
                        <img src={driveImg(v['Picture URL'])} alt={v['First Name']}
                          className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                          style={{ background: '#f0ebe2', color: GOLD }}>
                          {(v['First Name'] ?? '?')[0]}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-stone-800 truncate">{v['First Name']} {v['Last Name']}</p>
                        <p className="text-[11px] text-stone-400">{fmtDate(v._bday)}{isToday ? ' 🎂' : ''}</p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Out of Town */}
              <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
                <p className="text-xs font-semibold mb-3 flex items-center gap-1.5" style={{ color: GOLD }}>
                  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                  Out of Town
                </p>
                {ootNotices === null && <p className="text-xs text-stone-300">Loading…</p>}
                {ootNotices?.length === 0 && <p className="text-xs text-stone-300 italic">No one out of town in the next 60 days.</p>}
                {ootNotices?.map((entry, i) => {
                  const today = new Date(); today.setHours(0, 0, 0, 0)
                  const start = new Date(entry.start_date + 'T12:00:00')
                  const end   = new Date(entry.end_date   + 'T12:00:00')
                  const isActive = start <= today && end >= today
                  return (
                    <div key={i} className={`flex items-center gap-2.5 mb-3 ${isActive ? 'rounded-lg px-2 py-1.5' : ''}`}
                      style={isActive ? { background: '#fffbf0', border: '0.5px solid #e8d9b0' } : undefined}>
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{ background: '#f0ebe2', color: GOLD }}>
                        {(entry.name ?? '?')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-stone-800 truncate">{entry.name}</p>
                        <p className="text-[11px] text-stone-400">{fmtDate(start)} – {fmtDate(end)}{isActive ? ' ✈️' : ''}</p>
                        {entry.notes && <p className="text-[10px] text-stone-300 truncate">{entry.notes}</p>}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* In-House Events */}
              <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: GOLD }}>
                    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    In-House Events
                  </p>
                  <button onClick={() => { setIheAdding(true); setIheForm({ name: '', date: '', cost: '', link: '' }) }}
                    className="flex items-center gap-1 text-[11px] font-semibold text-white px-2 py-1 rounded"
                    style={{ background: GOLD }}>
                    <Plus size={11} /> Add
                  </button>
                </div>

                {iheAdding && (
                  <div className="rounded-lg border border-stone-200 p-3 mb-3 flex flex-col gap-2" style={{ background: '#faf8f4' }}>
                    {[
                      { placeholder: 'Event name', value: iheForm.name, key: 'name', type: 'text' },
                      { placeholder: 'Date', value: iheForm.date, key: 'date', type: 'date' },
                      { placeholder: 'Cost (e.g. 150)', value: iheForm.cost, key: 'cost', type: 'number' },
                      { placeholder: 'Link (optional)', value: iheForm.link, key: 'link', type: 'text' },
                    ].map(f => (
                      <input key={f.key} type={f.type} placeholder={f.placeholder} value={f.value}
                        onChange={e => setIheForm(p => ({ ...p, [f.key]: e.target.value }))}
                        className="text-xs border border-stone-200 rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-amber-300" />
                    ))}
                    <div className="flex gap-2">
                      <button disabled={iheSaving || !iheForm.name || !iheForm.date} onClick={addInHouseEvent}
                        className="flex-1 text-xs font-semibold text-white py-1.5 rounded disabled:opacity-50"
                        style={{ background: GOLD }}>
                        {iheSaving ? 'Saving…' : 'Save'}
                      </button>
                      <button onClick={() => setIheAdding(false)}
                        className="text-xs px-3 py-1.5 rounded text-stone-500"
                        style={{ background: '#f0ebe2' }}>Cancel</button>
                    </div>
                  </div>
                )}

                {inHouseEvents.length === 0 && !iheAdding && <p className="text-xs text-stone-300 italic">No events added yet.</p>}
                {inHouseEvents.map((ev, i) => {
                  const d = ev.date ? new Date(ev.date + 'T00:00:00') : null
                  const isPast = d && d < new Date()
                  return (
                    <div key={ev.id ?? i} className={`flex items-center gap-2 mb-2.5 ${isPast ? 'opacity-50' : ''}`}>
                      <div className="flex-1 min-w-0">
                        {ev.link
                          ? <a href={ev.link} target="_blank" rel="noopener noreferrer"
                              className="text-xs font-semibold text-stone-800 truncate block hover:underline">
                              {ev.name} ↗
                            </a>
                          : <p className="text-xs font-semibold text-stone-800 truncate">{ev.name}</p>
                        }
                        <p className="text-[11px] text-stone-400">
                          {d ? fmtDate(d) : ''}{ev.cost ? ` · $${Number(ev.cost).toLocaleString()}` : ''}
                        </p>
                      </div>
                      <button onClick={() => deleteInHouseEvent(ev.id)}
                        className="text-stone-300 hover:text-stone-500 p-0.5 flex-shrink-0">
                        <X size={12} />
                      </button>
                    </div>
                  )
                })}
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
