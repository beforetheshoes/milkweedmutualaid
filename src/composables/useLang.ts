import { computed } from 'vue'
import { useRoute } from 'vue-router'

export function useLang() {
  const route = useRoute()

  const lang = computed(() => {
    const value = route.params.lang
    if (Array.isArray(value)) {
      return value[0] ?? 'en'
    }
    return value ?? 'en'
  })

  return lang
}
