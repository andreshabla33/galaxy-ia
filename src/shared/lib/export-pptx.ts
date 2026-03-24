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
}

interface PresentationData {
  slides?: Slide[]
  theme?: string
  titulo?: string
}

const COLORS = {
  bg: '0B0D17',
  title: '67E8F9',
  text: 'D1D5DB',
  accent: 'A78BFA',
  muted: '6B7280',
  white: 'FFFFFF',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addBackgroundImage(s: any, slide: Slide, images: Map<string, string>) {
  s.background = { color: COLORS.bg }
  if (slide.image_prompt && images && images.has(slide.image_prompt)) {
    s.addImage({ path: images.get(slide.image_prompt), x: 0, y: 0, w: '100%', h: '100%' })
    s.addShape('rect', { x: 0, y: 0, w: '100%', h: '100%', fill: { color: '000000', transparency: 75 } })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addTitleSlide(pptx: any, slide: Slide, images: Map<string, string>) {
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
function addBulletsSlide(pptx: any, slide: Slide, images: Map<string, string>) {
  const s = pptx.addSlide()
  addBackgroundImage(s, slide, images)

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
function addImageLeftSlide(pptx: any, slide: Slide, images: Map<string, string>) {
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
function addImageRightSlide(pptx: any, slide: Slide, images: Map<string, string>) {
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
function addTwoColumnSlide(pptx: any, slide: Slide, images: Map<string, string>) {
  const s = pptx.addSlide()
  addBackgroundImage(s, slide, images)

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
function addStatsSlide(pptx: any, slide: Slide, images: Map<string, string>) {
  const s = pptx.addSlide()
  addBackgroundImage(s, slide, images)

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
function addQuoteSlide(pptx: any, slide: Slide, images: Map<string, string>) {
  const s = pptx.addSlide()
  addBackgroundImage(s, slide, images)

  if (slide.quote) {
    s.addText(`"${slide.quote}"`, { x: 1.5, y: 1.5, w: 7, h: 2.5, fontSize: 20, italic: true, color: COLORS.text, align: 'center', fontFace: 'Arial' })
  }
  if (slide.author) {
    s.addText(`— ${slide.author}`, { x: 1.5, y: 4.2, w: 7, h: 0.5, fontSize: 14, color: COLORS.muted, align: 'center', fontFace: 'Arial' })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addClosingSlide(pptx: any, slide: Slide, images: Map<string, string>) {
  const s = pptx.addSlide()
  addBackgroundImage(s, slide, images)

  if (slide.title) {
    s.addText(slide.title, { x: 0.8, y: 2, w: 8.4, h: 1.2, fontSize: 30, bold: true, color: COLORS.white, align: 'center', fontFace: 'Arial' })
  }
  if (slide.contact) {
    s.addText(slide.contact, { x: 1.5, y: 3.5, w: 7, h: 0.5, fontSize: 14, color: COLORS.muted, align: 'center', fontFace: 'Arial' })
  }
}

// Normalize legacy/unknown layout names to the closest known layout
function normalizeLayout(layout: string): string {
  const KNOWN = ['title', 'bullets', 'two-column', 'stats', 'quote', 'image-left', 'image-right', 'closing']
  if (KNOWN.includes(layout)) return layout
  if (layout === 'image-text') return 'image-right'
  if (layout === 'content' || layout === 'text') return 'bullets'
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

  for (const rawSlide of slides) {
    const slide = { ...rawSlide, layout: normalizeLayout(rawSlide.layout) }
    switch (slide.layout) {
      case 'title': addTitleSlide(pptx, slide, images); break
      case 'image-left': addImageLeftSlide(pptx, slide, images); break
      case 'image-right': addImageRightSlide(pptx, slide, images); break
      case 'bullets': addBulletsSlide(pptx, slide, images); break
      case 'two-column': addTwoColumnSlide(pptx, slide, images); break
      case 'stats': addStatsSlide(pptx, slide, images); break
      case 'quote': addQuoteSlide(pptx, slide, images); break
      case 'closing': addClosingSlide(pptx, slide, images); break
      default: addBulletsSlide(pptx, slide, images); break
    }
  }

  const filename = titulo.replace(/\s+/g, '-').toLowerCase()
  await pptx.writeFile({ fileName: `${filename}.pptx` })
}
