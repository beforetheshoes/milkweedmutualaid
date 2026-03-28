import type { GhostPostSummary, GhostPostDetail } from '../types/ghost'

const translatedPosts = new Map<string, GhostPostDetail>()
const translatedSummaries = new Map<string, GhostPostSummary>()
const enToEsSlug = new Map<string, { slug: string; title: string }>()

export function setTranslatedPost(slug: string, post: GhostPostDetail, originalSlug: string): void {
  translatedPosts.set(slug, post)

  const { html: _html, authors: _authors, ...summary } = post
  translatedSummaries.set(slug, summary)

  enToEsSlug.set(originalSlug, { slug, title: post.title })
}

export function getTranslatedPost(slug: string): GhostPostDetail | undefined {
  return translatedPosts.get(slug)
}

export function getAllTranslatedSummaries(): GhostPostSummary[] {
  return Array.from(translatedSummaries.values())
}

export function getAutoTranslatedCounterpart(enSlug: string): { slug: string; title: string } | undefined {
  return enToEsSlug.get(enSlug)
}

export function isAutoTranslated(slug: string): boolean {
  return translatedPosts.has(slug)
}
