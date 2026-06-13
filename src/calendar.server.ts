import { rrulestr, RRuleSet } from 'rrule'
import type { RRule } from 'rrule'
import type { CalendarEvent } from './types/event'

const ICAL_URL = 'https://calendar.google.com/calendar/ical/28970aa42f82774cab9dbf1dc4b1d1ee18ce9c9f22bbf8de1c0b747646b97f7d%40group.calendar.google.com/public/basic.ics'

// How far ahead to expand recurring events when looking for upcoming occurrences.
const LOOKAHEAD_MONTHS = 18

function unfold(ics: string): string {
  return ics.replace(/\r\n[ \t]/g, '')
}

function unescapeIcal(value: string): string {
  return value.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\\\/g, '\\')
}

// Returns the text after a property name, starting just past the ';' or ':'
// delimiter, e.g. "TZID=America/New_York:20260621T120000" or "Some summary".
function getRaw(block: string, field: string): string | undefined {
  const match = block.match(new RegExp(`^${field}[;:](.*)$`, 'm'))
  return match ? match[1] : undefined
}

function getAllRaw(block: string, field: string): string[] {
  return [...block.matchAll(new RegExp(`^${field}[;:](.*)$`, 'gm'))].map((m) => m[1])
}

// A date/time property split into its timezone, raw value, and granularity.
interface DateField {
  tzid?: string
  value: string
  allDay: boolean
}

function parseDateField(raw: string): DateField {
  const tzid = raw.match(/TZID=([^:;]+)/)?.[1]
  const value = raw.slice(raw.lastIndexOf(':') + 1).trim()
  return { tzid, value, allDay: /^\d{8}$/.test(value) }
}

// Offset (local - UTC, in ms) of the given timezone at the given instant.
function tzOffsetMs(instant: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
  const parts: Record<string, number> = {}
  for (const part of dtf.formatToParts(instant)) {
    if (part.type !== 'literal') parts[part.type] = parseInt(part.value, 10)
  }
  const asUTC = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
  return asUTC - instant.getTime()
}

// Convert a wall-clock time (1-based month) in `timeZone` to the true UTC instant,
// correcting for DST. Refines once to settle offsets near a DST transition.
function wallClockToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute, second)
  const firstOffset = tzOffsetMs(new Date(guess), timeZone)
  const refinedOffset = tzOffsetMs(new Date(guess - firstOffset), timeZone)
  return new Date(guess - refinedOffset)
}

// Resolve a single iCal date/time value to a true instant.
function resolveInstant(field: DateField): Date {
  const { value, tzid, allDay } = field
  const year = parseInt(value.slice(0, 4), 10)
  const month = parseInt(value.slice(4, 6), 10)
  const day = parseInt(value.slice(6, 8), 10)
  if (allDay) {
    return wallClockToUtc(year, month, day, 0, 0, 0, tzid ?? 'UTC')
  }
  const hour = parseInt(value.slice(9, 11), 10)
  const minute = parseInt(value.slice(11, 13), 10)
  const second = parseInt(value.slice(13, 15), 10) || 0
  if (value.endsWith('Z')) {
    return new Date(Date.UTC(year, month - 1, day, hour, minute, second))
  }
  return wallClockToUtc(year, month, day, hour, minute, second, tzid ?? 'UTC')
}

// Re-emit an iCal value as a naive UTC stamp (wall-clock treated as UTC) so that
// rrule expansion is timezone-agnostic; the tz is re-applied to each occurrence.
function toNaiveUtcString(value: string): string {
  const ymd = `${value.slice(0, 4)}${value.slice(4, 6)}${value.slice(6, 8)}`
  if (/^\d{8}$/.test(value)) return `${ymd}T000000Z`
  return `${ymd}T${value.slice(9, 11)}${value.slice(11, 13)}${value.slice(13, 15) || '00'}Z`
}

// Expand a recurring event into the true instants of each occurrence start that
// falls within [windowStart, windowEnd]. rrule does the calendar math in a naive
// UTC frame; we then re-anchor each occurrence's wall clock to the event's tz.
function expandRecurring(
  dtstart: DateField,
  rruleLine: string,
  exdates: DateField[],
  windowStart: Date,
  windowEnd: Date
): Date[] {
  const naiveStart = toNaiveUtcString(dtstart.value)
  const rule = rrulestr(`DTSTART:${naiveStart}\nRRULE:${rruleLine}`, { forceset: true })

  if (rule instanceof RRuleSet) {
    for (const ex of exdates) {
      const naive = toNaiveUtcString(ex.value)
      rule.exdate(
        new Date(
          Date.UTC(
            parseInt(naive.slice(0, 4), 10),
            parseInt(naive.slice(4, 6), 10) - 1,
            parseInt(naive.slice(6, 8), 10),
            parseInt(naive.slice(9, 11), 10),
            parseInt(naive.slice(11, 13), 10),
            parseInt(naive.slice(13, 15), 10)
          )
        )
      )
    }
  }

  // Pad the naive window by a couple of days to absorb the tz offset.
  const naiveFrom = new Date(windowStart.getTime() - 2 * 86_400_000)
  const naiveTo = new Date(windowEnd.getTime() + 2 * 86_400_000)
  const tz = dtstart.tzid ?? 'UTC'

  return (rule as RRule | RRuleSet)
    .between(naiveFrom, naiveTo, true)
    .map((occ) =>
      wallClockToUtc(
        occ.getUTCFullYear(),
        occ.getUTCMonth() + 1,
        occ.getUTCDate(),
        occ.getUTCHours(),
        occ.getUTCMinutes(),
        occ.getUTCSeconds(),
        tz
      )
    )
}

export async function fetchUpcomingEvents(maxResults = 6): Promise<CalendarEvent[]> {
  try {
    const response = await fetch(ICAL_URL)
    if (!response.ok) {
      console.error(`[calendar] Failed to fetch iCal: ${response.status}`)
      return []
    }

    const text = unfold(await response.text())
    const blocks = text.split('BEGIN:VEVENT')
    const now = new Date()
    const windowEnd = new Date(now)
    windowEnd.setMonth(windowEnd.getMonth() + LOOKAHEAD_MONTHS)

    const upcoming: CalendarEvent[] = []

    for (let i = 1; i < blocks.length; i++) {
      const block = blocks[i].split('END:VEVENT')[0]

      const dtstartRaw = getRaw(block, 'DTSTART')
      if (!dtstartRaw) continue
      const dtstart = parseDateField(dtstartRaw)

      const dtendRaw = getRaw(block, 'DTEND')
      const dtend = dtendRaw ? parseDateField(dtendRaw) : undefined

      const summary = getRaw(block, 'SUMMARY')
      const description = getRaw(block, 'DESCRIPTION')
      const location = getRaw(block, 'LOCATION')
      const uid = getRaw(block, 'UID')
      const rruleLine = getRaw(block, 'RRULE')

      const startInstant = resolveInstant(dtstart)
      const endInstant = dtend ? resolveInstant(dtend) : startInstant
      const durationMs = Math.max(0, endInstant.getTime() - startInstant.getTime())

      let occurrences: Date[]
      if (rruleLine) {
        const exdates = getAllRaw(block, 'EXDATE').flatMap((raw) => {
          const field = parseDateField(raw)
          return field.value
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean)
            .map((v) => ({ tzid: field.tzid, value: v, allDay: /^\d{8}$/.test(v) }))
        })
        occurrences = expandRecurring(dtstart, rruleLine, exdates, now, windowEnd)
      } else {
        occurrences = [startInstant]
      }

      const base = uid ?? `event-${i}`

      for (const occStart of occurrences) {
        const occEnd = new Date(occStart.getTime() + durationMs)
        if (occEnd < now) continue
        if (occStart > windowEnd) continue

        upcoming.push({
          id: rruleLine ? `${base}-${occStart.toISOString()}` : base,
          title: summary ? unescapeIcal(summary) : 'Untitled Event',
          description: description ? unescapeIcal(description) : undefined,
          location: location ? unescapeIcal(location) : undefined,
          start: occStart.toISOString(),
          end: occEnd.toISOString(),
          allDay: dtstart.allDay
        })
      }
    }

    upcoming.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

    console.log(`[calendar] Found ${upcoming.length} upcoming event(s)`)
    return upcoming.slice(0, maxResults)
  } catch (error) {
    console.error('[calendar] Failed to fetch events:', error)
    return []
  }
}
