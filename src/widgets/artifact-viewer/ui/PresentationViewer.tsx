'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { exportToPptx } from '@/shared/lib/export-pptx'

interface Slide {
  layout: string
  title?: string
  subtitle?: string
  bullets?: string[]
  notes?: string
  left?: { heading: string; content: string }
  right?: { heading: string; content: string }
  stats?: { value: string; label: string }[]
  quote?: string
  author?: string
  contact?: string
  content?: string
  image_prompt?: string
}

interface ColorScheme {
  primary: string    // titles, accents
  secondary: string  // secondary accents
  background: string // slide background
  text: string       // body text
  muted: string      // subtle text
}

const DEFAULT_COLORS: ColorScheme = {
  primary: '#22d3ee',    // cyan-400
  secondary: '#c084fc',  // purple-400
  background: 'linear-gradient(135deg, #111827 0%, #1f2937 50%, #111827 100%)',
  text: 'rgba(255,255,255,0.85)',
  muted: 'rgba(255,255,255,0.45)',
}

function parseColorScheme(contenido: Record<string, unknown>): ColorScheme {
  const cs = contenido.color_scheme as Record<string, string> | undefined
  if (!cs) return DEFAULT_COLORS
  return {
    primary: cs.primary || DEFAULT_COLORS.primary,
    secondary: cs.secondary || DEFAULT_COLORS.secondary,
    background: cs.background
      ? (cs.background.includes('gradient') ? cs.background : `linear-gradient(135deg, ${cs.background} 0%, ${cs.background} 100%)`)
      : DEFAULT_COLORS.background,
    text: cs.text || DEFAULT_COLORS.text,
    muted: cs.muted || DEFAULT_COLORS.muted,
  }
}

// Global cache — persists across slide navigation and re-renders
const imageCache = new Map<string, string>()

// Simple component to render a cached image (no fetching — images are pre-loaded)
function SlideImage({ prompt, className = '' }: { prompt: string; className?: string }) {
  const url = imageCache.get(prompt)
  if (!url) return null
  return (
    <div className={`overflow-hidden rounded-lg border border-white/[0.08] ${className}`}>
      <img src={url} alt="" className="w-full h-full object-cover" />
    </div>
  )
}

// === Batch image pre-loader (Gamma/Beautiful.ai pattern) ===
// Generates ALL images in parallel before the presentation is shown

async function generateSingleImage(prompt: string): Promise<{ prompt: string; url: string | null }> {
  if (imageCache.has(prompt)) return { prompt, url: imageCache.get(prompt)! }

  try {
    const res = await fetch('/api/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, aspectRatio: '16:9', quality: 'pro' }),
    })
    const data = await res.json()
    if (data.success && data.image) {
      imageCache.set(prompt, data.image)
      return { prompt, url: data.image }
    }
    return { prompt, url: null }
  } catch {
    return { prompt, url: null }
  }
}

function ImagePreloader({
  prompts,
  onComplete,
}: {
  prompts: string[]
  onComplete: () => void
}) {
  const [completed, setCompleted] = useState(0)
  const [currentPrompt, setCurrentPrompt] = useState('')
  const total = prompts.length

  useEffect(() => {
    if (prompts.length === 0) { onComplete(); return }

    let cancelled = false

    // Generate all images in parallel (max 3 concurrent to avoid rate limits)
    const queue = [...prompts]
    let done = 0

    async function processNext() {
      const prompt = queue.shift()
      if (!prompt || cancelled) return

      setCurrentPrompt(prompt)
      await generateSingleImage(prompt)
      if (cancelled) return
      done++
      setCompleted(done)

      if (done >= total) {
        onComplete()
      } else {
        await processNext()
      }
    }

    // Start 3 parallel workers
    const workers = Array.from({ length: Math.min(3, prompts.length) }, () => processNext())
    Promise.all(workers)

    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const progress = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-6">
      {/* Animated icon */}
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 border border-white/[0.08] flex items-center justify-center">
          <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
        </div>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center">
          <div className="w-3 h-3 border-2 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin" />
        </div>
      </div>

      {/* Title */}
      <div className="text-center">
        <h3 className="text-sm font-medium text-white/70 mb-1">Generando imágenes con IA</h3>
        <p className="text-xs text-white/30">
          {completed < total
            ? `Imagen ${completed + 1} de ${total} — Nano Banana Pro 4K`
            : 'Finalizando...'}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-64">
        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px] text-white/20">{completed}/{total}</span>
          <span className="text-[10px] text-white/20">{progress}%</span>
        </div>
      </div>

      {/* Current prompt preview */}
      {currentPrompt && (
        <p className="text-[10px] text-white/15 max-w-xs text-center truncate italic">
          &quot;{currentPrompt.slice(0, 60)}...&quot;
        </p>
      )}
    </div>
  )
}

interface PresentationViewerProps {
  contenido: Record<string, unknown>
  titulo: string
}

const KNOWN_LAYOUTS = ['title', 'bullets', 'two-column', 'stats', 'quote', 'image-left', 'image-right', 'closing']

function SlideRenderer({ slide, index, total, colors }: { slide: Slide; index: number; total: number; colors: ColorScheme }) {
  const hasImage = !!slide.image_prompt

  return (
    <div className="w-full aspect-video md:aspect-video rounded-xl border border-white/10 flex flex-col relative overflow-hidden" style={{ background: colors.background }}>
      {/* Slide number */}
      <div className="absolute bottom-2 right-3 md:bottom-3 md:right-4 text-white/20 text-[10px] md:text-xs z-10">
        {index + 1} / {total}
      </div>

      {/* Background image for bullets/stats/quote layouts */}
      {hasImage && !['image-left', 'image-right', 'title'].includes(slide.layout) && (
        <div className="absolute inset-0 z-0">
          <SlideImage prompt={slide.image_prompt!} className="w-full h-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/85 to-gray-900/60" />
        </div>
      )}

      {/* Content based on layout */}
      <div className="flex-1 flex flex-col justify-center px-4 py-4 md:px-10 md:py-8 relative z-[1]">

        {/* === TITLE === */}
        {slide.layout === 'title' && (
          <div className="flex items-center gap-8">
            <div className={`${hasImage ? 'flex-1' : 'w-full text-center'}`}>
              <h1 className="text-3xl font-bold mb-4" style={{ color: colors.primary }}>
                {slide.title}
              </h1>
              {slide.subtitle && (
                <p className="text-lg" style={{ color: colors.muted }}>{slide.subtitle}</p>
              )}
            </div>
            {hasImage && (
              <SlideImage prompt={slide.image_prompt!} className="w-[45%] aspect-[4/3] shrink-0" />
            )}
          </div>
        )}

        {/* === IMAGE-LEFT === */}
        {slide.layout === 'image-left' && (
          <div className="flex items-center gap-8 h-full">
            {hasImage && (
              <SlideImage prompt={slide.image_prompt!} className="w-[45%] aspect-[4/3] shrink-0" />
            )}
            <div className="flex-1 flex flex-col justify-center">
              <h2 className="text-2xl font-semibold mb-4" style={{ color: colors.text }}>{slide.title}</h2>
              {slide.content && <p className="text-sm leading-relaxed" style={{ color: colors.muted }}>{slide.content}</p>}
              {slide.bullets && (
                <ul className="space-y-2 mt-3">
                  {slide.bullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm" style={{ color: colors.muted }}>
                      <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: colors.primary }} />
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* === IMAGE-RIGHT === */}
        {slide.layout === 'image-right' && (
          <div className="flex items-center gap-8 h-full">
            <div className="flex-1 flex flex-col justify-center">
              <h2 className="text-2xl font-semibold mb-4" style={{ color: colors.text }}>{slide.title}</h2>
              {slide.content && <p className="text-sm leading-relaxed" style={{ color: colors.muted }}>{slide.content}</p>}
              {slide.bullets && (
                <ul className="space-y-2 mt-3">
                  {slide.bullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm" style={{ color: colors.muted }}>
                      <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: colors.secondary }} />
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {hasImage && (
              <SlideImage prompt={slide.image_prompt!} className="w-[45%] aspect-[4/3] shrink-0" />
            )}
          </div>
        )}

        {/* === BULLETS === */}
        {slide.layout === 'bullets' && (
          <div>
            <h2 className="text-2xl font-semibold mb-6" style={{ color: colors.primary }}>{slide.title}</h2>
            <ul className="space-y-3">
              {slide.bullets?.map((bullet, i) => (
                <li key={i} className="flex items-start gap-3" style={{ color: colors.text }}>
                  <span className="w-2 h-2 rounded-full mt-2 shrink-0" style={{ backgroundColor: colors.secondary }} />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* === TWO-COLUMN === */}
        {slide.layout === 'two-column' && (
          <div>
            <h2 className="text-2xl font-semibold mb-6" style={{ color: colors.primary }}>{slide.title}</h2>
            <div className="grid grid-cols-2 gap-6">
              {slide.left && (
                <div className="rounded-lg p-5 border border-white/10" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                  <h3 className="text-sm font-semibold mb-2" style={{ color: colors.primary }}>{slide.left.heading}</h3>
                  <p className="text-sm" style={{ color: colors.muted }}>{slide.left.content}</p>
                </div>
              )}
              {slide.right && (
                <div className="rounded-lg p-5 border border-white/10" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                  <h3 className="text-sm font-semibold mb-2" style={{ color: colors.secondary }}>{slide.right.heading}</h3>
                  <p className="text-sm" style={{ color: colors.muted }}>{slide.right.content}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* === STATS === */}
        {slide.layout === 'stats' && (
          <div>
            <h2 className="text-2xl font-semibold mb-8 text-center" style={{ color: colors.primary }}>{slide.title}</h2>
            <div className="flex justify-center gap-8">
              {slide.stats?.map((stat, i) => (
                <div key={i} className="text-center backdrop-blur-sm rounded-xl px-6 py-4 border border-white/[0.08]" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                  <div className="text-4xl font-bold" style={{ color: colors.primary }}>
                    {stat.value}
                  </div>
                  <div className="text-sm mt-1" style={{ color: colors.muted }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* === QUOTE === */}
        {slide.layout === 'quote' && (
          <div className="text-center px-8">
            <div className="text-4xl mb-2" style={{ color: colors.primary, opacity: 0.3 }}>&ldquo;</div>
            <p className="text-xl italic leading-relaxed" style={{ color: colors.text }}>
              {slide.quote}
            </p>
            {slide.author && (
              <p className="text-sm mt-4" style={{ color: colors.muted }}>— {slide.author}</p>
            )}
          </div>
        )}

        {/* === CLOSING === */}
        {slide.layout === 'closing' && (
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4" style={{ color: colors.primary }}>{slide.title}</h1>
            {slide.contact && (
              <p style={{ color: colors.muted }}>{slide.contact}</p>
            )}
          </div>
        )}

        {/* === FALLBACK === */}
        {!KNOWN_LAYOUTS.includes(slide.layout) && (
          <div className={`${hasImage ? 'flex items-center gap-8' : ''}`}>
            <div className="flex-1">
              <h2 className="text-2xl font-semibold text-white/90 mb-4">{slide.title}</h2>
              {slide.content && <p className="text-white/70">{slide.content}</p>}
              {slide.bullets && (
                <ul className="space-y-2 mt-4">
                  {slide.bullets.map((b, i) => (
                    <li key={i} className="text-white/70 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {hasImage && (
              <SlideImage prompt={slide.image_prompt!} className="w-[40%] aspect-[4/3] shrink-0" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function PresentationViewer({ contenido, titulo }: PresentationViewerProps) {
  const slides = (Array.isArray(contenido.slides) ? contenido.slides : []) as Slide[]
  const colors = useMemo(() => parseColorScheme(contenido), [contenido])
  const [currentSlide, setCurrentSlide] = useState(0)
  const [exporting, setExporting] = useState(false)

  // Extract unique image prompts from all slides
  const imagePrompts = useMemo(() => {
    const prompts: string[] = []
    for (const slide of slides) {
      if (slide.image_prompt && !prompts.includes(slide.image_prompt)) {
        prompts.push(slide.image_prompt)
      }
    }
    return prompts
  }, [slides])

  // Phase: 'loading' (preloading images) or 'ready' (show presentation)
  const allCached = imagePrompts.every(p => imageCache.has(p))
  const [phase, setPhase] = useState<'loading' | 'ready'>(
    imagePrompts.length === 0 || allCached ? 'ready' : 'loading'
  )

  const handleDownload = async () => {
    setExporting(true)
    try {
      await exportToPptx(contenido as Record<string, unknown>, titulo)
    } catch (err) {
      console.error('Error exporting PPTX:', err)
    } finally {
      setExporting(false)
    }
  }

  if (slides.length === 0) {
    return <div className="p-8 text-white/40 text-center">No hay slides para mostrar</div>
  }

  // Phase 1: Preload all images
  if (phase === 'loading') {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-6 py-3 border-b border-white/10">
          <div>
            <h2 className="text-lg font-medium text-white/90">{titulo}</h2>
            <span className="text-xs text-white/40">{slides.length} slides · preparando imágenes</span>
          </div>
          <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
            Presentación
          </span>
        </div>
        <ImagePreloader
          prompts={imagePrompts}
          onComplete={() => setPhase('ready')}
        />
      </div>
    )
  }

  // Phase 2: Show presentation (all images ready)
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/10">
        <div>
          <h2 className="text-lg font-medium text-white/90">{titulo}</h2>
          <span className="text-xs text-white/40">{slides.length} slides</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            disabled={exporting}
            className="text-xs px-2 py-1 rounded bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 transition-all disabled:opacity-40"
          >
            {exporting ? 'Exportando...' : 'Descargar .pptx'}
          </button>
          <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
            Presentación
          </span>
        </div>
      </div>

      {/* Slide display */}
      <div className="flex-1 overflow-y-auto p-3 md:p-6">
        <div className="max-w-4xl mx-auto">
          <SlideRenderer
            slide={slides[currentSlide]}
            index={currentSlide}
            total={slides.length}
            colors={colors}
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-2 md:gap-4 px-3 md:px-6 py-2 md:py-3 border-t border-white/10">
        <button
          onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
          disabled={currentSlide === 0}
          className="px-2 md:px-3 py-1.5 text-xs md:text-sm rounded bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          ←{' '}<span className="hidden sm:inline">Anterior</span>
        </button>

        <div className="flex items-center gap-1 md:gap-1.5 overflow-x-auto max-w-[40vw] md:max-w-none">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`w-2 h-2 rounded-full transition-all shrink-0 ${
                i === currentSlide ? 'bg-cyan-400 scale-125' : 'bg-white/20 hover:bg-white/40'
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))}
          disabled={currentSlide === slides.length - 1}
          className="px-2 md:px-3 py-1.5 text-xs md:text-sm rounded bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <span className="hidden sm:inline">Siguiente </span>→
        </button>
      </div>
    </div>
  )
}
