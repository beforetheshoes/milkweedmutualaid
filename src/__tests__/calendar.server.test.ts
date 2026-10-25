import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { fetchUpcomingEvents } from '../calendar.server'

// ── Fixture ───────────────────────────────────────────────────────────────
// A synthetic iCal feed (CRLF line endings, like Google's) exercising the cases
// that broke before RRULE expansion. "Now" is pinned to 2026-06-13T12:00:00Z in
// every test, so all expected instants below are deterministic.

const VEVENTS: string[][] = [
  // Recurring, first occurrence (Jun 2) ALREADY PAST — the original bug: it used
  // to vanish entirely. 1st Tuesday monthly, 17:30 New York (summer = UTC-4).
  [
    'UID:dinner@milkweed',
    'SUMMARY:Community Dinner',
    'DTSTART;TZID=America/New_York:20260602T173000',
    'DTEND;TZID=America/New_York:20260602T193000',
    'RRULE:FREQ=MONTHLY;BYDAY=1TU'
  ],
  // Recurring, first occurrence still in the future. 3rd Sunday monthly, noon NY.
  [
    'UID:rrfm@milkweed',
    'SUMMARY:Really Really Free Market',
    'DTSTART;TZID=America/New_York:20260621T120000',
    'DTEND;TZID=America/New_York:20260621T150000',
    'RRULE:FREQ=MONTHLY;BYDAY=3SU'
  ],
  // Recurring monthly on the 15th at noon NY — spans the DST boundary so we can
  // assert both a summer (UTC-4) and a winter (UTC-5) occurrence.
  [
    'UID:fifteenth@milkweed',
    'SUMMARY:Monthly Meeting',
    'DTSTART;TZID=America/New_York:20260115T120000',
    'DTEND;TZID=America/New_York:20260115T130000',
    'RRULE:FREQ=MONTHLY;BYMONTHDAY=15'
  ],
  // Weekly Wednesday 10:00 NY, with one occurrence (Jun 17) removed via EXDATE.
  [
    'UID:weekly@milkweed',
    'SUMMARY:Weekly Workshop',
    'DTSTART;TZID=America/New_York:20260603T100000',
    'DTEND;TZID=America/New_York:20260603T113000',
    'RRULE:FREQ=WEEKLY;BYDAY=WE',
    'EXDATE;TZID=America/New_York:20260617T100000'
  ],
  // One-time, future, in UTC ("Z").
  [
    'UID:onetime-future@milkweed',
    'SUMMARY:Fundraiser',
    'DTSTART:20260615T180000Z',
    'DTEND:20260615T190000Z'
  ],
  // One-time, fully in the past — must be filtered out.
  [
    'UID:onetime-past@milkweed',
    'SUMMARY:Old Event',
    'DTSTART:20260101T180000Z',
    'DTEND:20260101T190000Z'
  ],
  // All-day, future.
  [
    'UID:allday@milkweed',
    'SUMMARY:Community Picnic',
    'DTSTART;VALUE=DATE:20260620',
    'DTEND;VALUE=DATE:20260621'
  ]
]

const FIXTURE_ICS = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  ...VEVENTS.flatMap((lines) => ['BEGIN:VEVENT', ...lines, 'END:VEVENT']),
  'END:VCALENDAR'
].join('\r\n')

function mockFetch(impl: () => Promise<Response> | Response): void {
  vi.stubGlobal('fetch', vi.fn(impl))
}

// Collect every ISO start string for a given event title.
function startsFor(events: Awaited<ReturnType<typeof fetchUpcomingEvents>>, title: string): string[] {
  return events.filter((e) => e.title === title).map((e) => e.start)
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-06-13T12:00:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('fetchUpcomingEvents — RRULE expansion', () => {
  it('expands a recurring event whose first occurrence is already in the past', async () => {
    mockFetch(() => new Response(FIXTURE_ICS, { status: 200 }))
    // maxResults large enough to capture everything in the lookahead window.
    const events = await fetchUpcomingEvents(1000)

    const dinner = startsFor(events, 'Community Dinner')
    // Used to be dropped entirely; now the next occurrences appear.
    expect(dinner.length).toBeGreaterThan(1)
    // 1st Tuesday of July 2026 at 17:30 EDT (UTC-4) = 21:30Z.
    expect(dinner[0]).toBe('2026-07-07T21:30:00.000Z')
    expect(dinner).toContain('2026-08-04T21:30:00.000Z')
  })

  it('also surfaces a recurring event whose first occurrence is in the future', async () => {
    mockFetch(() => new Response(FIXTURE_ICS, { status: 200 }))
    const events = await fetchUpcomingEvents(1000)

    const rrfm = startsFor(events, 'Really Really Free Market')
    // 3rd Sunday of June 2026 at noon EDT (UTC-4) = 16:00Z.
    expect(rrfm).toContain('2026-06-21T16:00:00.000Z')
    expect(rrfm).toContain('2026-07-19T16:00:00.000Z')
  })

  it('applies DST-correct offsets across the EDT/EST boundary', async () => {
    mockFetch(() => new Response(FIXTURE_ICS, { status: 200 }))
    const events = await fetchUpcomingEvents(1000)

    const meetings = startsFor(events, 'Monthly Meeting')
    // Summer: noon EDT (UTC-4) = 16:00Z.
    expect(meetings).toContain('2026-07-15T16:00:00.000Z')
    // Winter: noon EST (UTC-5) = 17:00Z.
    expect(meetings).toContain('2026-12-15T17:00:00.000Z')
  })

  it('honors EXDATE exclusions', async () => {
    mockFetch(() => new Response(FIXTURE_ICS, { status: 200 }))
    const events = await fetchUpcomingEvents(1000)

    const weekly = startsFor(events, 'Weekly Workshop')
    // 10:00 EDT (UTC-4) = 14:00Z. Jun 17 is excluded; Jun 24 is not.
    expect(weekly).not.toContain('2026-06-17T14:00:00.000Z')
    expect(weekly).toContain('2026-06-24T14:00:00.000Z')
  })
})

describe('fetchUpcomingEvents — filtering and shape', () => {
  it('keeps future one-time events and drops fully-past ones', async () => {
    mockFetch(() => new Response(FIXTURE_ICS, { status: 200 }))
    const events = await fetchUpcomingEvents(1000)

    expect(startsFor(events, 'Fundraiser')).toEqual(['2026-06-15T18:00:00.000Z'])
    expect(startsFor(events, 'Old Event')).toEqual([])
  })

  it('marks all-day events', async () => {
    mockFetch(() => new Response(FIXTURE_ICS, { status: 200 }))
    const events = await fetchUpcomingEvents(1000)

    const picnic = events.find((e) => e.title === 'Community Picnic')
    expect(picnic?.allDay).toBe(true)
  })

  it('returns at most maxResults, sorted ascending, as a prefix of all events', async () => {
    mockFetch(() => new Response(FIXTURE_ICS, { status: 200 }))
    const sliced = await fetchUpcomingEvents()
    mockFetch(() => new Response(FIXTURE_ICS, { status: 200 }))
    const all = await fetchUpcomingEvents(1000)

    expect(sliced.length).toBeLessThanOrEqual(6)
    const starts = sliced.map((e) => new Date(e.start).getTime())
    expect(starts).toEqual([...starts].sort((a, b) => a - b))
    // The sliced result is exactly the soonest N of the full sorted list.
    expect(sliced.map((e) => e.start)).toEqual(all.slice(0, sliced.length).map((e) => e.start))
    // Soonest of all is the Monthly Meeting on the 15th (noon EDT = 16:00Z),
    // which sorts just ahead of the same-day Fundraiser at 18:00Z.
    expect(all[0].start).toBe('2026-06-15T16:00:00.000Z')
  })

  it('gives each expanded occurrence a unique id', async () => {
    mockFetch(() => new Response(FIXTURE_ICS, { status: 200 }))
    const events = await fetchUpcomingEvents(1000)

    const ids = events.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

// ── Overrides ─────────────────────────────────────────────────────────────
// Mirrors how Google exports an edited occurrence of a series: a second VEVENT
// with the same UID and a RECURRENCE-ID naming the occurrence it replaces. The
// overrides come before the master to prove the result doesn't depend on order.
const OVERRIDE_VEVENTS: string[][] = [
  // Jul 7 occurrence moved to Sun Jul 5 at 17:00.
  [
    'UID:series@milkweed',
    'SUMMARY:Series Dinner',
    'RECURRENCE-ID;TZID=America/New_York:20260707T173000',
    'DTSTART;TZID=America/New_York:20260705T170000',
    'DTEND;TZID=America/New_York:20260705T190000',
    'SEQUENCE:2',
    'STATUS:CONFIRMED'
  ],
  // Aug 4 occurrence cancelled.
  [
    'UID:series@milkweed',
    'SUMMARY:Series Dinner',
    'RECURRENCE-ID;TZID=America/New_York:20260804T173000',
    'DTSTART;TZID=America/New_York:20260804T173000',
    'DTEND;TZID=America/New_York:20260804T193000',
    'STATUS:CANCELLED'
  ],
  // Sep 1 occurrence moved a day later — a second move in the same series.
  [
    'UID:series@milkweed',
    'SUMMARY:Series Dinner',
    'RECURRENCE-ID;TZID=America/New_York:20260901T173000',
    'DTSTART;TZID=America/New_York:20260902T173000',
    'DTEND;TZID=America/New_York:20260902T193000'
  ],
  // The series itself: 1st Tuesday monthly, 17:30 New York.
  [
    'UID:series@milkweed',
    'SUMMARY:Series Dinner',
    'DTSTART;TZID=America/New_York:20260602T173000',
    'DTEND;TZID=America/New_York:20260602T193000',
    'RRULE:FREQ=MONTHLY;BYDAY=1TU',
    'STATUS:CONFIRMED'
  ],
  // A cancelled one-time event.
  [
    'UID:called-off@milkweed',
    'SUMMARY:Called Off',
    'DTSTART:20260620T180000Z',
    'DTEND:20260620T190000Z',
    'STATUS:CANCELLED'
  ]
]

const OVERRIDE_ICS = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  ...OVERRIDE_VEVENTS.flatMap((lines) => ['BEGIN:VEVENT', ...lines, 'END:VEVENT']),
  'END:VCALENDAR'
].join('\r\n')

describe('fetchUpcomingEvents — RECURRENCE-ID overrides', () => {
  it('shows a moved occurrence at its new time and drops the original slot', async () => {
    mockFetch(() => new Response(OVERRIDE_ICS, { status: 200 }))
    const starts = startsFor(await fetchUpcomingEvents(1000), 'Series Dinner')

    // Jul 5 17:00 EDT (UTC-4) = 21:00Z replaces Jul 7 17:30 EDT = 21:30Z.
    expect(starts).toContain('2026-07-05T21:00:00.000Z')
    expect(starts).not.toContain('2026-07-07T21:30:00.000Z')
    // Same for the second move in the series.
    expect(starts).toContain('2026-09-02T21:30:00.000Z')
    expect(starts).not.toContain('2026-09-01T21:30:00.000Z')
  })

  it('drops a cancelled occurrence but keeps the rest of the series', async () => {
    mockFetch(() => new Response(OVERRIDE_ICS, { status: 200 }))
    const starts = startsFor(await fetchUpcomingEvents(1000), 'Series Dinner')

    expect(starts).not.toContain('2026-08-04T21:30:00.000Z')
    // Untouched occurrence: Oct 6 17:30 EDT = 21:30Z.
    expect(starts).toContain('2026-10-06T21:30:00.000Z')
  })

  it('drops a cancelled one-time event', async () => {
    mockFetch(() => new Response(OVERRIDE_ICS, { status: 200 }))
    expect(startsFor(await fetchUpcomingEvents(1000), 'Called Off')).toEqual([])
  })

  it('gives every override its own id even though they share the series UID', async () => {
    mockFetch(() => new Response(OVERRIDE_ICS, { status: 200 }))
    const ids = (await fetchUpcomingEvents(1000)).map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('fetchUpcomingEvents — failure handling', () => {
  it('returns an empty array on a non-OK response', async () => {
    mockFetch(() => new Response('nope', { status: 500 }))
    expect(await fetchUpcomingEvents()).toEqual([])
  })

  it('returns an empty array when the fetch throws', async () => {
    mockFetch(() => {
      throw new Error('network down')
    })
    expect(await fetchUpcomingEvents()).toEqual([])
  })
})
