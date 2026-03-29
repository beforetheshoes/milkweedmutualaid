<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSeo } from '../composables/useSeo'

const { t } = useI18n()

useSeo({
  title: 'Interest Form — Milkweed Mutual Aid',
  description: 'Sign up to get involved with Milkweed Mutual Aid Collective.'
})

onMounted(() => {
  if (document.querySelector('script[src*="heyform"]')) return
  const script = document.createElement('script')
  script.src = 'https://www.unpkg.com/@heyform-inc/embed@latest/dist/index.umd.js'
  script.async = true
  document.body.appendChild(script)
})
</script>

<template>
  <section class="space-y-6">
    <div class="rounded-xl bg-primary p-6 text-primary-content md:p-8">
      <h1 class="text-2xl font-extrabold tracking-tight md:text-3xl">{{ t('nav.interestForm') }}</h1>
      <p class="mt-2 text-sm text-primary-content/70">Want to get involved? Let us know how you'd like to help.</p>
    </div>
    <div class="overflow-hidden rounded-xl border-3 border-base-300 shadow-[4px_4px_0_0] shadow-base-300/50">
      <div
        data-heyform-id="e8IzlkOA"
        data-heyform-type="standard"
        data-heyform-custom-url="https://forms.milkweedmutualaid.org/form/"
        data-heyform-width-type="%"
        data-heyform-width="100"
        data-heyform-height-type="px"
        data-heyform-height="500"
        data-heyform-auto-resize-height="true"
      />
    </div>
  </section>
</template>
