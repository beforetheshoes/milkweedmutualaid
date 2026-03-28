import { ViteSSG } from 'vite-ssg'
import App from './App.vue'
import { routes } from './router'
import { i18n, supportedLocales, type LocaleCode } from './i18n'
import './assets/tailwind.css'

const supportedLanguages = new Set<LocaleCode>(supportedLocales)

function resolveLang(param: unknown): LocaleCode {
  const candidate = Array.isArray(param) ? param[0] : param
  if (typeof candidate === 'string' && supportedLanguages.has(candidate as LocaleCode)) {
    return candidate as LocaleCode
  }
  return 'en'
}

export const createApp = ViteSSG(
  App,
  {
    routes,
    base: import.meta.env.BASE_URL
  },
  ({ app, router }) => {
    app.use(i18n)

    router.beforeResolve((to, _from, next) => {
      const lang = resolveLang(to.params.lang)
      i18n.global.locale.value = lang

      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('lang', lang)
      }

      next()
    })
  }
)

export { includedRoutes } from './ssg-routes'
