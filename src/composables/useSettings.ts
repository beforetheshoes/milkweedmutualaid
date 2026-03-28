import type { GhostSettings } from '../types/ghost'

let settings: GhostSettings | null = null

export function setSettings(s: GhostSettings): void {
  settings = s
}

export function getSettings(): GhostSettings | null {
  return settings
}
