import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'
import { URL } from 'node:url'
import { defineConfig, type PluginOption } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { getGhostServer } from './src/ghost.server'
import { splitPostsByLang } from './src/utils/posts'
import type { GhostPostSummary, GhostPostDetail } from './src/types/ghost'

const SUMMARY_FIELDS = 'id,title,slug,excerpt,custom_excerpt,feature_image,feature_image_alt,published_at,reading_time,featured,og_image,meta_title,meta_description'
const DETAIL_FIELDS = 'id,title,slug,html,excerpt,custom_excerpt,feature_image,feature_image_alt,feature_image_caption,published_at,reading_time,canonical_url,og_image,og_title,og_description,twitter_image,twitter_title,twitter_description,meta_title,meta_description'

type WarningCode = 'missing-tag'

const mode = process.env.NODE_ENV
const envFiles = ['.env', mode ? `.env.${mode}` : undefined].filter(Boolean) as string[]

for (const file of envFiles) {
  loadEnv({ path: resolve(file), override: true })
}

function extractGhostError(error: unknown) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as any).response
    const status = response?.status
    const message = response?.data?.errors?.[0]?.message ?? response?.statusText
    return { status, message }
  }
  if (error instanceof Error) {
    return { status: undefined, message: error.message }
  }
  return { status: undefined, message: String(error) }
}

async function fetchPostsByLang(lang: string) {
  const ghostServer = getGhostServer()
  const allPosts = await ghostServer.posts.browse<GhostPostSummary>({
    include: 'tags,authors',
    limit: 'all',
    fields: SUMMARY_FIELDS
  })

  const langPosts = splitPostsByLang(allPosts, lang)

  let posts = langPosts
  let warningCode: WarningCode | null = null

  if (!posts.length) {
    warningCode = 'missing-tag'
    posts = allPosts
  }

  return { posts, warningCode }
}

async function fetchPostBySlug(lang: string, slug: string) {
  const ghostServer = getGhostServer()
  const result = await ghostServer.posts.browse<GhostPostDetail>({
    filter: `slug:${slug}`,
    include: 'tags,authors',
    limit: 1,
    fields: DETAIL_FIELDS,
    formats: 'html,plaintext'
  })

  const post = result[0] ?? null

  if (!post) {
    return { post: null, warningCode: null }
  }

  const taggedLang = post.tags?.some((tag) => tag?.slug === lang) ?? false
  const taggedOther = post.tags?.some((tag) => tag?.slug === (lang === 'en' ? 'es' : 'en')) ?? false

  let warningCode: WarningCode | null = null
  let effectivePost: GhostPostDetail | null = post

  if (lang === 'en' && !taggedLang && !taggedOther) {
    warningCode = 'missing-tag'
  } else if (!taggedLang) {
    warningCode = 'missing-tag'
    effectivePost = null
  }

  return { post: effectivePost, warningCode }
}

function ghostDevApi(): PluginOption {
  return {
    name: 'ghost-dev-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__ghost/posts', async (req, res) => {
        if (req.method !== 'GET') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        try {
          const requestUrl = new URL(req.originalUrl ?? req.url ?? '', 'http://localhost')
          const lang = (requestUrl.searchParams.get('lang') ?? 'en') as 'en' | 'es'
          const slug = requestUrl.searchParams.get('slug') ?? undefined

          if (slug) {
            const { post, warningCode } = await fetchPostBySlug(lang, slug)

            let counterpart: unknown = null
            if (post && Array.isArray(post.tags)) {
              const keyTag = post.tags.find((tag) => typeof tag?.name === 'string' && tag.name.startsWith('#xkey-'))?.name
              if (keyTag) {
                const otherLang = lang === 'en' ? 'es' : 'en'
                const ghostServer = getGhostServer()
                const sibling = await ghostServer.posts.browse<GhostPostSummary>({
                  filter: `tag:${otherLang}+tag:${keyTag.replace('#', '')}`,
                  include: 'tags,authors',
                  limit: 1,
                  fields: 'id,title,slug,reading_time'
                })
                counterpart = sibling[0] ?? null
              }
            }

            res.setHeader('Content-Type', 'application/json')
            res.end(
              JSON.stringify({
                post,
                counterpart,
                warningCode,
                warningLang: warningCode ? lang : undefined
              })
            )
            return
          }

          const { posts, warningCode } = await fetchPostsByLang(lang)

          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              posts,
              warningCode,
              warningLang: warningCode ? lang : undefined
            })
          )
        } catch (error) {
          const { status, message } = extractGhostError(error)
          console.error('[ghost-dev-api] Failed to load posts', status, message)
          res.statusCode = typeof status === 'number' ? status : 500
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              error: message ?? 'Failed to load posts from Ghost. Check your .env configuration.'
            })
          )
        }
      })
    }
  }
}

export default defineConfig({
  plugins: [vue(), tailwindcss(), ghostDevApi()],
  build: {
    target: 'esnext',
    rollupOptions: {
      external: ['node:crypto', 'node:fs', 'node:path', 'node:http', 'node:https', 'node:url', 'node:zlib', 'node:stream', 'node:buffer']
    }
  },
  ssr: {
    noExternal: ['@tryghost/content-api', '@vitalets/google-translate-api']
  }
})
