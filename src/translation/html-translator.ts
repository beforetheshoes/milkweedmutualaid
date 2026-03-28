import { translate } from '@vitalets/google-translate-api'

interface Segment {
  type: 'tag' | 'text'
  value: string
}

const DELIMITER = '\n|||SPLIT|||\n'
const SKIP_TAGS = new Set(['code', 'pre', 'script', 'style'])

function parseSegments(html: string): Segment[] {
  const segments: Segment[] = []
  const tagRegex = /<[^>]+>/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = tagRegex.exec(html)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: html.slice(lastIndex, match.index) })
    }
    segments.push({ type: 'tag', value: match[0] })
    lastIndex = tagRegex.lastIndex
  }

  if (lastIndex < html.length) {
    segments.push({ type: 'text', value: html.slice(lastIndex) })
  }

  return segments
}

function markSkippedRegions(segments: Segment[]): boolean[] {
  const skip: boolean[] = new Array(segments.length).fill(false)
  let depth = 0

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    if (seg.type === 'tag') {
      const openMatch = seg.value.match(/^<(\w+)/)
      const closeMatch = seg.value.match(/^<\/(\w+)/)

      if (closeMatch && SKIP_TAGS.has(closeMatch[1].toLowerCase())) {
        depth = Math.max(0, depth - 1)
      } else if (openMatch && SKIP_TAGS.has(openMatch[1].toLowerCase()) && !seg.value.endsWith('/>')) {
        depth++
      }
    }

    if (depth > 0) {
      skip[i] = true
    }
  }

  return skip
}

export async function translateHtml(html: string): Promise<string> {
  const segments = parseSegments(html)
  const skip = markSkippedRegions(segments)

  const textIndices: number[] = []
  const textValues: string[] = []

  for (let i = 0; i < segments.length; i++) {
    if (segments[i].type === 'text' && !skip[i] && segments[i].value.trim().length > 0) {
      textIndices.push(i)
      textValues.push(segments[i].value)
    }
  }

  if (textValues.length === 0) {
    return html
  }

  const batched = textValues.join(DELIMITER)
  const result = await translate(batched, { from: 'en', to: 'es' })
  const translated = result.text.split(DELIMITER)

  if (translated.length !== textValues.length) {
    console.warn('[html-translator] Delimiter split mismatch, falling back to per-segment translation')
    return translateHtmlFallback(segments, textIndices)
  }

  for (let i = 0; i < textIndices.length; i++) {
    segments[textIndices[i]].value = translated[i]
  }

  return segments.map((s) => s.value).join('')
}

async function translateHtmlFallback(segments: Segment[], textIndices: number[]): Promise<string> {
  for (const idx of textIndices) {
    try {
      const result = await translate(segments[idx].value, { from: 'en', to: 'es' })
      segments[idx].value = result.text
      await delay(300)
    } catch (error) {
      console.warn(`[html-translator] Failed to translate segment: ${(error as Error).message}`)
    }
  }
  return segments.map((s) => s.value).join('')
}

export async function translateText(text: string): Promise<string> {
  const result = await translate(text, { from: 'en', to: 'es' })
  return result.text
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
