interface AgendaItem {
  title: string
  detail?: string
}

interface TimelineEntry {
  label: string
  title: string
  detail?: string
}

interface Slide {
  layout: string
  title?: string
  subtitle?: string
  bullets?: string[]
  left?: { heading: string; content: string }
  right?: { heading: string; content: string }
  stats?: { value: string; label: string }[]
  quote?: string
  author?: string
  contact?: string
  content?: string
  image_prompt?: string
  agenda_items?: AgendaItem[]
  timeline?: TimelineEntry[]
}

interface PresentationData {
  slides?: Slide[]
  theme?: string
  titulo?: string
  color_scheme?: {
    primary?: string
    secondary?: string
    background?: string
    text?: string
    muted?: string
  }
}

interface PptxColors {
  bg: string
  title: string
  text: string
  accent: string
  muted: string
  white: string
}

const DEFAULT_COLORS: PptxColors = {
  bg: '0B0D17',
  title: '67E8F9',
  text: 'D1D5DB',
  accent: 'A78BFA',
  muted: '6B7280',
  white: 'FFFFFF',
}

// Convert CSS color (#hex or rgba) to 6-char hex for pptxgenjs
function toHex6(color: string): string {
  if (!color) return ''
  // Handle #hex
  if (color.startsWith('#')) return color.replace('#', '').slice(0, 6)
  // Handle rgba(r,g,b,a) — extract RGB and convert
  const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (rgbaMatch) {
    const [, r, g, b] = rgbaMatch
    return [r, g, b].map(c => parseInt(c).toString(16).padStart(2, '0')).join('')
  }
  return ''
}

function parseColors(data: PresentationData): PptxColors {
  const cs = data.color_scheme
  if (!cs) return DEFAULT_COLORS
  return {
    bg: toHex6(cs.background || '') || DEFAULT_COLORS.bg,
    title: toHex6(cs.primary || '') || DEFAULT_COLORS.title,
    text: toHex6(cs.text || '') || DEFAULT_COLORS.text,
    accent: toHex6(cs.secondary || '') || DEFAULT_COLORS.accent,
    muted: toHex6(cs.muted || '') || DEFAULT_COLORS.muted,
    white: DEFAULT_COLORS.white,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addBackgroundImage(s: any, slide: Slide, images: Map<string, string>, COLORS: PptxColors) {
  s.background = { color: COLORS.bg }
  if (slide.image_prompt && images && images.has(slide.image_prompt)) {
    s.addImage({ path: images.get(slide.image_prompt), x: 0, y: 0, w: '100%', h: '100%' })
    s.addShape('rect', { x: 0, y: 0, w: '100%', h: '100%', fill: { color: '000000', transparency: 75 } })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addTitleSlide(pptx: any, slide: Slide, images: Map<string, string>, COLORS: PptxColors) {
  const s = pptx.addSlide()
  s.background = { color: COLORS.bg }

  const hasImg = slide.image_prompt && images && images.has(slide.image_prompt)
  if (hasImg) {
    s.addImage({ path: images.get(slide.image_prompt!), x: 5.5, y: 0.8, w: 4.0, h: 4.0 })
    if (slide.title) {
      s.addText(slide.title, { x: 0.5, y: 2.0, w: 4.5, h: 1.5, fontSize: 36, bold: true, color: COLORS.title, fontFace: 'Arial' })
    }
    if (slide.subtitle) {
      s.addText(slide.subtitle, { x: 0.5, y: 3.5, w: 4.5, h: 0.8, fontSize: 18, color: COLORS.muted, fontFace: 'Arial' })
    }
  } else {
    if (slide.title) {
      s.addText(slide.title, { x: 0.8, y: 1.5, w: 8.4, h: 1.5, fontSize: 36, bold: true, color: COLORS.title, align: 'center', fontFace: 'Arial' })
    }
    if (slide.subtitle) {
      s.addText(slide.subtitle, { x: 1.5, y: 3.2, w: 7, h: 0.8, fontSize: 18, color: COLORS.muted, align: 'center', fontFace: 'Arial' })
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addBulletsSlide(pptx: any, slide: Slide, images: Map<string, string>, COLORS: PptxColors) {
  const s = pptx.addSlide()
  addBackgroundImage(s, slide, images, COLORS)

  if (slide.title) {
    s.addText(slide.title, { x: 0.8, y: 0.5, w: 8.4, h: 0.8, fontSize: 24, bold: true, color: COLORS.white, fontFace: 'Arial' })
  }
  if (slide.content) {
    s.addText(slide.content, { x: 0.8, y: 1.2, w: 8.4, h: 0.8, fontSize: 16, color: COLORS.muted, fontFace: 'Arial', valign: 'top' })
  }
  if (slide.bullets) {
    const bulletText = slide.bullets.map(b => ({
      text: b,
      options: { fontSize: 16, color: COLORS.text, bullet: { code: '25CF', color: COLORS.title }, paraSpaceAfter: 8 },
    }))
    s.addText(bulletText, { x: 0.8, y: slide.content ? 2.0 : 1.5, w: 8.4, h: 4, fontFace: 'Arial', valign: 'top' })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addImageLeftSlide(pptx: any, slide: Slide, images: Map<string, string>, COLORS: PptxColors) {
  const s = pptx.addSlide()
  s.background = { color: COLORS.bg }

  if (slide.image_prompt && images && images.has(slide.image_prompt)) {
    s.addImage({ path: images.get(slide.image_prompt), x: 0.5, y: 0.8, w: 4.0, h: 4.0 })
  }
  if (slide.title) {
    s.addText(slide.title, { x: 5.0, y: 0.8, w: 4.5, h: 0.6, fontSize: 24, bold: true, color: COLORS.white, fontFace: 'Arial' })
  }
  if (slide.content) {
    s.addText(slide.content, { x: 5.0, y: 1.5, w: 4.5, h: 1.0, fontSize: 14, color: COLORS.muted, fontFace: 'Arial', valign: 'top' })
  }
  if (slide.bullets) {
    const bulletText = slide.bullets.map(b => ({
      text: b,
      options: { fontSize: 14, color: COLORS.text, bullet: { code: '25CF', color: COLORS.title }, paraSpaceAfter: 6 },
    }))
    s.addText(bulletText, { x: 5.0, y: 2.6, w: 4.5, h: 2.5, fontFace: 'Arial', valign: 'top' })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addImageRightSlide(pptx: any, slide: Slide, images: Map<string, string>, COLORS: PptxColors) {
  const s = pptx.addSlide()
  s.background = { color: COLORS.bg }

  if (slide.title) {
    s.addText(slide.title, { x: 0.5, y: 0.8, w: 4.5, h: 0.6, fontSize: 24, bold: true, color: COLORS.white, fontFace: 'Arial' })
  }
  if (slide.content) {
    s.addText(slide.content, { x: 0.5, y: 1.5, w: 4.5, h: 1.0, fontSize: 14, color: COLORS.muted, fontFace: 'Arial', valign: 'top' })
  }
  if (slide.bullets) {
    const bulletText = slide.bullets.map(b => ({
      text: b,
      options: { fontSize: 14, color: COLORS.text, bullet: { code: '25CF', color: COLORS.title }, paraSpaceAfter: 6 },
    }))
    s.addText(bulletText, { x: 0.5, y: 2.6, w: 4.5, h: 2.5, fontFace: 'Arial', valign: 'top' })
  }
  if (slide.image_prompt && images && images.has(slide.image_prompt)) {
    s.addImage({ path: images.get(slide.image_prompt), x: 5.5, y: 0.8, w: 4.0, h: 4.0 })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addTwoColumnSlide(pptx: any, slide: Slide, images: Map<string, string>, COLORS: PptxColors) {
  const s = pptx.addSlide()
  addBackgroundImage(s, slide, images, COLORS)

  if (slide.title) {
    s.addText(slide.title, { x: 0.8, y: 0.5, w: 8.4, h: 0.8, fontSize: 24, bold: true, color: COLORS.white, fontFace: 'Arial' })
  }
  if (slide.left) {
    s.addShape('rect', { x: 0.5, y: 1.5, w: 4.2, h: 3.5, fill: { color: '111827' }, rectRadius: 0.15 })
    s.addText(slide.left.heading, { x: 0.7, y: 1.7, w: 3.8, h: 0.5, fontSize: 14, bold: true, color: COLORS.title, fontFace: 'Arial' })
    s.addText(slide.left.content, { x: 0.7, y: 2.3, w: 3.8, h: 2.5, fontSize: 12, color: COLORS.text, fontFace: 'Arial', valign: 'top' })
  }
  if (slide.right) {
    s.addShape('rect', { x: 5.3, y: 1.5, w: 4.2, h: 3.5, fill: { color: '111827' }, rectRadius: 0.15 })
    s.addText(slide.right.heading, { x: 5.5, y: 1.7, w: 3.8, h: 0.5, fontSize: 14, bold: true, color: COLORS.accent, fontFace: 'Arial' })
    s.addText(slide.right.content, { x: 5.5, y: 2.3, w: 3.8, h: 2.5, fontSize: 12, color: COLORS.text, fontFace: 'Arial', valign: 'top' })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addStatsSlide(pptx: any, slide: Slide, images: Map<string, string>, COLORS: PptxColors) {
  const s = pptx.addSlide()
  addBackgroundImage(s, slide, images, COLORS)

  if (slide.title) {
    s.addText(slide.title, { x: 0.8, y: 0.5, w: 8.4, h: 0.8, fontSize: 24, bold: true, color: COLORS.white, align: 'center', fontFace: 'Arial' })
  }
  if (slide.stats) {
    const gap = 8.4 / slide.stats.length
    slide.stats.forEach((stat, i) => {
      s.addText(stat.value, { x: 0.8 + (i * gap), y: 2, w: gap - 0.3, h: 1, fontSize: 36, bold: true, color: COLORS.title, align: 'center', fontFace: 'Arial' })
      s.addText(stat.label, { x: 0.8 + (i * gap), y: 3.2, w: gap - 0.3, h: 0.6, fontSize: 12, color: COLORS.muted, align: 'center', fontFace: 'Arial' })
    })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addQuoteSlide(pptx: any, slide: Slide, images: Map<string, string>, COLORS: PptxColors) {
  const s = pptx.addSlide()
  addBackgroundImage(s, slide, images, COLORS)

  if (slide.quote) {
    s.addText(`"${slide.quote}"`, { x: 1.5, y: 1.5, w: 7, h: 2.5, fontSize: 20, italic: true, color: COLORS.text, align: 'center', fontFace: 'Arial' })
  }
  if (slide.author) {
    s.addText(`— ${slide.author}`, { x: 1.5, y: 4.2, w: 7, h: 0.5, fontSize: 14, color: COLORS.muted, align: 'center', fontFace: 'Arial' })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addClosingSlide(pptx: any, slide: Slide, images: Map<string, string>, COLORS: PptxColors) {
  const s = pptx.addSlide()
  addBackgroundImage(s, slide, images, COLORS)

  if (slide.title) {
    s.addText(slide.title, { x: 0.8, y: 2, w: 8.4, h: 1.2, fontSize: 30, bold: true, color: COLORS.white, align: 'center', fontFace: 'Arial' })
  }
  if (slide.contact) {
    s.addText(slide.contact, { x: 1.5, y: 3.5, w: 7, h: 0.5, fontSize: 14, color: COLORS.muted, align: 'center', fontFace: 'Arial' })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addAgendaSlide(pptx: any, slide: Slide, images: Map<string, string>, COLORS: PptxColors) {
  const s = pptx.addSlide()
  s.background = { color: COLORS.bg }
  if (slide.title) {
    s.addText(slide.title, { x: 0.8, y: 0.5, w: 8.4, h: 0.7, fontSize: 24, bold: true, color: COLORS.title, fontFace: 'Arial' })
  }
  const items: AgendaItem[] =
    slide.agenda_items?.length ? slide.agenda_items : (slide.bullets?.map(b => ({ title: b })) ?? [])
  let y = 1.35
  const lineH = 0.42
  items.forEach((item, i) => {
    s.addText(String(i + 1).padStart(2, '0'), { x: 0.8, y, w: 0.55, h: lineH, fontSize: 12, bold: true, color: COLORS.title, fontFace: 'Arial' })
    s.addText(item.title, { x: 1.45, y, w: 7.5, h: lineH + 0.15, fontSize: 15, bold: true, color: COLORS.white, fontFace: 'Arial', valign: 'top' })
    y += lineH + 0.28
    if (item.detail) {
      s.addText(item.detail, { x: 1.45, y, w: 7.5, h: 0.75, fontSize: 11, color: COLORS.muted, fontFace: 'Arial', valign: 'top' })
      y += 0.72
    }
    y += 0.12
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addSectionSlide(pptx: any, slide: Slide, images: Map<string, string>, COLORS: PptxColors) {
  const s = pptx.addSlide()
  s.background = { color: COLORS.bg }
  if (slide.title) {
    s.addText(slide.title, { x: 0.8, y: 1.7, w: 8.4, h: 1.4, fontSize: 32, bold: true, color: COLORS.white, align: 'center', fontFace: 'Arial' })
  }
  if (slide.subtitle) {
    s.addText(slide.subtitle, { x: 1.2, y: 3.2, w: 7.6, h: 0.9, fontSize: 16, color: COLORS.muted, align: 'center', fontFace: 'Arial' })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addTimelineSlide(pptx: any, slide: Slide, images: Map<string, string>, COLORS: PptxColors) {
  const s = pptx.addSlide()
  s.background = { color: COLORS.bg }
  if (slide.title) {
    s.addText(slide.title, { x: 0.8, y: 0.45, w: 8.4, h: 0.65, fontSize: 22, bold: true, color: COLORS.title, align: 'center', fontFace: 'Arial' })
  }
  const entries = slide.timeline ?? []
  let y = 1.25
  entries.forEach((ev) => {
    s.addText(ev.label, { x: 0.8, y, w: 1.1, h: 0.4, fontSize: 11, bold: true, color: COLORS.title, fontFace: 'Arial' })
    s.addText(ev.title, { x: 2.0, y, w: 6.8, h: 0.4, fontSize: 14, bold: true, color: COLORS.white, fontFace: 'Arial' })
    y += 0.42
    if (ev.detail) {
      s.addText(ev.detail, { x: 2.0, y, w: 6.8, h: 0.65, fontSize: 11, color: COLORS.muted, fontFace: 'Arial', valign: 'top' })
      y += 0.62
    }
    y += 0.15
  })
}

// Normalize legacy/unknown layout names to the closest known layout
function normalizeLayout(layout: string): string {
  const KNOWN = ['title', 'agenda', 'section', 'timeline', 'bullets', 'two-column', 'stats', 'quote', 'image-left', 'image-right', 'closing']
  if (KNOWN.includes(layout)) return layout
  if (layout === 'image-text') return 'image-right'
  if (layout === 'content' || layout === 'text') return 'bullets'
  if (layout === 'chapter' || layout === 'divider' || layout === 'act') return 'section'
  return layout
}

export async function exportToPptx(data: PresentationData, titulo: string, images: Map<string, string>) {
  // Dynamic import — solo se carga cuando el usuario hace clic en "Descargar"
  const PptxGenJS = (await import('pptxgenjs')).default
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'
  pptx.author = 'Galaxy AI Canvas'
  pptx.title = titulo

  const slides = (data.slides || []) as Slide[]
  const COLORS = parseColors(data as PresentationData)

  for (const rawSlide of slides) {
    const slide = { ...rawSlide, layout: normalizeLayout(rawSlide.layout) }
    switch (slide.layout) {
      case 'title': addTitleSlide(pptx, slide, images, COLORS); break
      case 'agenda': addAgendaSlide(pptx, slide, images, COLORS); break
      case 'section': addSectionSlide(pptx, slide, images, COLORS); break
      case 'timeline': addTimelineSlide(pptx, slide, images, COLORS); break
      case 'image-left': addImageLeftSlide(pptx, slide, images, COLORS); break
      case 'image-right': addImageRightSlide(pptx, slide, images, COLORS); break
      case 'bullets': addBulletsSlide(pptx, slide, images, COLORS); break
      case 'two-column': addTwoColumnSlide(pptx, slide, images, COLORS); break
      case 'stats': addStatsSlide(pptx, slide, images, COLORS); break
      case 'quote': addQuoteSlide(pptx, slide, images, COLORS); break
      case 'closing': addClosingSlide(pptx, slide, images, COLORS); break
      default: addBulletsSlide(pptx, slide, images, COLORS); break
    }
  }

  const filename = titulo.replace(/\s+/g, '-').toLowerCase()
  await pptx.writeFile({ fileName: `${filename}.pptx` })
}
