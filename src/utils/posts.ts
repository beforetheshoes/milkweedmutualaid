import type { GhostTag } from '../types/ghost'

export function hasLangTag(tags: GhostTag[] | null | undefined, code: string): boolean {
  return tags?.some((tag) => tag?.slug === code) ?? false
}

function sortByDate<T extends { published_at?: string | null }>(posts: T[]): T[] {
  return posts.sort((a, b) => {
    const da = a.published_at ? new Date(a.published_at).getTime() : 0
    const db = b.published_at ? new Date(b.published_at).getTime() : 0
    return db - da
  })
}

export function splitPostsByLang<T extends { tags?: GhostTag[] | null; published_at?: string | null }>(
  allPosts: T[],
  targetLang: string
): T[] {
  const tagged = allPosts.filter((post) => hasLangTag(post.tags, targetLang))

  if (targetLang === 'en') {
    const untagged = allPosts.filter(
      (post) => !hasLangTag(post.tags, 'en') && !hasLangTag(post.tags, 'es')
    )
    return sortByDate([...tagged, ...untagged])
  }

  return sortByDate(tagged)
}
