function quarterDueDate(q: string, yr: number): Date {
  if (q === 'Q1') return new Date(yr, 2, 31)
  if (q === 'Q2') return new Date(yr, 5, 30)
  if (q === 'Q3') return new Date(yr, 8, 30)
  return new Date(yr, 11, 10)
}

export function nextUpcomingDue(): { q: string; yr: number; date: Date } {
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const yr = now.getFullYear()
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4']
  const candidates = [
    ...quarters.map(q => ({ q, yr, date: quarterDueDate(q, yr) })),
    ...quarters.map(q => ({ q, yr: yr + 1, date: quarterDueDate(q, yr + 1) })),
  ]
  return candidates.find(c => c.date >= now) ?? candidates[0]
}
