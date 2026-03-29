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
import { getEvents } from '../composables/useEvents'
import { appState } from '../state'
import { ghostSrcset, ghostSizes } from '../utils/images'
import type { GhostPostSummary } from '../types/ghost'

const POSTS_PER_PAGE = 12
const SUMMARY_FIELDS = 'id,title,slug,excerpt,custom_excerpt,feature_image,feature_image_alt,published_at,reading_time,featured,og_image,meta_title,meta_description'

const { t } = useI18n()

const signupEmail = ref('')
const signupStatus = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const signupError = ref('')
const ghostUrl = typeof window !== 'undefined' ? 'https://milkweedmutualaid.org' : ''

async function handleSignup() {
  if (!signupEmail.value.trim()) return
  signupStatus.value = 'loading'
  try {
    const response = await fetch(`${ghostUrl}/members/api/send-magic-link/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: signupEmail.value.trim(),
        emailType: 'subscribe'
      })
    })
    if (response.ok) {
      signupStatus.value = 'success'
      signupEmail.value = ''
    } else {
      throw new Error(`${response.status}`)
    }
  } catch {
    signupStatus.value = 'error'
    signupError.value = t('newsletter.error')
  }
}

const errorMessage = ref<string | null>(null)
const warningMessage = ref<string | null>(null)
const lang = useLang()
const selectedTag = ref<string | null>(null)
const visibleCount = ref(POSTS_PER_PAGE)

const tags = computed(() => {
  return appState.tags.filter((tag) => !tag.slug?.startsWith('xkey-') && tag.slug !== 'en' && tag.slug !== 'es' && tag.slug !== 'auto-translated')
})

const posts = computed(() => appState.posts[lang.value] ?? [])

const filteredPosts = computed(() => {
  if (!selectedTag.value) return posts.value
  return posts.value.filter((post) => post.tags?.some((tag) => tag?.slug === selectedTag.value))
})

const featuredPost = computed(() => filteredPosts.value[0] ?? null)
const restPosts = computed(() => filteredPosts.value.slice(1, visibleCount.value))
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
    return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(value))
  } catch {
    return null
  }
}

const formatEventDate = (start: string, end: string, allDay: boolean) => {
  const locale = lang.value === 'es' ? 'es' : 'en'
  const startDate = new Date(start)
  if (allDay) {
    return new Intl.DateTimeFormat(locale, { weekday: 'short', month: 'short', day: 'numeric' }).format(startDate)
  }
  const datePart = new Intl.DateTimeFormat(locale, { weekday: 'short', month: 'short', day: 'numeric' }).format(startDate)
  const timePart = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(startDate)
  const endDate = new Date(end)
  const endTimePart = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(endDate)
  return `${datePart}, ${timePart} – ${endTimePart}`
}

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
    if (!response.ok) throw new Error(`Ghost request failed with status ${response.status}`)
    const data = (await response.json()) as {
      posts?: GhostPostSummary[]
      error?: string
      warningCode?: string | null
      warningLang?: string | null
    }
    if (data.error) throw new Error(data.error)
    appState.posts[targetLang] = data.posts ?? []
    warningMessage.value = data.warningCode === 'missing-tag' && data.warningLang
      ? t('blog.fallbackTagWarning', { lang: data.warningLang })
      : null
    errorMessage.value = null
  } catch (error) {
    console.error('[BlogList] Failed to fetch posts', error)
    errorMessage.value = t('blog.fetchError')
    appState.posts[targetLang] = []
    warningMessage.value = null
  }
}

const settings = getSettings()
useSeo({
  title: settings?.meta_title ?? settings?.title ?? 'Milkweed Mutual Aid',
  description: settings?.meta_description ?? settings?.description,
  ogImage: settings?.og_image ?? settings?.cover_image,
})

onServerPrefetch(async () => {
  if (typeof window !== 'undefined') return
  try {
    appState.posts[lang.value] = await browseServerPosts(lang.value)
    appState.events = getEvents()
    appState.tags = getTags()
  } catch (error) {
    console.error('[BlogList] Server prefetch failed', error)
    appState.posts[lang.value] = []
    errorMessage.value = t('blog.fetchError')
  }
})

onMounted(() => {
  if (import.meta.env.DEV) fetchPosts(lang.value)
})

if (import.meta.env.DEV) {
  watch(lang, (next, prev) => {
    if (next !== prev) fetchPosts(next)
  }, { flush: 'post' })
}
</script>

<template>
  <section class="space-y-8">
    <!-- Newsletter signup -->
    <div class="flex flex-wrap items-center gap-3 rounded-xl border-3 border-accent bg-accent/10 px-4 py-2 md:flex-nowrap md:gap-4">
      <div class="flex-1">
        <h2 class="text-base font-extrabold">{{ t('newsletter.heading') }}</h2>
        <p class="text-sm text-base-content/60">{{ t('newsletter.description') }}</p>
      </div>
      <form v-if="signupStatus !== 'success'" class="flex w-full gap-2 md:w-auto" @submit.prevent="handleSignup">
        <input
          v-model="signupEmail"
          type="email"
          required
          :placeholder="t('newsletter.placeholder')"
          class="min-w-0 flex-1 rounded-lg border-2 border-accent px-3 py-2 text-sm font-bold outline-none focus:border-primary md:w-72"
        />
        <button
          type="submit"
          :disabled="signupStatus === 'loading'"
          class="rounded-lg bg-accent px-4 py-2 text-sm font-extrabold uppercase tracking-widest text-accent-content shadow-[3px_3px_0_0] shadow-accent/30 transition-all hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0] disabled:opacity-50"
        >
          {{ signupStatus === 'loading' ? '...' : t('newsletter.button') }}
        </button>
      </form>
      <p v-else class="text-sm font-bold text-success">{{ t('newsletter.success') }}</p>
      <p v-if="signupStatus === 'error'" class="w-full text-sm font-bold text-error">{{ signupError }}</p>
    </div>

    <!-- Hero: Events + Latest Post side by side -->
    <div class="grid overflow-hidden rounded-xl shadow-[6px_6px_0_0] shadow-primary/30 md:grid-cols-2">
      <!-- Events (left) -->
      <div class="bg-primary p-5 text-primary-content md:p-6">
        <h2 class="text-lg font-extrabold uppercase tracking-widest">
          {{ t('events.heading') }}
        </h2>
        <ul v-if="appState.events.length" class="mt-3 divide-y divide-primary-content/20">
          <li v-for="event in appState.events" :key="event.id">
            <a
              :href="event.url"
              target="_blank"
              rel="noopener noreferrer"
              class="block rounded px-3 py-2.5 transition-colors hover:bg-primary-content/10"
            >
              <span class="block text-xs font-bold uppercase tracking-wider text-accent">{{ formatEventDate(event.start, event.end, event.allDay) }}</span>
              <span class="mt-0.5 block text-sm font-extrabold text-primary-content">{{ event.title }}</span>
              <span v-if="event.location" class="mt-0.5 block text-xs text-primary-content/50">{{ event.location }}</span>
            </a>
          </li>
        </ul>
        <p v-else class="mt-3 text-sm text-primary-content/60">{{ t('events.noEvents') }}</p>
      </div>

      <!-- Latest post (right) -->
      <RouterLink
        v-if="featuredPost"
        :to="`/${lang}/blog/${featuredPost.slug}`"
        class="group flex flex-col bg-secondary p-5 text-secondary-content transition-colors hover:bg-secondary/90 md:p-6"
      >
        <h2 class="text-lg font-extrabold uppercase tracking-widest text-secondary-content">{{ t('blog.badge') }}</h2>
        <div v-if="featuredPost.feature_image" class="mt-3 overflow-hidden rounded-lg">
          <img
            :src="featuredPost.feature_image"
            :srcset="ghostSrcset(featuredPost.feature_image)"
            :sizes="ghostSizes('full')"
            :alt="featuredPost.feature_image_alt ?? featuredPost.title"
            loading="eager"
            class="w-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </div>
        <h2 class="mt-3 text-xl font-extrabold leading-tight tracking-tight md:text-2xl">
          {{ featuredPost.title }}
        </h2>
        <p class="mt-2 line-clamp-3 text-sm text-secondary-content/80">
          {{ featuredPost.custom_excerpt ?? featuredPost.excerpt }}
        </p>
        <div class="mt-auto flex items-center gap-2 pt-3">
          <div v-if="featuredPost.authors?.length" class="flex -space-x-1.5">
            <img
              v-for="author in featuredPost.authors"
              :key="author.slug ?? author.name ?? ''"
              v-show="author.profile_image"
              :src="author.profile_image ?? ''"
              :alt="author.name ?? ''"
              class="h-6 w-6 rounded-full object-cover ring-2 ring-secondary"
            />
          </div>
          <span class="text-xs font-bold text-secondary-content/60">
            {{ formatDate(featuredPost.published_at) }}
          </span>
        </div>
      </RouterLink>
    </div>

    <!-- Tag filter -->
    <div v-if="tags.length" class="flex flex-wrap gap-2">
      <button
        class="rounded-lg border-3 px-3 py-1.5 text-xs font-extrabold uppercase tracking-widest transition-all hover:-translate-y-0.5"
        :class="selectedTag === null
          ? 'border-primary bg-primary text-primary-content shadow-[3px_3px_0_0] shadow-primary/30'
          : 'border-base-300 hover:border-primary'"
        @click="selectTag(null)"
      >
        {{ t('blog.allPosts') }}
      </button>
      <button
        v-for="tag in tags"
        :key="tag.slug ?? tag.name ?? ''"
        class="rounded-lg border-3 px-3 py-1.5 text-xs font-extrabold uppercase tracking-widest transition-all hover:-translate-y-0.5"
        :class="selectedTag === tag.slug
          ? 'border-secondary bg-secondary text-secondary-content shadow-[3px_3px_0_0] shadow-secondary/30'
          : 'border-base-300 hover:border-secondary'"
        @click="selectTag(tag.slug)"
      >
        {{ tag.name }}
      </button>
    </div>

    <!-- Alerts -->
    <div v-if="errorMessage" class="rounded-lg border-3 border-warning bg-warning/10 p-4 font-bold">
      {{ errorMessage }}
    </div>
    <div v-else-if="warningMessage" class="rounded-lg border-3 border-accent bg-accent/10 p-4 font-bold">
      {{ warningMessage }}
    </div>

    <!-- Grid -->
    <div v-if="restPosts.length" class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <RouterLink
        v-for="post in restPosts"
        :key="post.id"
        :to="`/${lang}/blog/${post.slug}`"
        class="group flex flex-col overflow-hidden rounded-xl border-3 border-base-300 bg-base-200 shadow-[4px_4px_0_0] shadow-base-300/50 transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0_0] hover:shadow-primary/30"
      >
        <div v-if="post.feature_image" class="overflow-hidden">
          <img
            :src="post.feature_image"
            :srcset="ghostSrcset(post.feature_image)"
            :sizes="ghostSizes('card')"
            :alt="post.feature_image_alt ?? post.title"
            loading="lazy"
            class="w-full object-contain transition-transform duration-300 group-hover:scale-105"
          />
        </div>
        <div class="flex flex-1 flex-col gap-2 p-4">
          <div class="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-base-content/50">
            <span v-if="post.featured" class="rounded bg-secondary px-1.5 py-0.5 text-secondary-content">{{ t('blog.featuredBadge') }}</span>
            <span v-if="formatDate(post.published_at)">{{ formatDate(post.published_at) }}</span>
          </div>
          <h3 class="text-lg font-extrabold leading-snug tracking-tight transition-colors group-hover:text-primary">
            {{ post.title }}
          </h3>
          <p class="line-clamp-2 text-sm text-base-content/60">
            {{ post.custom_excerpt ?? post.excerpt }}
          </p>
          <div v-if="post.authors?.length" class="mt-auto flex items-center gap-2 pt-2">
            <div class="flex -space-x-1.5">
              <img
                v-for="author in post.authors"
                :key="author.slug ?? author.name ?? ''"
                v-show="author.profile_image"
                :src="author.profile_image ?? ''"
                :alt="author.name ?? ''"
                class="h-5 w-5 rounded-full object-cover ring-2 ring-base-200"
              />
            </div>
            <span class="text-xs font-bold text-base-content/50">
              {{ post.authors.map(a => a.name).filter(Boolean).join(', ') }}
            </span>
          </div>
        </div>
      </RouterLink>
    </div>

    <div v-else-if="!featuredPost && !errorMessage" class="rounded-xl border-3 border-base-300 p-12 text-center font-bold text-base-content/50">
      {{ t('blog.noPosts') }}
    </div>

    <div v-if="hasMore" class="flex justify-center pt-4">
      <button
        class="rounded-lg border-3 border-primary bg-primary px-8 py-3 font-extrabold uppercase tracking-widest text-primary-content shadow-[4px_4px_0_0] shadow-primary/30 transition-all hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0] hover:shadow-primary/30"
        @click="loadMore"
      >
        {{ t('blog.loadMore') }}
      </button>
    </div>
  </section>
</template>
