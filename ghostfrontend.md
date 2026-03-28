# **Project Spec: Bilingual Static Frontend on top of Ghost**



## **1. Goals & Constraints**



- **Keep Ghost Admin** as the only place editors write, translate, publish, and send newsletters.
- **Public site** is a **Vue 3 + Vite + vite-plugin-SSG** app (no server to run). 
- **Strict Typescript** should be used, relying on the vue-tsc package
- **95%+ test coverage **with all tests passing
- **Bilingual** URLs & toggle: /en/... and /es/....
- **No auto-translate**. Each article has an English and Spanish post in Ghost.
- **Newsletter segmentation**: subscribers choose English or Spanish; emails only go to that segment.
- **Zero-cost infra**: host SPA on Netlify; Ghost stays on existing Ubuntu VM.
- **No client secrets**: SSG fetches content at build-time (no key in the browser). Optional serverless proxy if needed later.



------



## **2. Content Model in Ghost**



### **Language Tags (post-level)**

- Public tag en for English posts
- Public tag es for Spanish posts



### **Pairing Tag (post-level)**

- Internal tag #xkey-<id> shared by the two translations of the same article, e.g. #xkey-001.

  - Editors workflow: write EN → duplicate → translate to ES → keep same #xkey-*.

  

### **Member Labels (subscriber-level)**

- Label members with en or es to segment newsletters.



------



## **3. Editor Workflow (for Ryan’s team)**



1. Create/Edit post in Ghost Admin.

2. Tag en or es.

3. Add the shared internal tag (e.g., #xkey-001) to both language versions.

4. Use language-specific images/flyers per post.

5. Publish:

   - **Website** updates via webhook-triggered SPA rebuild.
   - **Email**: choose **Audience → Members with label: en** (or es) so only that segment receives it.

   

------



## **4. Frontend Stack**



### **Tech**

- Vue 3 + Vite
- vite-plugin-ssg (static pre-render)
- vue-tsc
- vue-router
- Tailwind CSS + DaisyUI (component library over Tailwind)
- @tryghost/content-api (used only during SSG build)
- vue-i18n for UI strings



### **Directory Skeleton**

```
milkweed-frontend/
  ├─ src/
  │  ├─ assets/tailwind.css
  │  ├─ pages/
  │  │  ├─ Home.vue
  │  │  ├─ BlogList.vue
  │  │  └─ BlogPost.vue
  │  ├─ router.ts
  │  ├─ ghost.server.ts      # server-only Ghost client for SSG
  │  ├─ ssg-routes.ts        # builds list of routes from Ghost
  │  └─ App.vue
  ├─ ssg.config.ts
  ├─ tailwind.config.cjs
  ├─ postcss.config.cjs
  ├─ index.html
  ├─ vite.config.ts
  └─ package.json
```



### **Commands**

```
pnpm create vite@latest milkweed-frontend -- --template vue
cd milkweed-frontend
pnpm add vue-router vite-plugin-ssg @tryghost/content-api
pnpm add -D tailwindcss postcss autoprefixer
pnpm add daisyui
npx tailwindcss init -p
```



### Tailwind / DaisyUI config (tailwind.config.cjs)

```
module.exports = {
  content: ["./index.html","./src/**/*.{vue,js,ts}"],
  theme: { extend: {} },
  plugins: [require('daisyui')],
  daisyui: { themes: ["light","dark"] }
}
```



### CSS (src/assets/tailwind.css)

```
@tailwind base;
@tailwind components;
@tailwind utilities;
```



### App bootstrap (src/main.ts)

```
import { ViteSSG } from 'vite-plugin-ssg'
import App from './App.vue'
import { router } from './router'
import './assets/tailwind.css'

export const createApp = ViteSSG(App, { routes: router.getRoutes() as any })
```



### Router (src/router.ts)

```
import { createRouter, createWebHistory } from 'vue-router'
import Home from './pages/Home.vue'
import BlogList from './pages/BlogList.vue'
import BlogPost from './pages/BlogPost.vue'

export const routes = [
  { path: '/', component: Home },
  { path: '/:lang(en|es)/blog', name: 'blog-list', component: BlogList },
  { path: '/:lang(en|es)/blog/:slug', name: 'blog-post', component: BlogPost },
  { path: '/:pathMatch(.*)*', redirect: '/en/blog' }
]
export const router = createRouter({ history: createWebHistory(), routes })
```



### Server-only Ghost client (src/ghost.server.ts)

```
import GhostContentAPI from '@tryghost/content-api'

export const ghostServer = new GhostContentAPI({
  url: process.env.GHOST_URL!,          // set in CI (Netlify)
  key: process.env.GHOST_CONTENT_KEY!,  // set in CI (Netlify)
  version: 'v5.0',
})
```



### SSG route generator (src/ssg-routes.ts)

```
import { ghostServer } from './ghost.server'

export async function includedRoutes() {
  const langs = ['en','es']
  const routes = ['/', '/en/blog', '/es/blog']
  for (const lang of langs) {
    const posts = await ghostServer.posts.browse({
      filter: `tag:${lang}`, limit: 'all', fields: ['slug']
    })
    posts.forEach(p => routes.push(`/${lang}/blog/${p.slug}`))
  }
  return routes
}
```



### SSG config (ssg.config.ts)

```
import type { SSGContext } from 'vite-plugin-ssg'
import { includedRoutes as getRoutes } from './src/ssg-routes'

export const includedRoutes = async (_paths: string[], _routes: SSGContext['routes']) => {
  return await getRoutes()
}
```



### Pages – List (src/pages/BlogList.vue)

```
<script setup lang="ts">
import { onServerPrefetch, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ghostServer } from '../ghost.server'

const route = useRoute()
const posts = ref<any[]>([])

onServerPrefetch(async () => {
  const lang = (route.params.lang as string) || 'en'
  posts.value = await ghostServer.posts.browse({
    filter: `tag:${lang}`,
    include: ['tags','authors'],
    limit: 24,
    fields: ['id','title','slug','excerpt','feature_image','published_at']
  })
})
</script>

<template>
  <section>
    <h1 class="text-3xl font-bold mb-6">
      {{ $route.params.lang === 'es' ? 'Publicaciones' : 'Posts' }}
    </h1>
    <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <article v-for="p in posts" :key="p.id" class="card bg-base-200 shadow">
        <figure v-if="p.feature_image"><img :src="p.feature_image" :alt="p.title" /></figure>
        <div class="card-body">
          <h2 class="card-title">{{ p.title }}</h2>
          <p class="line-clamp-3">{{ p.excerpt }}</p>
          <div class="card-actions justify-end">
            <router-link class="btn btn-primary" :to="`/${$route.params.lang}/blog/${p.slug}`">
              {{$route.params.lang === 'es' ? 'Leer' : 'Read'}}
            </router-link>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>
```



### Pages – Post (src/pages/BlogPost.vue)

```
<script setup lang="ts">
import { onServerPrefetch, ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { ghostServer } from '../ghost.server'

const route = useRoute()
const post = ref<any>(null)
const counterpart = ref<any>(null)

onServerPrefetch(async () => {
  const lang = route.params.lang as string
  const slug = route.params.slug as string
  const list = await ghostServer.posts.browse({
    filter: `slug:${slug}+tag:${lang}`, include: ['tags','authors']
  })
  post.value = list[0]

  const keyTag = post.value?.tags?.find((t:any) => t.name?.startsWith('#xkey-'))?.name
  const otherLang = lang === 'en' ? 'es' : 'en'
  if (keyTag) {
    const sib = await ghostServer.posts.browse({
      filter: `tag:${otherLang}+tag:${keyTag.replace('#','')}`, include: ['tags']
    })
    counterpart.value = sib[0] || null
  }
})

const toggleHref = computed(() => {
  if (!counterpart.value) return null
  const otherLang = route.params.lang === 'en' ? 'es' : 'en'
  return `/${otherLang}/blog/${counterpart.value.slug}`
})
</script>

<template>
  <article v-if="post" class="prose max-w-none">
    <h1>{{ post.title }}</h1>
    <img v-if="post.feature_image" :src="post.feature_image" :alt="post.title" class="rounded-lg" />
    <div v-html="post.html"></div>

    <div class="mt-6">
      <router-link v-if="toggleHref" class="btn" :to="toggleHref">
        {{ $route.params.lang === 'en' ? 'Leer en Español' : 'Read in English' }}
      </router-link>
    </div>
  </article>
</template>
```



### App Shell (src/App.vue)

```
<template>
  <div class="min-h-screen bg-base-100 text-base-content">
    <div class="navbar bg-base-200">
      <div class="container mx-auto px-4">
        <div class="flex-1">
          <router-link class="btn btn-ghost normal-case text-xl" to="/en/blog">
            Milkweed Mutual Aid
          </router-link>
        </div>
        <div class="flex-none">
          <div class="dropdown dropdown-end">
            <label tabindex="0" class="btn">Language</label>
            <ul tabindex="0" class="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-40">
              <li><router-link to="/en/blog">English</router-link></li>
              <li><router-link to="/es/blog">Español</router-link></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    <main class="container mx-auto px-4 py-8">
      <router-view />
    </main>
  </div>
</template>
```



### Vite & SSG Scripts (package.json)

```
{
  "scripts": {
    "dev": "vite",
    "build": "vite-ssg build --config ssg.config.ts",
    "preview": "vite preview"
  }
}
```



------



## **5. Deployment & Secrets**



### **Env Vars (set only in CI host;**  do not commit)



- GHOST_URL=https://milkweedmutualaid.org (or your Ghost origin)
- GHOST_CONTENT_KEY=*** (Content API key from Ghost Admin → Integrations)



> Because we’re SSG-only, we don’t expose the key to the browser.



### **Netlify**

- Add env vars above in Site Settings → Build & deploy → Environment.
- Build command: pnpm run build
- Publish directory: dist



------



## **6. Ghost → Static Rebuild (Webhooks)**



In **Ghost Admin → Settings → Integrations**:



1. Create “Static Site Build” integration; copy **Content API key** (already used by CI).

2. Add **webhooks**:

   - post.published → your Netlify **build hook URL**
   - post.updated → same build hook
   - (Optional) post.unpublished → same build hook

   

Result: publishing or editing triggers a rebuild so the static site updates.



------



## **7. Domain & Reverse Proxy (single clean domain)**



Public domain: https://milkweedmutualaid.org → points to the static site (CDN).



Keep Ghost Admin & API under same domain via the VM’s Nginx proxy:

```
location /ghost/ {
  proxy_pass http://127.0.0.1:2368/ghost/;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-Proto $scheme;
}
location /ghost/api/ {
  proxy_pass http://127.0.0.1:2368/ghost/api/;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

In Ghost, set **siteUrl** to https://milkweedmutualaid.org so links in newsletters land on the static site.



------



## **8. Newsletter Segmentation (Members)**



- In **Members**, label subscribers en or es. (Bulk-edit existing; add label at signup for new.)
- When sending a post by email: in the publish modal, pick **Audience → Members with label: en** (or es).



Optional: create /subscribe/en and /subscribe/es pages that call the Members API to assign labels automatically at signup.



------



## **9. Testing Checklist**



- Ghost: create sample EN and ES posts with tags en/es and shared #xkey-001.
- Run pnpm run build locally with GHOST_URL & GHOST_CONTENT_KEY exported → dist contains /en/blog/... and /es/blog/....
- Deploy to Netlify; confirm pages load and bilingual toggle works.
- Set webhooks; publish/edit a post; confirm auto-rebuild occurs.
- Newsletter: send a test post to Members with label: en only; confirm only EN-labeled accounts receive it.
- Verify Admin accessible under /ghost, and API under /ghost/api/*.



------



## **10. Acceptance Criteria**



1. **Bilingual routing**: /en/blog/:slug and /es/blog/:slug render correct language content.
2. **Toggle**: If both translations exist (same #xkey-*), a toggle link appears to switch languages.
3. **Static output**: Site builds to static files with vite-plugin-ssg; no client calls to Ghost in production path.
4. **Secure secrets**: No Content API key present in client bundle.
5. **Webhooks**: Publishing/updating in Ghost triggers an automatic rebuild & redeploy.
6. **Newsletter segmentation**: UI workflow verified for sending EN posts to en label and ES posts to es label.
7. **Styling**: Tailwind + DaisyUI in place; basic layout and components styled.



------



## **11. Nice-to-haves (Phase 2)**



- Add search (via a serverless index or prebuilt JSON).
- Breadcrumbs, categories pages per language.
- 404 pages per language.
- Image optimization (static host plugin).
- If needed, a small serverless proxy for runtime features (keeps key server-side).