'use client'
import { DonorStatus } from '@/lib/types'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/tiers'

export default function StatusBadge({ status }: { status: DonorStatus }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  )
}
