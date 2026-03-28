import type { GhostTag } from '../types/ghost'

let allTags: GhostTag[] = []

export function setTags(tags: GhostTag[]): void {
  allTags = tags
}

export function getTags(): GhostTag[] {
  return allTags
}
