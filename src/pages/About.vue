<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useSeo } from '../composables/useSeo'

const { t } = useI18n()

useSeo({
  title: 'About — Milkweed Mutual Aid',
  description: 'We create space and organize events in furtherance of our guiding principles.',
  ogImage: '/milkweedlogo.png'
})
</script>

<template>
  <section class="space-y-10">
    <div class="flex flex-col items-center gap-6 text-center">
      <img
        src="/milkweedlogo-md.png"
        alt="Milkweed Mutual Aid Collective logo"
        class="h-40 w-40 rounded-full object-cover shadow-lg"
      />
      <h1 class="text-4xl font-black tracking-tight text-base-content md:text-5xl">
        {{ t('about.heading') }}
      </h1>
    </div>

    <p class="mx-auto max-w-2xl text-center text-lg text-base-content/80">
      {{ t('about.intro') }}
    </p>

    <div class="mx-auto max-w-2xl">
      <h2 class="mb-6 text-2xl font-bold text-base-content">
        {{ t('about.principlesHeading') }}
      </h2>
      <ul class="space-y-4">
        <li
          v-for="(principle, index) in [
            t('about.principle1'),
            t('about.principle2'),
            t('about.principle3'),
            t('about.principle4')
          ]"
          :key="index"
          class="flex gap-3 rounded-2xl border border-base-200/70 bg-gradient-to-br from-primary/8 to-secondary/8 p-5 text-base text-base-content/85"
        >
          <span class="mt-0.5 text-primary" aria-hidden="true">&#10022;</span>
          <span>{{ principle }}</span>
        </li>
      </ul>
    </div>

    <div class="flex flex-wrap justify-center gap-4 pt-4">
      <a
        href="https://forms.milkweedmutualaid.org/form/e8IzlkOA"
        target="_blank"
        rel="noopener noreferrer"
        class="btn btn-primary"
      >
        {{ t('nav.interestForm') }}
      </a>
      <a
        href="https://hcb.hackclub.com/donations/start/milkweed-mutual-aid"
        target="_blank"
        rel="noopener noreferrer"
        class="btn btn-secondary"
      >
        {{ t('nav.contribute') }}
      </a>
    </div>
  </section>
</template>
