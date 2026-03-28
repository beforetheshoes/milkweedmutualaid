import { ViteSSG } from 'vite-ssg'
import App from './App.vue'
import { routes } from './router'
import { i18n, supportedLocales, type LocaleCode } from './i18n'
import { appState } from './state'
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
  ({ app, router, initialState }) => {
    app.use(i18n)

    if (import.meta.env.SSR) {
      initialState.appState = appState
    } else {
      if (initialState.appState) {
        Object.assign(appState, initialState.appState)
      }
    }

    let isFirstLoad = true

    router.beforeEach((to, from, next) => {
      const lang = resolveLang(to.params.lang)
      i18n.global.locale.value = lang

      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('lang', lang)

        if (isFirstLoad) {
          isFirstLoad = false
        } else if (to.path !== from.path) {
          window.location.href = to.fullPath
          return
        }
      }

      next()
    })
  }
)

export { includedRoutes } from './ssg-routes'
