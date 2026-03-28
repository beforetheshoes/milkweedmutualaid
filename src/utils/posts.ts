import type { GhostTag } from '../types/ghost'

export function hasLangTag(tags: GhostTag[] | null | undefined, code: string): boolean {
  return tags?.some((tag) => tag?.slug === code) ?? false
}

export function splitPostsByLang<T extends { tags?: GhostTag[] | null }>(
  allPosts: T[],
  targetLang: string
): T[] {
  const tagged = allPosts.filter((post) => hasLangTag(post.tags, targetLang))

  if (targetLang === 'en') {
    const untagged = allPosts.filter(
      (post) => !hasLangTag(post.tags, 'en') && !hasLangTag(post.tags, 'es')
    )
    return [...tagged, ...untagged]
  }

  return tagged
}
