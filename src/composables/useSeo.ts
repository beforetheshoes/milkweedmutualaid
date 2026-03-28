import { useHead } from '@unhead/vue'
import type { MaybeRef } from 'vue'
import { computed, unref } from 'vue'

interface SeoOptions {
  title?: MaybeRef<string | null | undefined>
  description?: MaybeRef<string | null | undefined>
  ogImage?: MaybeRef<string | null | undefined>
  ogTitle?: MaybeRef<string | null | undefined>
  ogDescription?: MaybeRef<string | null | undefined>
  twitterImage?: MaybeRef<string | null | undefined>
  twitterTitle?: MaybeRef<string | null | undefined>
  twitterDescription?: MaybeRef<string | null | undefined>
  canonicalUrl?: MaybeRef<string | null | undefined>
  siteName?: string
}

export function useSeo(options: SeoOptions) {
  const siteName = options.siteName ?? 'Milkweed Mutual Aid'

  useHead({
    title: computed(() => unref(options.title) ?? 'Milkweed Mutual Aid'),
    meta: computed(() => {
      const title = unref(options.title) ?? 'Milkweed Mutual Aid'
      const description = unref(options.description)
      const ogDesc = unref(options.ogDescription) ?? description
      const twDesc = unref(options.twitterDescription) ?? description
      const ogImg = unref(options.ogImage)
      const twImg = unref(options.twitterImage)

      const meta: Array<{ name?: string; property?: string; content: string }> = [
        { property: 'og:site_name', content: siteName },
        { property: 'og:title', content: unref(options.ogTitle) ?? title },
        { property: 'og:type', content: 'website' },
        { name: 'twitter:card', content: twImg ? 'summary_large_image' : 'summary' },
        { name: 'twitter:title', content: unref(options.twitterTitle) ?? title }
      ]

      if (description) meta.push({ name: 'description', content: description })
      if (ogDesc) meta.push({ property: 'og:description', content: ogDesc })
      if (ogImg) meta.push({ property: 'og:image', content: ogImg })
      if (twDesc) meta.push({ name: 'twitter:description', content: twDesc })
      if (twImg) meta.push({ name: 'twitter:image', content: twImg })

      return meta
    }),
    link: computed(() => {
      const canonical = unref(options.canonicalUrl)
      return canonical ? [{ rel: 'canonical', href: canonical }] : []
    })
  })
}
