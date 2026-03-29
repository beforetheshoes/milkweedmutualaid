<script setup lang="ts">
import { onServerPrefetch, ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getGhostServer } from '../ghost.server'
import { useLang } from '../composables/useLang'
import { useSeo } from '../composables/useSeo'
import { hasLangTag } from '../utils/posts'
import { getTranslatedPost, getAutoTranslatedCounterpart } from '../translation/store'
import { appState } from '../state'
import { ghostSrcset, ghostSizes } from '../utils/images'
import type { GhostPostDetail } from '../types/ghost'

const DETAIL_FIELDS = 'id,title,slug,html,plaintext,excerpt,custom_excerpt,feature_image,feature_image_alt,feature_image_caption,published_at,reading_time,canonical_url,og_image,og_title,og_description,twitter_image,twitter_title,twitter_description,meta_title,meta_description'

const route = useRoute()
const { t } = useI18n()
const routePath = computed(() => route.path)
const pageState = computed(() => appState.postPages[routePath.value])
const post = computed(() => pageState.value?.post ?? null)
const counterpart = computed(() => pageState.value?.counterpart ?? null)
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
    return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(post.value.published_at))
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

  if (targetLang === 'en' && !taggedLang && !taggedOther) return candidate
  if (!taggedLang) return null
  return candidate
}

function setPageState(postData: GhostPostDetail | null, counterpartData: GhostPostDetail | null) {
  appState.postPages[routePath.value] = { post: postData, counterpart: counterpartData }
}

async function fetchPost(targetLang: string, targetSlug: string) {
  if (!targetSlug) return
  try {
    const params = new URLSearchParams({ lang: targetLang, slug: targetSlug })
    const response = await fetch(`/__ghost/posts?${params.toString()}`)
    if (!response.ok) throw new Error(`Ghost request failed with status ${response.status}`)
    const data = (await response.json()) as {
      post?: GhostPostDetail | null
      counterpart?: GhostPostDetail | null
      error?: string
    }
    if (data.error) throw new Error(data.error)
    setPageState(data.post ?? null, data.counterpart ?? null)
    errorMessage.value = null
  } catch (error) {
    console.error('[BlogPost] Failed to fetch post', error)
    errorMessage.value = t('blog.fetchError')
    setPageState(null, null)
  }
}

onServerPrefetch(async () => {
  if (typeof window !== 'undefined' || !slug.value) return
  try {
    const fetchedPost = await browseServerPost(lang.value, slug.value)
    if (!fetchedPost) {
      setPageState(null, null)
      return
    }

    let fetchedCounterpart: GhostPostDetail | null = null

    if (fetchedPost.autoTranslated && fetchedPost.originalSlug) {
      const ghostServer = getGhostServer()
      const original = await ghostServer.posts.browse<GhostPostDetail>({
        filter: `slug:${fetchedPost.originalSlug}`,
        include: 'tags,authors',
        limit: 1,
        fields: 'id,title,slug,reading_time'
      })
      fetchedCounterpart = original[0] ?? null
    } else {
      const keyTag = fetchedPost.tags?.find((tag) => tag?.name?.startsWith('#xkey-'))?.name
      if (keyTag) {
        const ghostServer = getGhostServer()
        const sibling = await ghostServer.posts.browse<GhostPostDetail>({
          filter: `tag:${lang.value === 'en' ? 'es' : 'en'}+tag:${keyTag.replace('#', '')}`,
          include: 'tags,authors',
          limit: 1,
          fields: 'id,title,slug,reading_time'
        })
        fetchedCounterpart = sibling[0] ?? null
      } else if (lang.value === 'en') {
        const autoCounterpart = getAutoTranslatedCounterpart(slug.value)
        if (autoCounterpart) {
          fetchedCounterpart = { id: 'auto-es-counterpart', title: autoCounterpart.title, slug: autoCounterpart.slug }
        }
      }
    }

    setPageState(fetchedPost, fetchedCounterpart)
  } catch (error) {
    console.error('[BlogPost] Server prefetch failed', error)
    errorMessage.value = t('blog.fetchError')
    setPageState(null, null)
  }
})

onMounted(() => {
  if (import.meta.env.DEV) fetchPost(lang.value, slug.value)
})

if (import.meta.env.DEV) {
  watch(
    () => [lang.value, slug.value] as const,
    ([nextLang, nextSlug], [prevLang, prevSlug]) => {
      if (nextLang !== prevLang || nextSlug !== prevSlug) fetchPost(nextLang, nextSlug)
    },
    { flush: 'post' }
  )
}
</script>

<template>
  <article v-if="post" class="space-y-8">
    <!-- Back -->
    <RouterLink
      :to="`/${lang}/blog`"
      class="inline-flex items-center gap-1.5 rounded-lg border-2 border-base-300 px-3 py-1.5 text-sm font-bold transition-all hover:-translate-y-0.5 hover:border-primary hover:text-primary"
    >
      <span aria-hidden="true">←</span> {{ t('blog.listHeading') }}
    </RouterLink>

    <!-- Auto-translated notice -->
    <div v-if="post.autoTranslated" class="rounded-lg border-3 border-accent bg-accent/10 p-3 text-sm font-bold">
      {{ t('blog.autoTranslated') }}
    </div>

    <!-- Header -->
    <header class="space-y-4">
      <div class="flex flex-wrap items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-base-content/50">
        <span v-if="post.featured" class="rounded bg-secondary px-2 py-0.5 text-secondary-content">{{ t('blog.featuredBadge') }}</span>
        <span v-if="formattedDate">{{ formattedDate }}</span>
        <span v-if="readingTime">· {{ readingTime }}</span>
      </div>

      <h1 class="text-3xl font-extrabold leading-tight tracking-tight md:text-5xl">
        {{ post.title }}
      </h1>

      <div class="flex flex-wrap items-center justify-between gap-4 border-b-3 border-primary/20 pb-5">
        <div v-if="post.authors?.length" class="flex items-center gap-3">
          <div class="flex -space-x-2">
            <img
              v-for="author in post.authors"
              :key="author.slug ?? author.name ?? ''"
              v-show="author.profile_image"
              :src="author.profile_image ?? ''"
              :alt="author.name ?? ''"
              class="h-9 w-9 rounded-full object-cover ring-3 ring-base-100"
            />
          </div>
          <span class="font-bold text-base-content/60">
            {{ post.authors.map(a => a.name).filter(Boolean).join(', ') }}
          </span>
        </div>

        <RouterLink
          v-if="toggleHref"
          :to="toggleHref"
          class="rounded-lg border-3 border-accent bg-accent px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest text-accent-content shadow-[3px_3px_0_0] shadow-accent/30 transition-all hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0]"
        >
          {{ toggleLabel }}
        </RouterLink>
      </div>
    </header>

    <!-- Feature image -->
    <figure v-if="post.feature_image" class="mx-auto max-w-xl overflow-hidden rounded-xl border-3 border-base-300 shadow-[4px_4px_0_0] shadow-base-300/50">
      <img
        :src="post.feature_image"
        :srcset="ghostSrcset(post.feature_image)"
        :sizes="ghostSizes('full')"
        :alt="post.feature_image_alt ?? post.title"
        loading="eager"
        class="w-full object-contain"
      />
      <figcaption
        v-if="post.feature_image_caption"
        class="border-t-2 border-base-300 bg-base-200 px-4 py-2 text-center text-xs text-base-content/50"
        v-html="post.feature_image_caption"
      />
    </figure>

    <!-- Content -->
    <div
      v-if="post.html"
      class="prose prose-lg mx-auto max-w-none prose-headings:font-extrabold prose-headings:tracking-tight prose-a:text-primary prose-a:decoration-2 prose-a:underline-offset-2 prose-blockquote:not-italic"
    >
      <div v-html="post.html"></div>
    </div>
  </article>

  <div v-else-if="errorMessage" class="rounded-xl border-3 border-warning bg-warning/10 p-6 font-bold">
    {{ errorMessage }}
  </div>

  <div v-else class="py-20 text-center text-lg font-bold text-base-content/40">
    {{ t('blog.missingPost') }}
  </div>
</template>
