'use client'
import Link from 'next/link'

const ASSET_BASE = process.env.NODE_ENV === 'production' ? '/portal-v2' : ''

// SVG path data matching the portal's NAV_ICONS
const NAV_ICONS: Record<string, string> = {
  home:        '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  quarterly:   '<rect x="5" y="2" width="14" height="20" rx="2"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/><line x1="9" y1="15" x2="13" y2="15"/>',
  volunteers:  '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  donors:      '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
  sponsors:    '<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>',
  board:       '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  strategy:    '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  ideas:       '<path d="M9 21h6"/><path d="M9 17.5h6"/><path d="M12 2a7 7 0 0 1 4.9 11.9l-.1.1c-.4.4-.8 1-1.1 1.5H8.3c-.3-.5-.7-1.1-1.1-1.5l-.1-.1A7 7 0 0 1 12 2z"/>',
}

const NAV = [
  { id: 'home',       label: 'Overview',                href: '/home' },
  { id: 'quarterly',  label: 'Quarterly Update',        href: '/quarterly' },
  { id: 'volunteers', label: 'Volunteers',              href: '/volunteers' },
  { id: 'donors',     label: 'Donations',               href: '/donations' },
  { id: 'sponsors',   label: 'Sponsors',                href: '/sponsors' },
  { id: 'board',      label: 'Board Voting',            href: '/board' },
  { id: 'strategy',   label: 'Strategic Goal Progress', href: '/strategy' },
  { id: 'ideas',      label: 'Ideas & Initiatives',     href: '/ideas' },
] as const

interface Props {
  activePage?: string
}

function NavIcon({ id, active }: { id: string; active: boolean }) {
  return (
    <svg
      width={15} height={15} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, opacity: active ? 1 : 0.7 }}
      dangerouslySetInnerHTML={{ __html: NAV_ICONS[id] ?? '' }}
    />
  )
}

export default function Sidebar({ activePage }: Props) {
  return (
    <aside style={{
      width: 220, background: '#2a2a2e', height: '100vh',
      position: 'sticky', top: 0, flexShrink: 0,
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ padding: '20px 20px 14px' }}>
        <img src={`${ASSET_BASE}/assets/logo.png`} alt="North Star House" style={{ width: 195 }} />
      </div>
      <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.08)' }} />
      <nav style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '8px 8px 16px' }}>
        {NAV.map(({ id, label, href }) => {
          const active = activePage === id
          return (
            <Link
              key={id}
              href={href}
              aria-label={label}
              style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '9px 12px', borderRadius: 7, marginBottom: 2,
                fontSize: 12,
                fontWeight: active ? 600 : 400,
                background: active ? 'rgba(181,161,133,0.15)' : 'transparent',
                color: active ? '#f0ebe3' : 'rgba(255,255,255,0.5)',
                textDecoration: 'none',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              <NavIcon id={id} active={active} />
              {label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
