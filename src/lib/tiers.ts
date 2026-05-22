import { MemberTier, DonorStatus } from './types'

export const TIERS: { tier: MemberTier; min: number; max: number; label: string; color: string }[] = [
  { tier: 'blue_giant', min: 2500, max: Infinity, label: 'Blue Giant Star Sponsor', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { tier: 'red_giant', min: 1000, max: 2499.99, label: 'Red Giant Star Sponsor', color: 'bg-red-100 text-red-800 border-red-300' },
  { tier: 'evening_star', min: 500, max: 999.99, label: 'Evening Star', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  { tier: 'morning_star', min: 250, max: 499.99, label: 'Morning Star', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  { tier: 'rising_star', min: 100, max: 249.99, label: 'Rising Star', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { tier: 'shooting_star', min: 50, max: 99.99, label: 'Shooting Star', color: 'bg-sky-100 text-sky-800 border-sky-300' },
  { tier: 'none', min: 0, max: 49.99, label: 'Non-member', color: 'bg-gray-100 text-gray-500 border-gray-200' },
]

export function getTier(currentYearTotal: number): MemberTier {
  for (const t of TIERS) {
    if (currentYearTotal >= t.min && currentYearTotal <= t.max) return t.tier
  }
  return 'none'
}

export function getTierInfo(tier: MemberTier) {
  return TIERS.find(t => t.tier === tier) ?? TIERS[TIERS.length - 1]
}

export function getStatus(lastGiftDate: string | null): DonorStatus {
  if (!lastGiftDate) return 'non_donor'
  const year = new Date(lastGiftDate).getFullYear()
  const currentYear = new Date().getFullYear()
  if (year === currentYear) return 'current'
  if (year === currentYear - 1) return 'recently_lapsed'
  return 'long_lapsed'
}

export const STATUS_LABELS: Record<DonorStatus, string> = {
  current: 'Current',
  recently_lapsed: 'Recently Lapsed',
  long_lapsed: 'Long Lapsed',
  non_donor: 'Non-Donor',
}

export const STATUS_COLORS: Record<DonorStatus, string> = {
  current: 'bg-green-100 text-green-800',
  recently_lapsed: 'bg-yellow-100 text-yellow-800',
  long_lapsed: 'bg-orange-100 text-orange-700',
  non_donor: 'bg-gray-100 text-gray-500',
}
