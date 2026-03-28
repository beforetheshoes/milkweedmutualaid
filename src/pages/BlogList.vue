<script setup lang="ts">
import { onServerPrefetch, ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { getGhostServer } from '../ghost.server'
import { useLang } from '../composables/useLang'
import { useSeo } from '../composables/useSeo'
import { splitPostsByLang } from '../utils/posts'
import { getAllTranslatedSummaries } from '../translation/store'
import { getTags } from '../composables/useTags'
import { getSettings } from '../composables/useSettings'
import type { GhostPostSummary } from '../types/ghost'

const POSTS_PER_PAGE = 12
const SUMMARY_FIELDS = 'id,title,slug,excerpt,custom_excerpt,feature_image,feature_image_alt,published_at,reading_time,featured,og_image,meta_title,meta_description'

const posts = ref<GhostPostSummary[]>([])
const { t } = useI18n()
const errorMessage = ref<string | null>(null)
const warningMessage = ref<string | null>(null)
const lang = useLang()
const selectedTag = ref<string | null>(null)
const visibleCount = ref(POSTS_PER_PAGE)

const tags = computed(() => {
  return getTags().filter((tag) => !tag.slug?.startsWith('xkey-') && tag.slug !== 'en' && tag.slug !== 'es' && tag.slug !== 'auto-translated')
})

const filteredPosts = computed(() => {
  if (!selectedTag.value) return posts.value
  return posts.value.filter((post) => post.tags?.some((tag) => tag?.slug === selectedTag.value))
})

const visiblePosts = computed(() => filteredPosts.value.slice(0, visibleCount.value))
const hasMore = computed(() => visibleCount.value < filteredPosts.value.length)

function selectTag(slug: string | null | undefined) {
  selectedTag.value = slug ?? null
  visibleCount.value = POSTS_PER_PAGE
}

function loadMore() {
  visibleCount.value += POSTS_PER_PAGE
}

const formatDate = (value?: string | null) => {
  if (!value) return null
  const locale = lang.value === 'es' ? 'es' : 'en'
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value))
  } catch {
    return null
  }
}

const readingTimeLabel = (minutes?: number | null) => {
  const safeMinutes = minutes && minutes > 0 ? minutes : 1
  return t('blog.readingTime', { minutes: safeMinutes })
}

const postCountLabel = computed(() => {
  const count = filteredPosts.value.length
  const isSpanish = lang.value === 'es'
  const single = isSpanish ? 'publicación' : 'post'
  const plural = isSpanish ? 'publicaciones' : 'posts'
  const noun = count === 1 ? single : plural
  return `${count} ${noun}`
})

async function browseServerPosts(targetLang: string) {
  const ghostServer = getGhostServer()
  const allPosts = await ghostServer.posts.browse<GhostPostSummary>({
    include: 'tags,authors',
    limit: 'all',
    fields: SUMMARY_FIELDS
  })

  const selected = splitPostsByLang(allPosts, targetLang)

  if (targetLang === 'es') {
    const existingSlugs = new Set(selected.map((p) => p.slug))
    const autoTranslated = getAllTranslatedSummaries().filter((p) => !existingSlugs.has(p.slug))
    selected.push(...autoTranslated)
  }

  if (selected.length > 0) {
    warningMessage.value = null
    return selected
  }

  warningMessage.value = t('blog.fallbackTagWarning', { lang: targetLang })
  return allPosts
}

async function fetchPosts(targetLang: string) {
  try {
    const params = new URLSearchParams({ lang: targetLang })
    const response = await fetch(`/__ghost/posts?${params.toString()}`)
    if (!response.ok) {
      throw new Error(`Ghost request failed with status ${response.status}`)
    }
    const data = (await response.json()) as {
      posts?: GhostPostSummary[]
      error?: string
      warningCode?: string | null
      warningLang?: string | null
    }
    if (data.error) {
      throw new Error(data.error)
    }
    posts.value = data.posts ?? []
    if (data.warningCode === 'missing-tag' && data.warningLang) {
      warningMessage.value = t('blog.fallbackTagWarning', { lang: data.warningLang })
    } else {
      warningMessage.value = null
    }
    errorMessage.value = null
  } catch (error) {
    console.error('[BlogList] Failed to fetch posts', error)
    errorMessage.value = t('blog.fetchError')
    posts.value = []
    warningMessage.value = null
  }
}

const settings = getSettings()
useSeo({
  title: settings?.meta_title ?? settings?.title ?? 'Milkweed Mutual Aid',
  description: settings?.meta_description ?? settings?.description,
  ogImage: settings?.og_image ?? settings?.cover_image,
  ogTitle: settings?.og_title,
  ogDescription: settings?.og_description,
  twitterImage: settings?.twitter_image,
  twitterTitle: settings?.twitter_title,
  twitterDescription: settings?.twitter_description
})

onServerPrefetch(async () => {
  if (typeof window !== 'undefined') return

  try {
    posts.value = await browseServerPosts(lang.value)
  } catch (error) {
    console.error('[BlogList] Server prefetch failed', error)
    posts.value = []
    errorMessage.value = t('blog.fetchError')
    warningMessage.value = null
  }
})

onMounted(() => {
  if (import.meta.env.DEV) {
    fetchPosts(lang.value)
  }
})

if (import.meta.env.DEV) {
  watch(
    lang,
    (next, prev) => {
      if (next !== prev) {
        fetchPosts(next)
      }
    },
    { flush: 'post' }
  )
}
</script>

<template>
  <section class="space-y-8">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div class="space-y-1">
        <span class="badge badge-primary badge-outline font-semibold uppercase tracking-wide">{{ t('blog.badge') }}</span>
        <h1 class="text-3xl font-black tracking-tight text-base-content md:text-4xl">
          {{ t('blog.listHeading') }}
        </h1>
        <p class="text-base text-base-content/60">{{ postCountLabel }}</p>
      </div>
    </div>

    <div v-if="tags.length" class="flex flex-wrap items-center gap-2">
      <span class="text-sm font-medium text-base-content/60">{{ t('blog.filterByTag') }}:</span>
      <button
        class="badge badge-lg transition-colors"
        :class="selectedTag === null ? 'badge-primary' : 'badge-outline badge-primary'"
        @click="selectTag(null)"
      >
        {{ t('blog.allPosts') }}
      </button>
      <button
        v-for="tag in tags"
        :key="tag.slug ?? tag.name ?? ''"
        class="badge badge-lg transition-colors"
        :class="selectedTag === tag.slug ? 'badge-primary' : 'badge-outline'"
        :style="selectedTag === tag.slug && tag.accent_color ? { backgroundColor: tag.accent_color, borderColor: tag.accent_color } : undefined"
        @click="selectTag(tag.slug)"
      >
        {{ tag.name }}
        <span v-if="tag.count?.posts" class="ml-1 opacity-60">{{ tag.count.posts }}</span>
      </button>
    </div>

    <div v-if="errorMessage" class="alert alert-warning">
      <span>{{ errorMessage }}</span>
    </div>

    <div v-else-if="warningMessage" class="alert alert-info">
      <span>{{ warningMessage }}</span>
    </div>

    <div v-if="visiblePosts.length" class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      <RouterLink
        v-for="post in visiblePosts"
        :key="post.id"
        :to="`/${lang}/blog/${post.slug}`"
        class="group relative flex flex-col overflow-hidden rounded-3xl border border-base-200/70 bg-gradient-to-br from-primary/12 via-base-100/92 to-secondary/12 p-6 shadow-lg transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/60 hover:shadow-[0_28px_55px_-18px_rgba(79,70,229,0.55)]"
      >
        <div v-if="post.featured" class="absolute right-4 top-4 z-10">
          <span class="badge badge-primary badge-sm font-semibold">{{ t('blog.featuredBadge') }}</span>
        </div>
        <div v-if="post.feature_image" class="overflow-hidden rounded-2xl bg-primary/10">
          <img
            :src="post.feature_image"
            :alt="post.feature_image_alt ?? post.title"
            class="w-full object-contain transition-transform duration-500 group-hover:scale-105"
          />
        </div>
        <div class="flex flex-1 flex-col gap-4 pt-5">
          <div class="flex flex-wrap items-center gap-3 text-sm text-base-content/60">
            <span v-if="formatDate(post.published_at)">
              {{ formatDate(post.published_at) }}
            </span>
            <span class="hidden h-1 w-1 rounded-full bg-base-content/30 lg:inline" />
            <span>{{ readingTimeLabel(post.reading_time) }}</span>
          </div>
          <h2 class="text-2xl font-semibold text-base-content transition-colors duration-200 group-hover:text-primary">
            {{ post.title }}
          </h2>
          <p class="line-clamp-3 text-base text-base-content/70">
            {{ post.custom_excerpt ?? post.excerpt }}
          </p>
          <div v-if="post.authors?.length" class="flex items-center gap-2">
            <div class="flex -space-x-2">
              <img
                v-for="author in post.authors"
                :key="author.slug ?? author.name ?? ''"
                :src="author.profile_image ?? ''"
                :alt="author.name ?? ''"
                v-show="author.profile_image"
                class="h-7 w-7 rounded-full object-cover ring-2 ring-base-100"
              />
            </div>
            <span class="text-sm text-base-content/60">
              {{ post.authors.map(a => a.name).filter(Boolean).join(', ') }}
            </span>
          </div>
          <div class="mt-auto flex items-center gap-2 text-sm font-semibold text-primary">
            <span>{{ t('blog.readMore') }}</span>
            <span aria-hidden="true" class="text-xl transition-transform duration-200 group-hover:translate-x-1">→</span>
          </div>
        </div>
      </RouterLink>
    </div>

    <div v-else-if="!errorMessage" class="alert alert-info">
      <span>{{ t('blog.noPosts') }}</span>
    </div>

    <div v-if="hasMore" class="flex justify-center">
      <button class="btn btn-primary btn-outline" @click="loadMore">
        {{ t('blog.loadMore') }}
      </button>
    </div>
  </section>
</template>
