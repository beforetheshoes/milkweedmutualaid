<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useSeo } from '../composables/useSeo'
import { useLang } from '../composables/useLang'

const { t } = useI18n()
const lang = useLang()

useSeo({
  title: 'About — Milkweed Mutual Aid',
  description: 'We create space and organize events in furtherance of our guiding principles.'
})
</script>

<template>
  <section class="space-y-8">
    <div class="flex items-center gap-5">
      <img
        src="/milkweedlogo-md.png"
        alt="Milkweed Mutual Aid Collective"
        class="h-20 w-20 rounded-full ring-2 ring-primary md:h-24 md:w-24"
      />
      <div>
        <h1 class="text-2xl font-extrabold tracking-tight md:text-4xl">
          {{ t('about.heading') }}
        </h1>
        <p class="mt-1 font-bold text-base-content/50">Hillsborough, NC</p>
      </div>
    </div>

    <!-- Guiding principles hero — recreating the image as accessible text -->
    <div class="overflow-hidden rounded-xl p-8 md:p-12" style="background: linear-gradient(to bottom right, #b0eacd, #a0d8ef 45%, #9fb8e8 70%, #b4a7d6)">
      <div class="grid items-start gap-8 md:grid-cols-[1fr_1.2fr]">
        <p class="font-heading text-3xl font-bold leading-[1.15] tracking-tight md:text-5xl" style="color: #4a19a0">
          {{ t('about.intro') }}
        </p>
        <ul class="space-y-5">
          <li
            v-for="(principle, index) in [
              t('about.principle1'),
              t('about.principle2'),
              t('about.principle3'),
              t('about.principle4')
            ]"
            :key="index"
            class="flex gap-3 font-heading text-base leading-relaxed md:text-lg"
            style="color: #4a19a0"
          >
            <span class="mt-1.5 shrink-0 text-xl leading-none" aria-hidden="true">&#x2022;</span>
            <span>{{ principle }}</span>
          </li>
        </ul>
      </div>
    </div>

    <div class="flex flex-wrap gap-3 pt-4">
      <RouterLink
        :to="`/${lang}/interest`"
        class="rounded-lg border-3 border-primary px-6 py-3 font-extrabold uppercase tracking-widest text-primary shadow-[4px_4px_0_0] shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary hover:text-primary-content hover:shadow-[6px_6px_0_0]"
      >
        {{ t('nav.interestForm') }}
      </RouterLink>
      <RouterLink
        :to="`/${lang}/contribute`"
        class="rounded-lg bg-secondary px-6 py-3 font-extrabold uppercase tracking-widest text-secondary-content shadow-[4px_4px_0_0] shadow-secondary/30 transition-all hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0]"
      >
        {{ t('nav.contribute') }}
      </RouterLink>
    </div>
  </section>
</template>
