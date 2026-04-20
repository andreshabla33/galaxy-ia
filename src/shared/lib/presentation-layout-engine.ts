export interface EngineSlide {
  layout?: string
  title?: string
  subtitle?: string
  bullets?: string[]
  content?: string
  quote?: string
  author?: string
  left?: { heading?: string; content?: string; items?: string[] }
  right?: { heading?: string; content?: string; items?: string[] }
  stats?: { value: string; label: string }[]
  items?: { icon?: string; title: string; description: string }[]
  image_prompt?: string
  image_url?: string
  section_number?: number
  highlight_text?: string
  notes?: string
  contact?: string
}

interface EngineOptions {
  seedKey: string
  richLayouts?: string[]
}

export interface SlideDiversityPair {
  from: number
  to: number
  similarity: number
  diversity: number
}

const DEFAULT_LAYOUTS = [
  'title', 'bullets', 'two-column', 'stats', 'quote', 'image-left', 'image-right', 'closing',
  'full-image', 'icon-grid', 'timeline', 'section-divider', 'bento-grid', 'comparison', 'chart',
  'photo-quote', 'product-mockup', 'split-spotlight', 'orbit-stats',
]

const ALT_LAYOUTS: Record<string, string[]> = {
  bullets: ['image-left', 'image-right', 'icon-grid'],
  'image-left': ['image-right', 'full-image'],
  'image-right': ['image-left', 'full-image'],
  stats: ['chart', 'comparison'],
  chart: ['stats', 'comparison'],
  quote: ['full-image'],
  'two-column': ['comparison', 'bento-grid'],
  'icon-grid': ['bento-grid', 'timeline'],
  timeline: ['icon-grid', 'bento-grid'],
  'bento-grid': ['icon-grid', 'comparison'],
  comparison: ['two-column', 'chart'],
  'full-image': ['image-left', 'image-right'],
  'section-divider': ['full-image'],
  'photo-quote': ['full-image', 'quote'],
  'product-mockup': ['image-left', 'image-right'],
  'split-spotlight': ['comparison', 'image-right'],
  'orbit-stats': ['stats', 'chart'],
}

const IMAGE_FIRST_LAYOUTS = ['full-image', 'photo-quote', 'split-spotlight', 'product-mockup']
const DATA_LAYOUTS = ['stats', 'chart', 'orbit-stats']

function hashString(input: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0
  return () => {
    t += 0x6D2B79F5
    let x = Math.imul(t ^ (t >>> 15), 1 | t)
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

function pick<T>(arr: T[], rnd: () => number): T {
  return arr[Math.floor(rnd() * arr.length)]
}

function compactText(text: string, maxChars: number): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= maxChars) return t
  const clipped = t.slice(0, maxChars)
  const boundary = Math.max(clipped.lastIndexOf('.'), clipped.lastIndexOf(','), clipped.lastIndexOf(' '))
  return `${clipped.slice(0, Math.max(0, boundary)).trim()}...`
}

function extractKeywords(text: string, max = 3): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, ' ')
    .split(/\s+/)
    .filter(w => w.length > 4)
  const unique: string[] = []
  for (const w of words) {
    if (!unique.includes(w)) unique.push(w)
    if (unique.length >= max) break
  }
  return unique.map(w => w.charAt(0).toUpperCase() + w.slice(1))
}

function isSparse(slide: EngineSlide): boolean {
  const textLen =
    (slide.title?.trim().length || 0) +
    (slide.subtitle?.trim().length || 0) +
    (slide.content?.trim().length || 0) +
    ((slide.bullets || []).join(' ').trim().length)
  const hasStructured = (slide.items?.length || 0) > 0 || (slide.stats?.length || 0) > 0 || !!(slide.left && slide.right)
  return textLen < 90 && !hasStructured
}

function buildFallbackBullets(slide: EngineSlide): string[] {
  const source = `${slide.title || ''} ${slide.subtitle || ''} ${slide.content || ''}`.trim()
  const keys = extractKeywords(source, 3)
  if (keys.length >= 3) {
    return keys.map(k => `${k}: translated into a concrete action and measurable outcome for this section.`)
  }
  return [
    'Context: frame the key idea with a concrete scenario to avoid generic storytelling.',
    'Value: connect the visual with a clear user or business impact.',
    'Action: define the next step this slide should trigger in the audience.',
  ]
}

function textBucket(slide: EngineSlide): number {
  const totalChars =
    (slide.title?.length || 0) +
    (slide.subtitle?.length || 0) +
    (slide.content?.length || 0) +
    ((slide.bullets || []).join(' ').length) +
    ((slide.items || []).map(it => `${it.title} ${it.description}`).join(' ').length)
  if (totalChars < 80) return 1
  if (totalChars < 220) return 2
  if (totalChars < 420) return 3
  return 4
}

function shapeTag(slide: EngineSlide): string {
  if ((slide.stats?.length || 0) > 0) return 'data'
  if ((slide.items?.length || 0) > 0) return 'collection'
  if (slide.left && slide.right) return 'compare'
  if (slide.quote) return 'quote'
  if ((slide.bullets?.length || 0) > 0) return 'bullets'
  return 'plain'
}

function similarity(a: EngineSlide, b: EngineSlide): number {
  let score = 0
  if (a.layout && b.layout && a.layout === b.layout) score += 0.4
  if (shapeTag(a) === shapeTag(b)) score += 0.25
  if (!!(a.image_prompt || a.image_url) === !!(b.image_prompt || b.image_url)) score += 0.15
  if (!!a.quote === !!b.quote) score += 0.05
  if (!!a.stats?.length === !!b.stats?.length) score += 0.1
  if (Math.abs(textBucket(a) - textBucket(b)) <= 1) score += 0.1
  return Math.min(1, score)
}

export function analyzeSlideDiversity<T extends EngineSlide>(slides: T[]): {
  pairs: SlideDiversityPair[]
  averageDiversity: number
} {
  if (!Array.isArray(slides) || slides.length < 2) {
    return { pairs: [], averageDiversity: 1 }
  }

  const pairs: SlideDiversityPair[] = []
  let total = 0
  for (let i = 1; i < slides.length; i++) {
    const sim = similarity(slides[i - 1], slides[i])
    const div = Math.max(0, 1 - sim)
    pairs.push({
      from: i - 1,
      to: i,
      similarity: Number(sim.toFixed(3)),
      diversity: Number(div.toFixed(3)),
    })
    total += div
  }
  return {
    pairs,
    averageDiversity: Number((total / pairs.length).toFixed(3)),
  }
}

function ensureCoreContent<T extends EngineSlide>(slide: T, layout: string): T {
  const patched = { ...slide }
  if (IMAGE_FIRST_LAYOUTS.includes(layout)) {
    if (!patched.image_prompt && !patched.image_url) {
      patched.image_prompt = `Cinematic visual metaphor for ${patched.title || 'presentation topic'}, dramatic composition, premium editorial style, no text, no logos, no watermarks, sharp focus`
    }
    if (!patched.highlight_text && layout === 'full-image' && patched.title) {
      patched.highlight_text = compactText(patched.title, 54)
    }
  }
  if (layout === 'photo-quote' && !patched.quote) {
    patched.quote = patched.title ? compactText(patched.title, 90) : 'A compelling insight changes the trajectory.'
  }
  if ((layout === 'full-image' || layout === 'split-spotlight') && (!patched.bullets || patched.bullets.length < 2)) {
    patched.bullets = buildFallbackBullets(patched).slice(0, 3)
  }
  if ((layout === 'image-left' || layout === 'image-right' || layout === 'product-mockup') && (!patched.bullets || patched.bullets.length < 2)) {
    patched.bullets = buildFallbackBullets(patched).slice(0, 4)
  }
  if (layout === 'orbit-stats' && (!patched.stats || patched.stats.length < 3)) {
    const source = patched.bullets && patched.bullets.length > 0 ? patched.bullets : ['Engagement growth', 'Execution speed', 'Quality uplift']
    patched.stats = source.slice(0, 3).map((b, i) => ({
      value: `${65 + i * 12}%`,
      label: compactText(String(b), 24),
    }))
  }
  return patched as T
}

function guessLayout(slide: EngineSlide, idx: number, total: number, rnd: () => number, allowed: Set<string>): string {
  const hasImage = !!(slide.image_prompt || slide.image_url)
  const hasStats = (slide.stats?.length || 0) > 0
  const hasItems = (slide.items?.length || 0) > 0
  const hasCompare = !!(slide.left && slide.right)
  const hasQuote = !!slide.quote
  const hasBullets = (slide.bullets?.length || 0) > 0

  if (idx === 0 && allowed.has('title')) return 'title'
  if (idx === total - 1 && allowed.has('closing') && !!slide.title) return 'closing'
  if (hasQuote) return pick(['photo-quote', 'quote', 'full-image'].filter(l => allowed.has(l)), rnd) || 'quote'
  if (hasStats) return pick(['orbit-stats', 'chart', 'stats'].filter(l => allowed.has(l)), rnd) || 'stats'
  if (hasCompare) return pick(['comparison', 'two-column'].filter(l => allowed.has(l)), rnd) || 'two-column'
  if (hasItems) {
    const rich = ['bento-grid', 'icon-grid', 'timeline', 'split-spotlight'].filter(l => allowed.has(l))
    return pick(rich.length ? rich : ['icon-grid'], rnd)
  }
  if (hasImage && hasBullets) return pick(['split-spotlight', 'image-left', 'image-right', 'full-image', 'product-mockup'].filter(l => allowed.has(l)), rnd) || 'image-right'
  if (hasImage) return pick(['full-image', 'photo-quote', 'image-right', 'image-left', 'product-mockup'].filter(l => allowed.has(l)), rnd) || 'image-right'
  if (hasBullets) return pick(['bullets', 'icon-grid'].filter(l => allowed.has(l)), rnd) || 'bullets'
  return 'bullets'
}

export function optimizePresentationSlides<T extends EngineSlide>(slides: T[], options: EngineOptions): T[] {
  if (!Array.isArray(slides) || slides.length === 0) return slides

  const allowed = new Set(options.richLayouts && options.richLayouts.length > 0 ? options.richLayouts : DEFAULT_LAYOUTS)
  const rnd = mulberry32(hashString(options.seedKey || 'galaxy-seed'))

  const normalized = slides.map((s, i) => {
    const title = s.title?.trim() || (i === 0 ? 'Presentacion' : `Slide ${i + 1}`)
    const bullets = (s.bullets || [])
      .filter(Boolean)
      .slice(0, 5)
      .map(b => compactText(String(b), 160))
    const items = (s.items || [])
      .slice(0, 5)
      .map(it => ({
        icon: it.icon,
        title: compactText(it.title || 'Elemento', 48),
        description: compactText(it.description || '', 120),
      }))
    const content = s.content ? compactText(s.content, 260) : s.content
    const subtitle = s.subtitle ? compactText(s.subtitle, 120) : s.subtitle

    const base = {
      ...s,
      title,
      subtitle,
      content,
      bullets,
      items,
    }

    const guessed = guessLayout(base, i, slides.length, rnd, allowed)
    let layout = s.layout && allowed.has(s.layout) ? s.layout : guessed

    // Avoid empty slides except where minimalism is intentional
    if (isSparse(base) && !['title', 'section-divider', 'closing'].includes(layout)) {
      const richer = ['split-spotlight', 'image-right', 'image-left', 'icon-grid', 'comparison', 'product-mockup']
        .filter(l => allowed.has(l))
      if (richer.length > 0) layout = pick(richer, rnd)
    }

    return ensureCoreContent({ ...base, layout } as T, layout)
  })

  // Break repeated layout runs to avoid monotony
  for (let i = 1; i < normalized.length; i++) {
    const prev = normalized[i - 1]
    const curr = normalized[i]
    const sim = similarity(prev, curr)
    // Target: at least ~60% visual/structural difference -> similarity <= 0.4
    if (sim > 0.4) {
      const alternatives = (ALT_LAYOUTS[curr.layout || ''] || [])
        .concat(Array.from(allowed))
        .filter((l, idx, arr) => allowed.has(l) && l !== prev.layout && arr.indexOf(l) === idx)
      if (alternatives.length > 0) {
        const nextLayout = pick(alternatives, rnd)
        normalized[i] = ensureCoreContent({ ...curr, layout: nextLayout } as T, nextLayout)
      }
      if (normalized[i].title === prev.title && normalized[i].title) {
        normalized[i] = { ...normalized[i], title: compactText(`${normalized[i].title} — perspectiva ${i + 1}`, 72) } as T
      }
    }
    if (DATA_LAYOUTS.includes(normalized[i].layout || '') && DATA_LAYOUTS.includes(prev.layout || '')) {
      const alternatives = ['split-spotlight', 'image-right', 'icon-grid', 'comparison'].filter(l => allowed.has(l))
      if (alternatives.length > 0) {
        const nextLayout = pick(alternatives, rnd)
        normalized[i] = ensureCoreContent({ ...normalized[i], layout: nextLayout } as T, nextLayout)
      }
    }
  }

  // Inject a divider in long decks if none exists
  if (normalized.length >= 10 && !normalized.some(s => s.layout === 'section-divider') && allowed.has('section-divider')) {
    const idx = Math.max(1, Math.floor(normalized.length / 2))
    const ref = normalized[idx]
    normalized[idx] = {
      ...ref,
      layout: 'section-divider',
      section_number: 2,
      subtitle: ref.subtitle || 'Bloque siguiente',
      bullets: undefined,
      content: undefined,
      items: undefined,
      stats: undefined,
    } as T
  }

  return normalized
}
