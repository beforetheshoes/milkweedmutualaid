<script setup lang="ts">
import { onServerPrefetch, ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getGhostServer } from '../ghost.server'
import { useLang } from '../composables/useLang'
import { useSeo } from '../composables/useSeo'
import { hasLangTag } from '../utils/posts'
import { getTranslatedPost, getAutoTranslatedCounterpart } from '../translation/store'
import type { GhostPostDetail } from '../types/ghost'

const DETAIL_FIELDS = 'id,title,slug,html,plaintext,excerpt,custom_excerpt,feature_image,feature_image_alt,feature_image_caption,published_at,reading_time,canonical_url,og_image,og_title,og_description,twitter_image,twitter_title,twitter_description,meta_title,meta_description'

const route = useRoute()
const { t } = useI18n()
const post = ref<GhostPostDetail | null>(null)
const counterpart = ref<GhostPostDetail | null>(null)
const errorMessage = ref<string | null>(null)
const lang = useLang()

const slug = computed(() => {
  const value = route.params.slug
  return Array.isArray(value) ? value[0] ?? '' : value ?? ''
})

const formattedDate = computed(() => {
  if (!post.value?.published_at) return null
  const locale = lang.value === 'es' ? 'es' : 'en'
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(post.value.published_at))
  } catch {
    return null
  }
})

const readingTime = computed(() => {
  if (!post.value) return null
  const minutes = post.value.reading_time && post.value.reading_time > 0 ? post.value.reading_time : 1
  return t('blog.readingTime', { minutes })
})

const toggleHref = computed(() => {
  if (!counterpart.value) return null
  const otherLang = lang.value === 'en' ? 'es' : 'en'
  return `/${otherLang}/blog/${counterpart.value.slug}`
})

const toggleLabel = computed(() => {
  return lang.value === 'en' ? t('blog.toggleEs') : t('blog.toggleEn')
})

useSeo({
  title: computed(() => post.value?.meta_title ?? post.value?.title),
  description: computed(() => post.value?.meta_description ?? post.value?.custom_excerpt ?? post.value?.excerpt),
  ogImage: computed(() => post.value?.og_image ?? post.value?.feature_image),
  ogTitle: computed(() => post.value?.og_title ?? post.value?.title),
  ogDescription: computed(() => post.value?.og_description ?? post.value?.custom_excerpt ?? post.value?.excerpt),
  twitterImage: computed(() => post.value?.twitter_image ?? post.value?.feature_image),
  twitterTitle: computed(() => post.value?.twitter_title ?? post.value?.title),
  twitterDescription: computed(() => post.value?.twitter_description ?? post.value?.custom_excerpt ?? post.value?.excerpt),
  canonicalUrl: computed(() => post.value?.canonical_url)
})

async function browseServerPost(targetLang: string, targetSlug: string) {
  if (targetLang === 'es') {
    const translated = getTranslatedPost(targetSlug)
    if (translated) return translated
  }

  const ghostServer = getGhostServer()
  const result = await ghostServer.posts.browse<GhostPostDetail>({
    filter: `slug:${targetSlug}`,
    include: 'tags,authors',
    limit: 1,
    fields: DETAIL_FIELDS,
    formats: 'html,plaintext'
  })

  const candidate = result[0] ?? null
  if (!candidate) return null

  const taggedLang = hasLangTag(candidate.tags, targetLang)
  const taggedOther = hasLangTag(candidate.tags, targetLang === 'en' ? 'es' : 'en')

  if (targetLang === 'en' && !taggedLang && !taggedOther) {
    // post doesn't match requested language
    return candidate
  }

  if (!taggedLang) {
    // post doesn't match requested language
    return null
  }

  return candidate
}

async function fetchPost(targetLang: string, targetSlug: string) {
  if (!targetSlug) return

  try {
    const params = new URLSearchParams({ lang: targetLang, slug: targetSlug })
    const response = await fetch(`/__ghost/posts?${params.toString()}`)
    if (!response.ok) {
      throw new Error(`Ghost request failed with status ${response.status}`)
    }
    const data = (await response.json()) as {
      post?: GhostPostDetail | null
      counterpart?: GhostPostDetail | null
      error?: string
      warningCode?: string | null
      warningLang?: string | null
    }

    if (data.error) throw new Error(data.error)

    post.value = data.post ?? null
    counterpart.value = data.counterpart ?? null

    errorMessage.value = null
  } catch (error) {
    console.error('[BlogPost] Failed to fetch post', error)
    errorMessage.value = t('blog.fetchError')
    post.value = null
    counterpart.value = null
  }
}

onServerPrefetch(async () => {
  if (typeof window !== 'undefined') return
  if (!slug.value) return

  try {
    post.value = await browseServerPost(lang.value, slug.value)
    if (!post.value) return

    if (post.value.autoTranslated && post.value.originalSlug) {
      const ghostServer = getGhostServer()
      const original = await ghostServer.posts.browse<GhostPostDetail>({
        filter: `slug:${post.value.originalSlug}`,
        include: 'tags,authors',
        limit: 1,
        fields: 'id,title,slug,reading_time'
      })
      counterpart.value = original[0] ?? null
      return
    }

    const keyTag = post.value.tags?.find((tag) => tag?.name?.startsWith('#xkey-'))?.name

    if (!keyTag) {
      if (lang.value === 'en') {
        const autoCounterpart = getAutoTranslatedCounterpart(slug.value)
        if (autoCounterpart) {
          counterpart.value = {
            id: `auto-es-counterpart`,
            title: autoCounterpart.title,
            slug: autoCounterpart.slug
          }
        }
      }
      return
    }

    const ghostServer = getGhostServer()
    const sibling = await ghostServer.posts.browse<GhostPostDetail>({
      filter: `tag:${lang.value === 'en' ? 'es' : 'en'}+tag:${keyTag.replace('#', '')}`,
      include: 'tags,authors',
      limit: 1,
      fields: 'id,title,slug,reading_time'
    })

    counterpart.value = sibling[0] ?? null
  } catch (error) {
    console.error('[BlogPost] Server prefetch failed', error)
    errorMessage.value = t('blog.fetchError')
    post.value = null
    counterpart.value = null
    // language tag matches
  }
})

onMounted(() => {
  if (import.meta.env.DEV) {
    fetchPost(lang.value, slug.value)
  }
})

if (import.meta.env.DEV) {
  watch(
    () => [lang.value, slug.value] as const,
    ([nextLang, nextSlug], [prevLang, prevSlug]) => {
      if (nextLang !== prevLang || nextSlug !== prevSlug) {
        fetchPost(nextLang, nextSlug)
      }
    },
    { flush: 'post' }
  )
}
</script>

<template>
  <section class="space-y-8">
    <div v-if="errorMessage" class="alert alert-warning">
      <span>{{ errorMessage }}</span>
    </div>

    <div v-if="post?.autoTranslated" class="alert alert-info">
      <span>{{ t('blog.autoTranslated') }}</span>
    </div>

    <article v-if="post" class="space-y-8">
      <div class="space-y-4">
        <div class="flex flex-wrap items-center gap-3 text-sm text-base-content/60">
          <span class="badge badge-outline badge-primary uppercase tracking-wide">
            {{ t('blog.postBadge') }}
          </span>
          <span v-if="post.featured" class="badge badge-primary badge-sm font-semibold">
            {{ t('blog.featuredBadge') }}
          </span>
          <span v-if="formattedDate">{{ formattedDate }}</span>
          <span v-if="formattedDate && readingTime" class="h-1 w-1 rounded-full bg-base-content/30" />
          <span v-if="readingTime">{{ readingTime }}</span>
        </div>

        <h1 class="text-3xl font-black tracking-tight text-base-content md:text-4xl lg:text-5xl">
          {{ post.title }}
        </h1>

        <div class="flex flex-wrap items-center justify-between gap-4">
          <div v-if="post.authors?.length" class="flex items-center gap-3">
            <div class="flex -space-x-2">
              <img
                v-for="author in post.authors"
                :key="author.slug ?? author.name ?? ''"
                :src="author.profile_image ?? ''"
                :alt="author.name ?? ''"
                v-show="author.profile_image"
                class="h-9 w-9 rounded-full object-cover ring-2 ring-base-100"
              />
            </div>
            <span class="text-sm text-base-content/70">
              {{ post.authors.map(a => a.name).filter(Boolean).join(', ') }}
            </span>
          </div>

          <RouterLink v-if="toggleHref" :to="toggleHref" class="btn btn-outline btn-primary btn-sm">
            {{ toggleLabel }}
          </RouterLink>
        </div>
      </div>

      <figure v-if="post.feature_image" class="mx-auto max-w-xl overflow-hidden rounded-2xl">
        <img :src="post.feature_image" :alt="post.feature_image_alt ?? post.title" class="w-full object-contain" />
        <figcaption
          v-if="post.feature_image_caption"
          class="px-4 py-3 text-center text-sm text-base-content/60"
          v-html="post.feature_image_caption"
        />
      </figure>

      <div
        v-if="post.html"
        class="prose prose-lg mx-auto max-w-3xl text-base-content prose-headings:font-semibold prose-headings:text-base-content prose-a:text-primary prose-blockquote:border-primary/40 prose-blockquote:text-base-content/80"
      >
        <div v-html="post.html"></div>
      </div>
    </article>

    <section v-else-if="!errorMessage" class="alert alert-warning">
      <span>{{ t('blog.missingPost') }}</span>
    </section>
  </section>
</template>
