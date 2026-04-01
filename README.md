# Milkweed Mutual Aid

Bilingual static frontend for [Milkweed Mutual Aid Collective](https://milkweedmutualaid.org), a mutual aid group in Hillsborough, NC.

## Stack

- **Vue 3 + Vite** with static site generation via [vite-ssg](https://github.com/antfu/vite-ssg)
- **Ghost CMS** as headless content backend (Content API, read-only at build time)
- **Tailwind CSS + DaisyUI** with custom theme using logo colors
- **vue-i18n** for English/Spanish UI strings
- **Google Translate** for auto-translating posts without manual Spanish versions
- **Google Calendar** (public iCal) for upcoming events

## Features

- Bilingual routing (`/en/...` and `/es/...`) with language toggle
- Auto-translation of English posts to Spanish at build time (cached)
- Upcoming events pulled from Google Calendar
- Newsletter signup via Ghost Members magic link
- Dark/light mode, high contrast, adjustable font size, reduced motion
- SEO meta tags (OpenGraph, Twitter cards) per page
- Responsive images via Ghost's built-in resizer
- Tag-based post filtering
- Embedded interest form (HeyForm) and contribution page (HCB)

## Development

```bash
pnpm install
pnpm dev
```

Requires a `.env` file (see `.env.example`):

```
GHOST_URL=https://ghost.milkweedmutualaid.org
GHOST_CONTENT_KEY=your_content_api_key
```

## Build

```bash
pnpm build
pnpm preview  # preview the built site locally
```

The build fetches all content from Ghost, translates missing Spanish posts, fetches calendar events, and generates static HTML.

## Deployment

Deployed on Netlify. Configuration is in `netlify.toml`.

- Ghost webhooks trigger rebuilds on post publish/update
- A Netlify scheduled function triggers a daily rebuild for calendar updates
- Environment variables (`GHOST_URL`, `GHOST_CONTENT_KEY`, `NETLIFY_BUILD_HOOK_URL`) are set in Netlify dashboard

## Project Structure

```
src/
  pages/           # Vue page components
  composables/     # Shared composables (useLang, useSeo, useSettings, etc.)
  translation/     # Auto-translation engine (cache, HTML translator, store)
  types/           # TypeScript interfaces
  utils/           # Helpers (post filtering, image srcset)
  state.ts         # Reactive state bridged between SSR and client
  i18n.ts          # English/Spanish UI strings
  ghost.server.ts  # Ghost API client (server-only)
  calendar.server.ts # Google Calendar iCal fetcher (server-only)
```
