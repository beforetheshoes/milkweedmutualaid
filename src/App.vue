<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useLang } from './composables/useLang'

const route = useRoute()
const { t } = useI18n()
const lang = useLang()
const mobileNavOpen = ref(false)
const dark = ref(false)
const highContrast = ref(false)
const fontSize = ref(1)
const reducedMotion = ref(false)

onMounted(() => {
  dark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
  reducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  applyAll()
})

function toggleTheme() {
  dark.value = !dark.value
  applyAll()
}

function toggleHighContrast() {
  highContrast.value = !highContrast.value
  applyAll()
}

function setFontSize(level: number) {
  fontSize.value = level
  applyAll()
}

function toggleReducedMotion() {
  reducedMotion.value = !reducedMotion.value
  applyAll()
}

function applyAll() {
  const html = document.documentElement
  html.setAttribute('data-theme', dark.value ? 'dark' : 'light')
  html.classList.toggle('high-contrast', highContrast.value)
  html.classList.toggle('reduced-motion', reducedMotion.value)
  html.style.fontSize = ['14px', '16px', '19px', '22px'][fontSize.value]
}

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
  <div class="flex min-h-screen flex-col bg-base-100 text-base-content">
    <header class="sticky top-0 z-20 bg-base-100">
      <!-- Main nav -->
      <div class="border-b-3 border-primary">
        <div class="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-3">
          <RouterLink
            class="flex items-center gap-2.5 transition-transform hover:scale-105"
            :to="`/${lang}/blog`"
          >
            <img
              src="/milkweedlogo-sm.png"
              alt="Milkweed Mutual Aid Collective"
              class="h-10 w-10 rounded-full ring-2 ring-primary"
            />
            <span class="text-xl font-extrabold tracking-tight text-primary">{{ t('nav.brand') }}</span>
          </RouterLink>

          <nav class="hidden items-center gap-1 text-sm font-bold md:flex">
            <RouterLink
              :to="`/${lang}/blog`"
              class="rounded-lg px-3 py-1.5 transition-colors hover:bg-primary hover:text-primary-content"
            >
              {{ t('nav.blog') }}
            </RouterLink>
            <RouterLink
              :to="`/${lang}/about`"
              class="rounded-lg px-3 py-1.5 transition-colors hover:bg-primary hover:text-primary-content"
            >
              {{ t('nav.about') }}
            </RouterLink>
            <a
              href="https://forms.milkweedmutualaid.org/form/e8IzlkOA"
              target="_blank"
              rel="noopener noreferrer"
              class="rounded-lg px-3 py-1.5 transition-colors hover:bg-primary hover:text-primary-content"
            >
              {{ t('nav.interestForm') }}
            </a>
            <a
              href="https://hcb.hackclub.com/donations/start/milkweed-mutual-aid"
              target="_blank"
              rel="noopener noreferrer"
              class="ml-1 rounded-lg bg-secondary px-4 py-1.5 font-extrabold text-secondary-content shadow-[4px_4px_0_0] shadow-secondary/40 transition-all hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0] hover:shadow-secondary/40"
            >
              {{ t('nav.contribute') }}
            </a>
          </nav>

          <!-- Mobile hamburger -->
          <button class="rounded-lg p-2 text-xl transition-colors hover:bg-base-200 md:hidden" @click="mobileNavOpen = !mobileNavOpen" aria-label="Menu">
            {{ mobileNavOpen ? '✕' : '☰' }}
          </button>
        </div>

        <!-- Mobile nav -->
        <div v-if="mobileNavOpen" class="border-t border-base-300 px-5 py-3 md:hidden">
          <nav class="flex flex-col gap-1 text-sm font-bold">
            <RouterLink :to="`/${lang}/blog`" class="rounded-lg px-3 py-2 hover:bg-primary hover:text-primary-content" @click="mobileNavOpen = false">{{ t('nav.blog') }}</RouterLink>
            <RouterLink :to="`/${lang}/about`" class="rounded-lg px-3 py-2 hover:bg-primary hover:text-primary-content" @click="mobileNavOpen = false">{{ t('nav.about') }}</RouterLink>
            <a href="https://forms.milkweedmutualaid.org/form/e8IzlkOA" target="_blank" rel="noopener noreferrer" class="rounded-lg px-3 py-2 hover:bg-primary hover:text-primary-content">{{ t('nav.interestForm') }}</a>
            <a href="https://hcb.hackclub.com/donations/start/milkweed-mutual-aid" target="_blank" rel="noopener noreferrer" class="rounded-lg bg-secondary px-3 py-2 text-center font-extrabold text-secondary-content">{{ t('nav.contribute') }}</a>
          </nav>
        </div>
      </div>

      <!-- Accessibility & settings bar -->
      <div class="border-b border-base-300 bg-base-200/60">
        <div class="mx-auto flex max-w-5xl items-center justify-between gap-4 overflow-x-auto px-5 py-1.5 text-xs scrollbar-none">
          <div class="flex shrink-0 items-center gap-4">
            <!-- Dark / Light -->
            <button
              class="flex items-center gap-1.5 font-bold transition-colors hover:text-primary"
              @click="toggleTheme"
            >
              <span>{{ dark ? '☀️' : '🌙' }}</span>
              <span>{{ dark ? t('a11y.lightMode') : t('a11y.darkMode') }}</span>
            </button>

            <!-- Font size -->
            <div class="flex items-center gap-1.5">
              <span class="font-bold text-base-content/60">{{ t('a11y.fontSize') }}</span>
              <div class="flex overflow-hidden rounded border border-base-300">
                <button
                  v-for="level in [0, 1, 2, 3]"
                  :key="level"
                  class="px-1.5 py-0.5 font-bold leading-none transition-colors"
                  :class="[
                    fontSize === level ? 'bg-primary text-primary-content' : 'hover:bg-base-300',
                    level === 0 ? 'text-[10px]' : level === 1 ? 'text-xs' : level === 2 ? 'text-sm' : 'text-base'
                  ]"
                  :aria-label="`Font size ${['small', 'default', 'large', 'extra large'][level]}`"
                  @click="setFontSize(level)"
                >
                  A
                </button>
              </div>
            </div>

            <!-- High contrast -->
            <label class="flex cursor-pointer items-center gap-1.5 font-bold transition-colors hover:text-primary">
              <input
                type="checkbox"
                class="checkbox checkbox-xs checkbox-primary"
                :checked="highContrast"
                @change="toggleHighContrast"
              />
              {{ t('a11y.highContrast') }}
            </label>

            <!-- Reduced motion -->
            <label class="flex cursor-pointer items-center gap-1.5 font-bold transition-colors hover:text-primary">
              <input
                type="checkbox"
                class="checkbox checkbox-xs checkbox-primary"
                :checked="reducedMotion"
                @change="toggleReducedMotion"
              />
              {{ t('a11y.reducedMotion') }}
            </label>
          </div>

          <!-- Language toggle -->
          <div class="flex items-center gap-2">
            <span class="font-bold text-base-content/60">{{ t('nav.language') }}:</span>
            <div class="flex overflow-hidden rounded border border-primary" role="group" aria-label="Language selection">
              <RouterLink
                v-for="option in languageOptions"
                :key="option.value"
                :to="langSwitchPath(option.value)"
                :aria-current="option.value === lang ? 'true' : undefined"
                class="px-2 py-0.5 font-extrabold uppercase tracking-widest transition-colors"
                :class="option.value === lang ? 'bg-primary text-primary-content' : 'hover:bg-base-300'"
              >
                {{ option.label }}
              </RouterLink>
            </div>
          </div>
        </div>
      </div>
    </header>

    <main class="mx-auto w-full max-w-5xl flex-1 px-5 py-8">
      <RouterView />
    </main>

    <footer class="border-t-3 border-secondary bg-base-200">
      <div class="mx-auto flex max-w-5xl flex-col gap-1 px-5 py-6 text-sm md:flex-row md:items-center md:justify-between">
        <span class="font-bold">© {{ new Date().getFullYear() }} Milkweed Mutual Aid Collective</span>
        <span class="text-base-content/60">Hillsborough, NC</span>
      </div>
    </footer>
  </div>
</template>
