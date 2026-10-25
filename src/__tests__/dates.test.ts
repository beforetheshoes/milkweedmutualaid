import { describe, it, expect } from 'vitest'
import { formatEventDate, formatPostDate } from '../utils/dates'

// ICU separates time and AM/PM with a narrow no-break space; compare on plain spaces.
const plain = (value: string | null) => value?.replace(/\s/g, ' ') ?? null

// These must hold whatever zone the process runs in — Netlify builds in UTC,
// visitors' browsers run anywhere — so no expectation depends on the host's TZ.

describe('formatEventDate', () => {
  it('shows a timed event at its Hillsborough time', () => {
    // Sun Nov 1 2026, 17:00–19:00 EST (UTC-5; DST ended that morning).
    expect(plain(formatEventDate('2026-11-01T22:00:00.000Z', '2026-11-02T00:00:00.000Z', false, 'en'))).toBe(
      'Sun, Nov 1, 5:00 PM – 7:00 PM'
    )
  })

  it('uses daylight time in summer', () => {
    // Tue Jul 7 2026, 17:30–19:30 EDT (UTC-4).
    expect(plain(formatEventDate('2026-07-07T21:30:00.000Z', '2026-07-07T23:30:00.000Z', false, 'en'))).toBe(
      'Tue, Jul 7, 5:30 PM – 7:30 PM'
    )
  })

  it('keeps an evening event on its own day when it crosses midnight UTC', () => {
    // Thu Nov 12 2026, 18:00–20:00 EST = 23:00Z–01:00Z (next day in UTC).
    expect(plain(formatEventDate('2026-11-12T23:00:00.000Z', '2026-11-13T01:00:00.000Z', false, 'en'))).toBe(
      'Thu, Nov 12, 6:00 PM – 8:00 PM'
    )
  })

  it('shows an all-day event on its own date, not the evening before', () => {
    // calendar.server.ts emits DTSTART;VALUE=DATE:20260620 as midnight UTC.
    expect(formatEventDate('2026-06-20T00:00:00.000Z', '2026-06-21T00:00:00.000Z', true, 'en')).toBe('Sat, Jun 20')
    expect(formatEventDate('2026-06-20T00:00:00.000Z', '2026-06-21T00:00:00.000Z', true, 'es')).toBe('sáb, 20 jun')
  })

  it('formats Spanish with Hillsborough times', () => {
    expect(plain(formatEventDate('2026-11-01T22:00:00.000Z', '2026-11-02T00:00:00.000Z', false, 'es'))).toBe(
      'dom, 1 nov, 17:00 – 19:00'
    )
  })
})

describe('formatPostDate', () => {
  it('dates a late-evening post by its Hillsborough day', () => {
    // 10:30 PM EDT on Oct 25 is already Oct 26 in UTC.
    expect(formatPostDate('2026-10-26T02:30:00.000Z', 'en')).toBe('October 25, 2026')
    expect(formatPostDate('2026-10-26T02:30:00.000Z', 'es')).toBe('25 de octubre de 2026')
  })

  it('returns null for a missing or unparseable date', () => {
    expect(formatPostDate(null, 'en')).toBeNull()
    expect(formatPostDate(undefined, 'en')).toBeNull()
    expect(formatPostDate('not a date', 'en')).toBeNull()
  })
})
