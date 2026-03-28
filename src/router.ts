import type { RouteRecordRaw } from 'vue-router'
import BlogList from './pages/BlogList.vue'
import BlogPost from './pages/BlogPost.vue'
import About from './pages/About.vue'
import GhostPage from './pages/GhostPage.vue'

export const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/en/blog' },
  { path: '/:lang(en|es)/blog', name: 'blog-list', component: BlogList },
  { path: '/:lang(en|es)/blog/:slug', name: 'blog-post', component: BlogPost },
  { path: '/:lang(en|es)/about', name: 'about', component: About },
  { path: '/:lang(en|es)/page/:slug', name: 'ghost-page', component: GhostPage },
  { path: '/:pathMatch(.*)*', redirect: '/en/blog' }
]
