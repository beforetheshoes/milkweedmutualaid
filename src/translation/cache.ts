import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const CACHE_DIR = resolve('.translation-cache')

export interface CachedTranslation {
  contentHash: string
  translatedTitle: string
  translatedExcerpt: string
  translatedHtml: string
  cachedAt: string
}

export function computeHash(title: string, excerpt: string, html: string): string {
  return createHash('sha256').update(`${title}\n${excerpt}\n${html}`).digest('hex')
}

function cachePath(slug: string): string {
  return resolve(CACHE_DIR, `${slug}.json`)
}

export function readCache(slug: string, expectedHash: string): CachedTranslation | null {
  const path = cachePath(slug)
  if (!existsSync(path)) {
    return null
  }

  try {
    const data = JSON.parse(readFileSync(path, 'utf-8')) as CachedTranslation
    if (data.contentHash === expectedHash) {
      return data
    }
    return null
  } catch {
    return null
  }
}

export function writeCache(slug: string, entry: CachedTranslation): void {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true })
  }
  writeFileSync(cachePath(slug), JSON.stringify(entry, null, 2), 'utf-8')
}
