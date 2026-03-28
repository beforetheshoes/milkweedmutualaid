import type { CalendarEvent } from '../types/event'

let events: CalendarEvent[] = []

export function setEvents(e: CalendarEvent[]): void {
  events = e
}

export function getEvents(): CalendarEvent[] {
  return events
}
