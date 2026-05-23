'use client'
import Link from 'next/link'
import { useState } from 'react'
import { LayoutDashboard, Heart, List, Award, Megaphone, Lightbulb, BarChart2, CalendarDays, Ellipsis, ChevronRight, Users, ClipboardList, LayoutList, FileText } from 'lucide-react'

function CoordIcon({ size = 15, strokeWidth = 1.75 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="4"  r="2" />
      <circle cx="19" cy="16" r="2" />
      <circle cx="5"  cy="16" r="2" />
    </svg>
  )
}

const MAIN_NAV = [
  { id: 'dashboard', label: 'Development', icon: LayoutDashboard, href: '/home' },
  { id: 'meetings', label: 'Meetings', icon: ClipboardList, href: '/meetings/' },
  { id: 'outreach', label: 'Outreach', icon: Megaphone, href: '/outreach/' },
  { id: 'data', label: 'Data', icon: BarChart2, href: '/data/' },
  { id: 'grants', label: 'Grants', icon: FileText, href: '/grants/' },
  { id: 'donations', label: 'Donations', icon: Heart, href: '/donations/' },
  { id: 'sponsors', label: 'Sponsors', icon: Award, href: '/sponsors/' },
  { id: 'ideas', label: 'Ideas & Initiatives', icon: Lightbulb, href: '/ideas/' },
  { id: 'coordination', label: 'Cross-Coordination', icon: CoordIcon, href: '/coordination/' },
  { id: 'content-calendar', label: 'Content Calendar', icon: CalendarDays, href: '/content-calendar/' },
] as const

const MORE_NAV = [
  { id: 'lists', label: 'Lists', icon: List, href: '/lists/' },
  { id: 'gifts', label: 'Gift Log', icon: Heart, href: '/gifts/' },
  { id: 'volunteers', label: 'Volunteer Emails', icon: Users, href: '/volunteers/' },
  { id: 'event-emails', label: 'Event Emails', icon: LayoutList, href: '/event-emails/' },
] as const

const ASSET_BASE = ''

interface Props {
  activePage?: string
}

function NavLink({
  href,
  active,
  label,
  children,
}: {
  href: string
  active: boolean
  label: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        padding: '9px 12px',
        borderRadius: 7,
        marginBottom: 2,
        fontSize: 12,
        fontWeight: active ? 600 : 400,
        background: active ? 'rgba(181,161,133,0.15)' : 'transparent',
        color: active ? '#f0ebe3' : 'rgba(255,255,255,0.5)',
        textDecoration: 'none',
        transition: 'background 0.15s, color 0.15s',
      }}
    >
      {children}
    </Link>
  )
}

export default function Sidebar({ activePage }: Props) {
  const [moreOpen, setMoreOpen] = useState(activePage === 'lists' || activePage === 'gifts' || activePage === 'event-emails')

  const moreActive = activePage === 'lists' || activePage === 'gifts' || activePage === 'volunteers' || activePage === 'event-emails'
  const updatesActive = activePage === 'production-updates'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexShrink: 0 }}>
      <aside style={{ width: 220, background: '#2a2a2e', height: '100vh', position: 'sticky', top: 0, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 20px 14px' }}>
          <img src={`${ASSET_BASE}/assets/logo.png`} alt="North Star House" style={{ width: 195 }} />
        </div>
        <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.08)' }} />
        <nav style={{ flex: 1, minHeight: 0, padding: '8px 8px 0' }}>
          {MAIN_NAV.map(({ id, label, icon: Icon, href }) => (
            <NavLink key={id} href={href} label={label} active={activePage === id}>
              <Icon size={15} strokeWidth={1.75} />
              {label}
            </NavLink>
          ))}

          <button
            onClick={() => setMoreOpen(v => !v)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              padding: '9px 12px',
              borderRadius: 7,
              marginBottom: 2,
              fontSize: 12,
              fontWeight: moreActive || moreOpen ? 600 : 400,
              background: moreActive || moreOpen ? 'rgba(181,161,133,0.15)' : 'transparent',
              color: moreActive || moreOpen ? '#f0ebe3' : 'rgba(255,255,255,0.5)',
              border: 'none',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            <Ellipsis size={15} strokeWidth={1.75} />
            <span style={{ flex: 1 }}>More</span>
            <ChevronRight size={14} strokeWidth={1.75} style={{ transform: moreOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }} />
          </button>
        </nav>
        <div style={{ padding: '0 8px 16px' }}>
          <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.08)', marginBottom: 8 }} />
          <NavLink href="/production-updates/" label="Production Updates" active={updatesActive}>
            <LayoutList size={15} strokeWidth={1.75} />
            Production Updates
          </NavLink>
        </div>
      </aside>

      {moreOpen && (
        <aside style={{ width: 180, background: '#34343a', minHeight: '100vh', borderLeft: '1px solid rgba(255,255,255,0.06)', padding: '76px 8px 0' }}>
          {MORE_NAV.map(({ id, label, icon: Icon, href }) => (
            <NavLink key={id} href={href} label={label} active={activePage === id}>
              <Icon size={15} strokeWidth={1.75} />
              {label}
            </NavLink>
          ))}
        </aside>
      )}
    </div>
  )
}
