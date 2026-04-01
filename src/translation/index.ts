import { getGhostServer } from '../ghost.server'
import { hasLangTag } from '../utils/posts'
import { computeHash, readCache, writeCache } from './cache'
import { translateHtml, translateText } from './html-translator'
import { setTranslatedPost } from './store'
import type { GhostPostDetail, GhostTag } from '../types/ghost'

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function findXkey(tags: GhostTag[] | null | undefined): string | undefined {
  return tags?.find((tag) => tag?.name?.startsWith('#xkey-'))?.name ?? undefined
}

export async function translateMissingPosts(): Promise<string[]> {
  const ghostServer = getGhostServer()

  const allPostsRaw = await ghostServer.posts.browse<GhostPostDetail>({
    include: 'tags,authors',
    limit: 'all',
    fields: 'id,title,slug,html,excerpt,custom_excerpt,feature_image,feature_image_alt,feature_image_caption,published_at,reading_time,canonical_url,og_image,og_title,og_description,twitter_image,twitter_title,twitter_description,meta_title,meta_description'
  }).catch(() => [] as GhostPostDetail[])

  const allPosts = Array.isArray(allPostsRaw) ? allPostsRaw : []

  const englishPosts = allPosts.filter(
    (post) => hasLangTag(post.tags, 'en') || (!hasLangTag(post.tags, 'en') && !hasLangTag(post.tags, 'es'))
  )

  const xkeysWithSpanish = new Set<string>()
  for (const post of allPosts) {
    if (hasLangTag(post.tags, 'es')) {
      const xkey = findXkey(post.tags)
      if (xkey) {
        xkeysWithSpanish.add(xkey)
      }
    }
  }

  const needsTranslation = englishPosts.filter((post) => {
    const xkey = findXkey(post.tags)
    if (xkey && xkeysWithSpanish.has(xkey)) {
      return false
    }
    return true
  })

  if (needsTranslation.length === 0) {
    console.log('[translate] All English posts have Spanish counterparts, nothing to translate.')
    return []
  }

  console.log(`[translate] ${needsTranslation.length} post(s) need auto-translation to Spanish`)

  const newRoutes: string[] = []

  for (const post of needsTranslation) {
    const title = post.title ?? ''
    const excerpt = post.excerpt ?? ''
    const html = post.html ?? ''

    if (!html && !title) {
      continue
    }

    const hash = computeHash(title, excerpt, html)
    const cached = readCache(post.slug, hash)

    let translatedTitle: string
    let translatedExcerpt: string
    let translatedHtml: string

    if (cached) {
      console.log(`[translate] Cache hit: ${post.slug}`)
      translatedTitle = cached.translatedTitle
      translatedExcerpt = cached.translatedExcerpt
      translatedHtml = cached.translatedHtml
    } else {
      console.log(`[translate] Translating: ${post.slug}`)
      try {
        translatedTitle = await translateText(title)
        await delay(500)
        translatedExcerpt = excerpt ? await translateText(excerpt) : ''
        await delay(500)
        translatedHtml = html ? await translateHtml(html) : ''

        writeCache(post.slug, {
          contentHash: hash,
          translatedTitle,
          translatedExcerpt,
          translatedHtml,
          cachedAt: new Date().toISOString()
        })
      } catch (error) {
        console.warn(`[translate] Failed to translate "${post.slug}": ${(error as Error).message}`)
        continue
      }
    }

    const esTags: GhostTag[] = (post.tags ?? [])
      .filter((tag) => tag?.slug !== 'en')
      .concat({ slug: 'es', name: 'es' }, { slug: 'auto-translated', name: 'Auto-translated' })

    const syntheticPost: GhostPostDetail = {
      id: `auto-es-${post.id}`,
      title: translatedTitle,
      slug: post.slug,
      html: translatedHtml,
      excerpt: translatedExcerpt,
      custom_excerpt: post.custom_excerpt,
      feature_image: post.feature_image,
      feature_image_alt: post.feature_image_alt,
      feature_image_caption: post.feature_image_caption,
      published_at: post.published_at,
      reading_time: post.reading_time,
      canonical_url: post.canonical_url,
      og_image: post.og_image,
      og_title: post.og_title,
      og_description: post.og_description,
      twitter_image: post.twitter_image,
      twitter_title: post.twitter_title,
      twitter_description: post.twitter_description,
      meta_title: post.meta_title,
      meta_description: post.meta_description,
      authors: post.authors,
      tags: esTags,
      autoTranslated: true,
      originalSlug: post.slug
    }

    setTranslatedPost(post.slug, syntheticPost, post.slug)
    newRoutes.push(`/es/blog/${post.slug}`)

    await delay(1000)
  }

  console.log(`[translate] Auto-translated ${newRoutes.length} post(s)`)
  return newRoutes
}
