const WIDTHS = [300, 600, 1000, 1600]

export function ghostSrcset(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  if (!url.includes('/content/images/')) return undefined
  return WIDTHS.map((w) => `${url.replace('/content/images/', `/content/images/size/w${w}/`)} ${w}w`).join(', ')
}

export function ghostSizes(layout: 'full' | 'card' | 'thumb'): string {
  switch (layout) {
    case 'full':
      return '(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 640px'
    case 'card':
      return '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
    case 'thumb':
      return '120px'
  }
}
