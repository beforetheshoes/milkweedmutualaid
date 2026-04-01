import { getGhostServer } from './ghost.server'
import { setSettings } from './composables/useSettings'
import { setTags } from './composables/useTags'
import { setEvents } from './composables/useEvents'
import { fetchUpcomingEvents } from './calendar.server'
import type { GhostTag, GhostSettings } from './types/ghost'

type MinimalPost = {
  slug?: string | null
  tags?: Array<{ slug?: string | null }> | null
}

type MinimalPage = {
  slug?: string | null
}

export async function includedRoutes() {
  const ghostServer = getGhostServer()
  const collected = new Set<string>(['/', '/en/blog', '/es/blog', '/en/about', '/es/about', '/en/interest', '/es/interest', '/en/contribute', '/es/contribute'])

  const [allPostsRaw, allPagesRaw, settings, tagsRaw] = await Promise.all([
    ghostServer.posts.browse<MinimalPost>({
      include: 'tags',
      fields: 'slug',
      limit: 'all'
    }).catch(() => [] as MinimalPost[]),
    ghostServer.pages.browse<MinimalPage>({
      fields: 'slug',
      limit: 'all'
    }).catch(() => [] as MinimalPage[]),
    ghostServer.settings.browse().catch(() => ({}) as GhostSettings) as Promise<GhostSettings>,
    ghostServer.tags.browse<GhostTag>({
      include: 'count.posts',
      filter: 'visibility:public',
      limit: 'all'
    }).catch(() => [] as GhostTag[])
  ])

  const allPosts = Array.isArray(allPostsRaw) ? allPostsRaw : []
  const allPages = Array.isArray(allPagesRaw) ? allPagesRaw : []
  const tags = Array.isArray(tagsRaw) ? tagsRaw : []

  setSettings(settings)
  setTags(tags)

  const events = await fetchUpcomingEvents()
  setEvents(events)

  const hasLangTag = (post: MinimalPost, lang: 'en' | 'es') => post.tags?.some((tag) => tag?.slug === lang) ?? false

  for (const post of allPosts) {
    if (!post.slug) continue
    const taggedEn = hasLangTag(post, 'en')
    const taggedEs = hasLangTag(post, 'es')
    if (taggedEn || (!taggedEn && !taggedEs)) {
      collected.add(`/en/blog/${post.slug}`)
    }
    if (taggedEs) {
      collected.add(`/es/blog/${post.slug}`)
    }
  }

  for (const page of allPages) {
    if (!page.slug) continue
    collected.add(`/en/page/${page.slug}`)
    collected.add(`/es/page/${page.slug}`)
  }

  const { translateMissingPosts } = await import('./translation/index')
  const autoTranslatedRoutes = await translateMissingPosts()
  for (const route of autoTranslatedRoutes) {
    collected.add(route)
  }

  return Array.from(collected)
}
