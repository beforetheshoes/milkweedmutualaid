// Dates are formatted twice: at build time on Netlify, whose servers run in UTC
// (the HTML that link previews and crawlers read), and again in each visitor's
// browser in their own zone. Pinning the zone makes both agree, and shows the
// collective's Hillsborough times to everyone rather than converting them.
export const SITE_TIME_ZONE = 'America/New_York'

// calendar.server.ts resolves an all-day DATE to midnight UTC, so it has to be
// read back in UTC; in SITE_TIME_ZONE it would land on the previous evening.
const ALL_DAY_TIME_ZONE = 'UTC'

export type DisplayLocale = 'en' | 'es'

export function formatPostDate(value: string | null | undefined, locale: DisplayLocale): string | null {
  if (!value) return null
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: SITE_TIME_ZONE }).format(new Date(value))
  } catch {
    return null
  }
}

export function formatEventDate(start: string, end: string, allDay: boolean, locale: DisplayLocale): string {
  const startDate = new Date(start)
  const dateOptions = { weekday: 'short', month: 'short', day: 'numeric' } as const
  if (allDay) {
    return new Intl.DateTimeFormat(locale, { ...dateOptions, timeZone: ALL_DAY_TIME_ZONE }).format(startDate)
  }
  const timeOptions = { hour: 'numeric', minute: '2-digit', timeZone: SITE_TIME_ZONE } as const
  const datePart = new Intl.DateTimeFormat(locale, { ...dateOptions, timeZone: SITE_TIME_ZONE }).format(startDate)
  const timePart = new Intl.DateTimeFormat(locale, timeOptions).format(startDate)
  const endTimePart = new Intl.DateTimeFormat(locale, timeOptions).format(new Date(end))
  return `${datePart}, ${timePart} – ${endTimePart}`
}
