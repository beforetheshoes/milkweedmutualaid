import { describe, it, expect } from 'vitest'

// ── WCAG 2.1 contrast ratio calculation ──

type RGB = [number, number, number]

function srgbToLinear(c: number): number {
  const s = c / 255
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

function luminance([r, g, b]: RGB): number {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b)
}

function contrastRatio(fg: RGB, bg: RGB): number {
  const l1 = luminance(fg)
  const l2 = luminance(bg)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

function withOpacity(fg: RGB, bg: RGB, opacity: number): RGB {
  return [
    Math.round(fg[0] * opacity + bg[0] * (1 - opacity)),
    Math.round(fg[1] * opacity + bg[1] * (1 - opacity)),
    Math.round(fg[2] * opacity + bg[2] * (1 - opacity)),
  ]
}

function fmt(ratio: number): string {
  return `${ratio.toFixed(1)}:1`
}

// ── WCAG thresholds ──
// Default modes: WCAG AA
// HC modes: WCAG AAA
const AA_NORMAL = 4.5    // normal text
const AA_LARGE = 3.0     // large text (≥18pt or ≥14pt bold)
const AAA_NORMAL = 7.0   // HC normal text
const AAA_LARGE = 4.5    // HC large text

// ── Theme colors (RGB, converted from oklch in tailwind.css) ──

const themes = {
  light: {
    'primary':           [110, 36, 151] as RGB,
    'primary-content':   [255, 255, 255] as RGB,
    'secondary':         [237, 194, 228] as RGB,
    'secondary-content': [64, 20, 89] as RGB,
    'accent':            [65, 215, 228] as RGB,
    'accent-content':    [0, 28, 32] as RGB,
    'success':           [55, 100, 60] as RGB,
    'success-content':   [255, 255, 255] as RGB,
    'base-100':          [255, 255, 255] as RGB,
    'base-200':          [247, 244, 249] as RGB,
    'base-300':          [238, 233, 241] as RGB,
    'base-content':      [35, 20, 45] as RGB,
  },
  dark: {
    'primary':           [145, 75, 189] as RGB,
    'primary-content':   [255, 255, 255] as RGB,
    'secondary':         [222, 171, 212] as RGB,
    'secondary-content': [33, 7, 48] as RGB,
    'accent':            [40, 218, 230] as RGB,
    'accent-content':    [0, 5, 8] as RGB,
    'success':           [65, 120, 70] as RGB,
    'success-content':   [255, 255, 255] as RGB,
    'base-100':          [22, 13, 29] as RGB,
    'base-200':          [31, 23, 37] as RGB,
    'base-300':          [40, 33, 45] as RGB,
    'base-content':      [225, 219, 230] as RGB,
  },
  'light-hc': {
    'primary':           [90, 25, 130] as RGB,
    'primary-content':   [255, 255, 255] as RGB,
    'secondary':         [140, 50, 120] as RGB,
    'secondary-content': [255, 255, 255] as RGB,
    'accent':            [0, 90, 100] as RGB,
    'accent-content':    [255, 255, 255] as RGB,
    'success':           [45, 95, 50] as RGB,
    'success-content':   [255, 255, 255] as RGB,
    'base-100':          [255, 255, 255] as RGB,
    'base-200':          [247, 244, 249] as RGB,
    'base-300':          [238, 233, 241] as RGB,
    'base-content':      [20, 15, 30] as RGB,
  },
  'dark-hc': {
    'primary':           [195, 155, 230] as RGB,
    'primary-content':   [22, 18, 30] as RGB,
    'secondary':         [240, 180, 220] as RGB,
    'secondary-content': [22, 18, 30] as RGB,
    'accent':            [100, 220, 230] as RGB,
    'accent-content':    [22, 18, 30] as RGB,
    'success':           [120, 200, 130] as RGB,
    'success-content':   [22, 18, 30] as RGB,
    'base-100':          [22, 18, 30] as RGB,
    'base-200':          [31, 23, 37] as RGB,
    'base-300':          [40, 33, 45] as RGB,
    'base-content':      [240, 237, 245] as RGB,
  },
}

// HC overrides for bg-primary sections
const HC_BRIGHT_TEAL: RGB = [130, 240, 248]
const HC_DARK_PURPLE_BG: RGB = [90, 25, 130]

// ── Tests per mode ──

describe.each(['light', 'dark', 'light-hc', 'dark-hc'] as const)('%s mode', (mode) => {
  const t = themes[mode]
  const isHC = mode.includes('hc')
  const normalMin = isHC ? AAA_NORMAL : AA_NORMAL
  const largeMin = isHC ? AAA_LARGE : AA_LARGE

  // ── Body text on page background ──

  describe('body text on base-100', () => {
    it(`base-content meets ${isHC ? 'AAA' : 'AA'} (${normalMin}:1)`, () => {
      const r = contrastRatio(t['base-content'], t['base-100'])
      expect(r, fmt(r)).toBeGreaterThanOrEqual(normalMin)
    })

    it(`primary as large text meets ${largeMin}:1`, () => {
      const r = contrastRatio(t['primary'], t['base-100'])
      expect(r, fmt(r)).toBeGreaterThanOrEqual(largeMin)
    })

    if (!isHC) {
      it('base-content/60 meets AA for large text (3:1)', () => {
        const fg = withOpacity(t['base-content'], t['base-100'], 0.6)
        const r = contrastRatio(fg, t['base-100'])
        expect(r, fmt(r)).toBeGreaterThanOrEqual(AA_LARGE)
      })

      it('base-content/50 meets minimum (3:1)', () => {
        const fg = withOpacity(t['base-content'], t['base-100'], 0.5)
        const r = contrastRatio(fg, t['base-100'])
        expect(r, fmt(r)).toBeGreaterThanOrEqual(AA_LARGE)
      })
    }

    if (isHC) {
      it('base-content (HC full opacity) meets AAA (7:1)', () => {
        const r = contrastRatio(t['base-content'], t['base-100'])
        expect(r, fmt(r)).toBeGreaterThanOrEqual(AAA_NORMAL)
      })
    }
  })

  // ── Text on base-200 ──

  describe('text on base-200 (cards, footer)', () => {
    it(`base-content meets ${normalMin}:1`, () => {
      const r = contrastRatio(t['base-content'], t['base-200'])
      expect(r, fmt(r)).toBeGreaterThanOrEqual(normalMin)
    })
  })

  // ── Text on primary bg (events, buttons, headers) ──

  describe('text on primary bg', () => {
    const primaryBg = (mode === 'dark-hc') ? HC_DARK_PURPLE_BG : t['primary']

    it(`primary-content meets ${largeMin}:1`, () => {
      const fg = (mode === 'dark-hc') ? [255, 255, 255] as RGB : t['primary-content']
      const r = contrastRatio(fg, primaryBg)
      expect(r, fmt(r)).toBeGreaterThanOrEqual(largeMin)
    })

    if (isHC) {
      it('accent (event dates) with HC override meets AAA (7:1)', () => {
        const r = contrastRatio(HC_BRIGHT_TEAL, primaryBg)
        expect(r, fmt(r)).toBeGreaterThanOrEqual(AAA_NORMAL)
      })
    }

    if (!isHC) {
      it('accent (event dates) on primary meets 3:1', () => {
        const r = contrastRatio(t['accent'], t['primary'])
        expect(r, fmt(r)).toBeGreaterThanOrEqual(AA_LARGE)
      })
    }
  })

  // ── Text on secondary bg ──

  describe('text on secondary bg', () => {
    it(`secondary-content meets ${largeMin}:1`, () => {
      const r = contrastRatio(t['secondary-content'], t['secondary'])
      expect(r, fmt(r)).toBeGreaterThanOrEqual(largeMin)
    })

    if (isHC) {
      it('secondary-content meets AAA (7:1)', () => {
        const r = contrastRatio(t['secondary-content'], t['secondary'])
        expect(r, fmt(r)).toBeGreaterThanOrEqual(AAA_NORMAL)
      })
    }
  })

  // ── Text on accent bg ──

  describe('text on accent bg', () => {
    it(`accent-content meets ${largeMin}:1`, () => {
      const r = contrastRatio(t['accent-content'], t['accent'])
      expect(r, fmt(r)).toBeGreaterThanOrEqual(largeMin)
    })
  })

  // ── Button text ──

  describe('button text', () => {
    it(`primary-content on primary meets ${largeMin}:1`, () => {
      const r = contrastRatio(t['primary-content'], t['primary'])
      expect(r, fmt(r)).toBeGreaterThanOrEqual(largeMin)
    })

    it(`success-content on success meets ${largeMin}:1`, () => {
      const r = contrastRatio(t['success-content'], t['success'])
      expect(r, fmt(r)).toBeGreaterThanOrEqual(largeMin)
    })
  })
})

// ── HC must be strictly better than default ──

describe('HC improves contrast', () => {
  it('light-hc body text >= light body text', () => {
    const def = contrastRatio(themes.light['base-content'], themes.light['base-100'])
    const hc = contrastRatio(themes['light-hc']['base-content'], themes['light-hc']['base-100'])
    expect(hc).toBeGreaterThanOrEqual(def)
  })

  it('dark-hc body text >= dark body text', () => {
    const def = contrastRatio(themes.dark['base-content'], themes.dark['base-100'])
    const hc = contrastRatio(themes['dark-hc']['base-content'], themes['dark-hc']['base-100'])
    expect(hc).toBeGreaterThanOrEqual(def)
  })

  it('light-hc primary on white >= light primary on white', () => {
    const def = contrastRatio(themes.light['primary'], themes.light['base-100'])
    const hc = contrastRatio(themes['light-hc']['primary'], themes['light-hc']['base-100'])
    expect(hc).toBeGreaterThanOrEqual(def)
  })
})
