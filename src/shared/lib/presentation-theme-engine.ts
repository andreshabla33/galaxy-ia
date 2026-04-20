export interface PresentationColorScheme {
  primary: string
  secondary: string
  background: string
  text: string
  muted: string
}

type StyleFamily = 'corporate' | 'minimal' | 'editorial'

const FAMILIES: Record<StyleFamily, PresentationColorScheme> = {
  corporate: {
    primary: '#22d3ee',
    secondary: '#818cf8',
    background: '#0b1220',
    text: 'rgba(255,255,255,0.92)',
    muted: 'rgba(255,255,255,0.62)',
  },
  minimal: {
    primary: '#60a5fa',
    secondary: '#a78bfa',
    background: '#0f172a',
    text: 'rgba(255,255,255,0.90)',
    muted: 'rgba(255,255,255,0.56)',
  },
  editorial: {
    primary: '#f97316',
    secondary: '#ec4899',
    background: '#111827',
    text: 'rgba(255,255,255,0.94)',
    muted: 'rgba(255,255,255,0.64)',
  },
}

function hashString(input: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function parseRgb(color: string): [number, number, number] {
  if (!color) return [255, 255, 255]
  if (color.startsWith('#')) {
    const hex = color.replace('#', '')
    const safe = hex.length >= 6 ? hex.slice(0, 6) : hex.padEnd(6, '0')
    return [
      parseInt(safe.slice(0, 2), 16),
      parseInt(safe.slice(2, 4), 16),
      parseInt(safe.slice(4, 6), 16),
    ]
  }
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i)
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])]
  return [255, 255, 255]
}

function luminance(color: string): number {
  const [r, g, b] = parseRgb(color).map((x) => {
    const s = x / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrastRatio(a: string, b: string): number {
  const l1 = luminance(a)
  const l2 = luminance(b)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

function asGradient(bg: string): string {
  return bg.includes('gradient')
    ? bg
    : `linear-gradient(135deg, ${bg} 0%, ${bg} 100%)`
}

function ensureReadable(s: PresentationColorScheme): PresentationColorScheme {
  // Use the first color in gradient as reference background for contrast checks
  const bgRef = s.background.includes('gradient')
    ? (s.background.match(/#([0-9a-fA-F]{6})/)?.[0] || '#0f172a')
    : s.background

  let text = s.text
  let muted = s.muted
  if (contrastRatio(text, bgRef) < 4.5) text = 'rgba(255,255,255,0.94)'
  if (contrastRatio(muted, bgRef) < 2.8) muted = 'rgba(255,255,255,0.64)'

  return { ...s, text, muted, background: asGradient(s.background) }
}

function pickFamily(seedKey: string): StyleFamily {
  const families: StyleFamily[] = ['corporate', 'minimal', 'editorial']
  return families[hashString(seedKey) % families.length]
}

export function resolvePresentationColorScheme(
  requested: Partial<PresentationColorScheme> | undefined,
  seedKey: string
): PresentationColorScheme {
  const family = FAMILIES[pickFamily(seedKey)]
  const merged: PresentationColorScheme = {
    primary: requested?.primary || family.primary,
    secondary: requested?.secondary || family.secondary,
    background: requested?.background || family.background,
    text: requested?.text || family.text,
    muted: requested?.muted || family.muted,
  }
  return ensureReadable(merged)
}
