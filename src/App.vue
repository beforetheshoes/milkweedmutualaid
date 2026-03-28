<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useLang } from './composables/useLang'

const route = useRoute()
const { t } = useI18n()
const lang = useLang()

const languageOptions = computed(() => [
  { label: t('nav.english'), value: 'en' },
  { label: t('nav.spanish'), value: 'es' }
])

function langSwitchPath(targetLang: string) {
  const currentPath = route.path
  const match = currentPath.match(/^\/(en|es)\/(.+)/)
  if (match) {
    return `/${targetLang}/${match[2]}`
  }
  return `/${targetLang}/blog`
}
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <header class="sticky top-0 z-20 border-b border-base-200/60 bg-base-100/85 backdrop-blur-lg">
      <div class="container mx-auto flex flex-wrap items-center justify-between gap-4 px-4 py-3 md:px-10 md:py-4">
        <RouterLink
          class="group inline-flex items-center gap-3 text-lg font-semibold tracking-tight text-primary transition-transform duration-200 hover:-translate-y-0.5 md:text-xl"
          :to="`/${lang}/blog`"
        >
          <img
            src="/milkweedlogo-sm.png"
            alt="Milkweed Mutual Aid Collective logo"
            class="h-10 w-10 rounded-full object-cover shadow-sm"
          />
          <span class="leading-tight">
            {{ t('nav.brand') }}
          </span>
        </RouterLink>

        <nav aria-label="Main navigation" class="flex flex-wrap items-center gap-4 text-sm">
          <RouterLink
            :to="`/${lang}/blog`"
            class="font-medium text-base-content/70 transition-colors hover:text-primary"
          >
            {{ t('nav.blog') }}
          </RouterLink>
          <RouterLink
            :to="`/${lang}/about`"
            class="font-medium text-base-content/70 transition-colors hover:text-primary"
          >
            {{ t('nav.about') }}
          </RouterLink>
          <a
            href="https://forms.milkweedmutualaid.org/form/e8IzlkOA"
            target="_blank"
            rel="noopener noreferrer"
            class="font-medium text-base-content/70 transition-colors hover:text-primary"
          >
            {{ t('nav.interestForm') }}
          </a>
          <a
            href="https://hcb.hackclub.com/donations/start/milkweed-mutual-aid"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-primary btn-sm"
          >
            {{ t('nav.contribute') }}
          </a>

          <div class="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-base-100/80 p-1 shadow-sm backdrop-blur" role="group" aria-label="Language selection">
            <RouterLink
              v-for="option in languageOptions"
              :key="option.value"
              :to="langSwitchPath(option.value)"
              :aria-current="option.value === lang ? 'true' : undefined"
              class="rounded-full px-3 py-1 text-sm font-semibold transition-colors duration-200"
              :class="option.value === lang ? 'bg-primary text-primary-content shadow-sm' : 'text-base-content/70 hover:text-primary'"
            >
              {{ option.label }}
            </RouterLink>
          </div>
        </nav>
      </div>
    </header>

    <main class="container mx-auto flex-1 px-4 py-10 md:px-10 md:py-16">
      <section class="rounded-[2.5rem] border border-base-200/70 bg-base-100/92 p-6 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.25)] backdrop-blur md:p-10">
        <RouterView />
      </section>
    </main>

    <footer class="border-t border-base-200/70 bg-base-100/85 backdrop-blur">
      <div class="container mx-auto flex flex-col gap-2 px-4 py-6 text-sm text-base-content/60 md:flex-row md:items-center md:justify-between md:px-10">
        <span>© {{ new Date().getFullYear() }} Milkweed Mutual Aid</span>
        <span class="flex items-center gap-2">
          <span class="h-1 w-1 rounded-full bg-base-content/30" aria-hidden="true"></span>
          <span>Built with Ghost & Vue SSG</span>
        </span>
      </div>
    </footer>
  </div>
</template>
