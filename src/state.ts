import { reactive } from 'vue'
import type { GhostPostSummary, GhostPostDetail, GhostTag } from './types/ghost'
import type { CalendarEvent } from './types/event'

export interface PostPageState {
  post: GhostPostDetail | null
  counterpart: GhostPostDetail | null
}

export interface AppState {
  posts: Record<string, GhostPostSummary[]>
  events: CalendarEvent[]
  tags: GhostTag[]
  postPages: Record<string, PostPageState>
}

export const appState: AppState = reactive({
  posts: {},
  events: [],
  tags: [],
  postPages: {}
})
