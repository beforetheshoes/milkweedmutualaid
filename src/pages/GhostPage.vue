<script setup lang="ts">
import { onServerPrefetch, ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getGhostServer } from '../ghost.server'
import { useSeo } from '../composables/useSeo'
import type { GhostPage } from '../types/ghost'

const route = useRoute()
const { t } = useI18n()
const page = ref<GhostPage | null>(null)
const errorMessage = ref<string | null>(null)

useSeo({
  title: computed(() => page.value?.meta_title ?? page.value?.title),
  description: computed(() => page.value?.meta_description ?? page.value?.custom_excerpt ?? page.value?.excerpt),
  ogImage: computed(() => page.value?.og_image ?? page.value?.feature_image),
  ogTitle: computed(() => page.value?.og_title ?? page.value?.title),
  ogDescription: computed(() => page.value?.og_description ?? page.value?.custom_excerpt ?? page.value?.excerpt),
  twitterImage: computed(() => page.value?.twitter_image ?? page.value?.feature_image),
  twitterTitle: computed(() => page.value?.twitter_title ?? page.value?.title),
  twitterDescription: computed(() => page.value?.twitter_description ?? page.value?.custom_excerpt ?? page.value?.excerpt),
  canonicalUrl: computed(() => page.value?.canonical_url)
})

const slug = computed(() => {
  const value = route.params.slug
  return Array.isArray(value) ? value[0] ?? '' : value ?? ''
})

onServerPrefetch(async () => {
  if (typeof window !== 'undefined' || !slug.value) return

  try {
    const ghostServer = getGhostServer()
    const result = await ghostServer.pages.read<GhostPage>(
      { slug: slug.value },
      {
        formats: 'html',
        fields: 'id,title,slug,html,feature_image,feature_image_alt,feature_image_caption,custom_excerpt,excerpt,meta_title,meta_description,og_image,og_title,og_description,twitter_image,twitter_title,twitter_description,canonical_url'
      }
    )
    page.value = result
  } catch (error) {
    console.error('[GhostPage] Failed to fetch page', error)
    errorMessage.value = t('page.notFound')
  }
})
</script>

<template>
  <section class="space-y-10">
    <div v-if="errorMessage" class="alert alert-warning">
      <span>{{ errorMessage }}</span>
    </div>

    <article v-else-if="page" class="space-y-10">
      <h1 class="text-4xl font-black tracking-tight text-base-content md:text-5xl">
        {{ page.title }}
      </h1>

      <figure v-if="page.feature_image" class="mx-auto max-w-4xl overflow-hidden rounded-[1.75rem] shadow-2xl">
        <img :src="page.feature_image" :alt="page.feature_image_alt ?? page.title" class="h-full w-full max-h-[420px] object-cover" />
        <figcaption
          v-if="page.feature_image_caption"
          class="px-4 py-3 text-center text-sm text-base-content/60"
          v-html="page.feature_image_caption"
        />
      </figure>

      <div
        v-if="page.html"
        class="prose prose-lg mx-auto max-w-3xl text-base-content prose-headings:font-semibold prose-headings:text-base-content prose-a:text-primary prose-blockquote:border-primary/40 prose-blockquote:text-base-content/80"
      >
        <div v-html="page.html"></div>
      </div>
    </article>

    <div v-else class="alert alert-warning">
      <span>{{ t('page.notFound') }}</span>
    </div>
  </section>
</template>
