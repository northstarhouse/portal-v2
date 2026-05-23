const CALENDAR_ICAL_URL =
  'https://calendar.google.com/calendar/ical/thenorthstarhouse%40gmail.com/private-06287b2ca0d9ee6acd4f49f9d4d0d2da/basic.ics'

export type CalEvent = Record<string, string>

export async function fetchCalendarEvents(): Promise<CalEvent[]> {
  const proxy = 'https://corsproxy.io/?' + encodeURIComponent(CALENDAR_ICAL_URL)
  const text = await fetch(proxy).then(r => r.text())
  const unfolded = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n[ \t]/g, '')
  const events: CalEvent[] = []
  let current: CalEvent | null = null
  for (const line of unfolded.split('\n')) {
    if (line === 'BEGIN:VEVENT') { current = {}; continue }
    if (line === 'END:VEVENT') { if (current) events.push(current); current = null; continue }
    if (current) {
      const ci = line.indexOf(':')
      if (ci !== -1) current[line.slice(0, ci).split(';')[0]] = line.slice(ci + 1)
    }
  }
  return events
}

export function parseIcalDate(val: string | undefined): Date | null {
  if (!val) return null
  const v = val.replace(/[^0-9TZ]/g, '')
  if (v.length === 8)
    return new Date(`${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}T00:00:00`)
  return new Date(
    `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}T${v.slice(9, 11)}:${v.slice(11, 13)}:${v.slice(13, 15) || '00'}${v.endsWith('Z') ? 'Z' : ''}`
  )
}

export function driveImg(url: string): string {
  const i = url.indexOf('/d/')
  if (i === -1) return url
  const id = url.slice(i + 3).split('/')[0].split('?')[0]
  return `https://drive.google.com/thumbnail?id=${id}&sz=w200`
}
