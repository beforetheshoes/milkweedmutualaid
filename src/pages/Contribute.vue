<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useSeo } from '../composables/useSeo'

const { t } = useI18n()

useSeo({
  title: 'Contribute — Milkweed Mutual Aid',
  description: 'Support Milkweed Mutual Aid Collective with a contribution.'
})
</script>

<template>
  <section class="space-y-6">
    <div class="rounded-xl bg-secondary p-6 md:p-8">
      <h1 class="text-2xl font-extrabold tracking-tight text-secondary-content md:text-3xl">{{ t('nav.contribute') }}</h1>
      <p class="mt-2 text-sm text-secondary-content/70">Every contribution supports mutual aid in Hillsborough.</p>
    </div>
    <div class="overflow-hidden rounded-xl border-3 border-base-300 shadow-[4px_4px_0_0] shadow-base-300/50">
      <iframe
        src="https://hcb.hackclub.com/donations/start/milkweed-mutual-aid"
        title="Contribute to Milkweed Mutual Aid"
        class="h-[650px] w-full"
        scrolling="yes"
        frameborder="0"
        allowfullscreen
      />
    </div>
    <p class="mx-auto max-w-2xl text-center text-sm text-base-content/60">
      Milkweed Mutual Aid is fiscally sponsored by
      <a href="https://hackclub.com" target="_blank" rel="noopener noreferrer" class="font-bold hover:text-primary">Hack Club</a>,
      a 501(c)(3) nonprofit.
      <br />
      Our registered EIN is <span class="whitespace-nowrap">81-2908499</span>.
      <br />
      Questions? Get in touch at
      <a href="mailto:hcb@hackclub.com" class="font-bold hover:text-primary">hcb&#64;hackclub.com</a>.
    </p>
  </section>
</template>
