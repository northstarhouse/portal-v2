'use client'
import { MemberTier } from '@/lib/types'
import { getTierInfo } from '@/lib/tiers'

const STAR = '✦'

const TIER_STARS: Record<MemberTier, string> = {
  blue_giant: `${STAR}${STAR}${STAR}${STAR}${STAR}${STAR}`,
  red_giant: `${STAR}${STAR}${STAR}${STAR}${STAR}`,
  evening_star: `${STAR}${STAR}${STAR}${STAR}`,
  morning_star: `${STAR}${STAR}${STAR}`,
  rising_star: `${STAR}${STAR}`,
  shooting_star: `${STAR}`,
  none: '',
}

export default function TierBadge({ tier }: { tier: MemberTier }) {
  const info = getTierInfo(tier)
  if (tier === 'none') return <span className="text-gray-400 text-xs">—</span>
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${info.color}`}>
      <span className="tracking-tighter">{TIER_STARS[tier]}</span>
      <span>{info.label}</span>
    </span>
  )
}
