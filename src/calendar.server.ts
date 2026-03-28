import type { CalendarEvent } from './types/event'

const ICAL_URL = 'https://calendar.google.com/calendar/ical/28970aa42f82774cab9dbf1dc4b1d1ee18ce9c9f22bbf8de1c0b747646b97f7d%40group.calendar.google.com/public/basic.ics'

function unfold(ics: string): string {
  return ics.replace(/\r\n[ \t]/g, '')
}

function getField(block: string, field: string): string | undefined {
  const regex = new RegExp(`^${field}[;:](.*)$`, 'm')
  const match = block.match(regex)
  if (!match) return undefined
  // Strip parameters (e.g., DTSTART;VALUE=DATE:20260401 → 20260401)
  const value = match[1]
  if (field === 'DTSTART' || field === 'DTEND') {
    // Could be "VALUE=DATE:20260401" or "TZID=America/New_York:20260401T190000" or just "20260401T190000Z"
    const parts = value.split(':')
    return parts[parts.length - 1].trim()
  }
  return value.trim()
}

function parseIcalDate(value: string): { date: Date; allDay: boolean } {
  // All-day: 20260401
  if (/^\d{8}$/.test(value)) {
    const y = parseInt(value.slice(0, 4))
    const m = parseInt(value.slice(4, 6)) - 1
    const d = parseInt(value.slice(6, 8))
    return { date: new Date(y, m, d), allDay: true }
  }
  // Date-time: 20260401T190000Z or 20260401T190000
  const y = parseInt(value.slice(0, 4))
  const m = parseInt(value.slice(4, 6)) - 1
  const d = parseInt(value.slice(6, 8))
  const h = parseInt(value.slice(9, 11))
  const min = parseInt(value.slice(11, 13))
  const s = parseInt(value.slice(13, 15))
  if (value.endsWith('Z')) {
    return { date: new Date(Date.UTC(y, m, d, h, min, s)), allDay: false }
  }
  return { date: new Date(y, m, d, h, min, s), allDay: false }
}

function unescapeIcal(value: string): string {
  return value.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\\\/g, '\\')
}

export async function fetchUpcomingEvents(maxResults = 6): Promise<CalendarEvent[]> {
  try {
    const response = await fetch(ICAL_URL)
    if (!response.ok) {
      console.error(`[calendar] Failed to fetch iCal: ${response.status}`)
      return []
    }

    const raw = await response.text()
    const text = unfold(raw)
    const blocks = text.split('BEGIN:VEVENT')
    const now = new Date()
    const upcoming: CalendarEvent[] = []

    for (let i = 1; i < blocks.length; i++) {
      const block = blocks[i].split('END:VEVENT')[0]

      const dtstart = getField(block, 'DTSTART')
      const dtend = getField(block, 'DTEND')
      if (!dtstart) continue

      const start = parseIcalDate(dtstart)
      const end = dtend ? parseIcalDate(dtend) : start

      if (end.date < now) continue

      const summary = getField(block, 'SUMMARY')
      const description = getField(block, 'DESCRIPTION')
      const location = getField(block, 'LOCATION')
      const uid = getField(block, 'UID')

      upcoming.push({
        id: uid ?? `event-${i}`,
        title: summary ? unescapeIcal(summary) : 'Untitled Event',
        description: description ? unescapeIcal(description) : undefined,
        location: location ? unescapeIcal(location) : undefined,
        start: start.date.toISOString(),
        end: end.date.toISOString(),
        allDay: start.allDay
      })
    }

    upcoming.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

    console.log(`[calendar] Found ${upcoming.length} upcoming event(s)`)
    return upcoming.slice(0, maxResults)
  } catch (error) {
    console.error('[calendar] Failed to fetch events:', error)
    return []
  }
}
