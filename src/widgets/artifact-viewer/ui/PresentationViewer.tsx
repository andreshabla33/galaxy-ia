'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { exportToPptx } from '@/shared/lib/export-pptx'
import { optimizePresentationSlides } from '@/shared/lib/presentation-layout-engine'
import { resolvePresentationColorScheme } from '@/shared/lib/presentation-theme-engine'
import { ThinkingIndicator } from '@/widgets/thinking-indicator'
import { useAppStore } from '@/features/settings/model/appStore'

interface Slide {
  layout: string
  title?: string
  subtitle?: string
  bullets?: string[]
  notes?: string
  left?: { heading: string; content: string; items?: string[] }
  right?: { heading: string; content: string; items?: string[] }
  stats?: { value: string; label: string }[]
  quote?: string
  author?: string
  contact?: string
  content?: string
  image_prompt?: string
  image_url?: string
  texture_url?: string
  overlay_opacity?: number
  focal_point?: string
  // New premium fields
  items?: { icon?: string; title: string; description: string }[]
  section_number?: number
  highlight_text?: string
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
  const resolved = resolvePresentationColorScheme(cs, JSON.stringify(contenido).slice(0, 400))
  return {
    primary: resolved.primary || DEFAULT_COLORS.primary,
    secondary: resolved.secondary || DEFAULT_COLORS.secondary,
    background: resolved.background || DEFAULT_COLORS.background,
    text: resolved.text || DEFAULT_COLORS.text,
    muted: resolved.muted || DEFAULT_COLORS.muted,
  }
}

// Global cache — persists across slide navigation and re-renders
const imageCache = new Map<string, string>()

function resolveSlideImage(slide: Slide): string | undefined {
  if (slide.image_url) return slide.image_url
  if (slide.image_prompt) return imageCache.get(slide.image_prompt)
  return undefined
}

// Simple component to render a slide image from url/prompt
function SlideImage({
  prompt,
  imageUrl,
  focalPoint,
  className = '',
}: {
  prompt?: string
  imageUrl?: string
  focalPoint?: string
  className?: string
}) {
  const url = imageUrl || (prompt ? imageCache.get(prompt) : undefined)
  if (!url) {
    return (
      <div className={`overflow-hidden rounded-lg border border-white/[0.08] bg-zinc-900/50 flex flex-col items-center justify-center p-4 text-center ${className}`}>
        <svg className="w-8 h-8 text-white/20 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="text-[10px] text-white/30 truncate w-full">Falta imagen (Revisa tu API Key de FAL)</span>
      </div>
    )
  }
  return (
    <div className={`overflow-hidden rounded-lg border border-white/[0.08] ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="w-full h-full object-cover" style={{ objectPosition: focalPoint || 'center center' }} />
    </div>
  )
}

// === Batch image pre-loader (Gamma/Beautiful.ai pattern) ===
// Generates ALL images in parallel before the presentation is shown

async function generateSingleImage(prompt: string, falApiKey?: string): Promise<{ prompt: string; url: string | null }> {
  if (imageCache.has(prompt)) return { prompt, url: imageCache.get(prompt)! }

  try {
    // Per-image timeout of 45 seconds to avoid hanging on slow/failing API
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 45000)

    const res = await fetch('/api/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, aspectRatio: '16:9', quality: 'pro', falApiKey }),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    const data = await res.json()
    if (data.success && data.image) {
      imageCache.set(prompt, data.image)
      return { prompt, url: data.image }
    }
    console.warn('[ImagePreloader] Image generation failed for prompt:', prompt.slice(0, 60), data.error)
    return { prompt, url: null }
  } catch (err) {
    console.warn('[ImagePreloader] Fetch error for prompt:', prompt.slice(0, 60), err instanceof Error ? err.message : err)
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
  const { falApiKey } = useAppStore()
  const [completed, setCompleted] = useState(0)
  const [currentPrompt, setCurrentPrompt] = useState('')
  const [failed, setFailed] = useState(0)
  const total = prompts.length

  useEffect(() => {
    if (prompts.length === 0) { onComplete(); return }

    let cancelled = false
    let consecutiveFailures = 0
    const MAX_CONSECUTIVE_FAILURES = 3 // Only declare API down after 3 consecutive failures

    // Safety timeout: show presentation after 90s regardless of image status
    const safetyTimer = setTimeout(() => {
      if (!cancelled) {
        console.warn('[ImagePreloader] Safety timeout reached (90s), showing presentation without all images')
        cancelled = true
        onComplete()
      }
    }, 90000)

    // Generate all images in parallel (max 3 concurrent to avoid rate limits)
    const queue = [...prompts]
    let done = 0
    let failCount = 0

    async function processNext() {
      while (queue.length > 0 && !cancelled) {
        // If too many consecutive failures, skip remaining images
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          console.warn(`[ImagePreloader] ${MAX_CONSECUTIVE_FAILURES} consecutive failures — skipping remaining ${queue.length} images`)
          done += queue.length
          failCount += queue.length
          setCompleted(done)
          setFailed(failCount)
          queue.length = 0
          break
        }

        const prompt = queue.shift()
        if (!prompt) break

        setCurrentPrompt(prompt)
        const result = await generateSingleImage(prompt, falApiKey)
        if (cancelled) return
        done++
        if (!result.url) {
          failCount++
          consecutiveFailures++
          setFailed(failCount)
        } else {
          // Success resets the consecutive failure counter
          consecutiveFailures = 0
        }
        setCompleted(done)
      }
    }

    // Start 3 parallel workers — onComplete fires when ALL workers finish
    const workers = Array.from({ length: Math.min(3, prompts.length) }, () => processNext())
    Promise.all(workers).then(() => {
      clearTimeout(safetyTimer)
      if (!cancelled) onComplete()
    }).catch(() => {
      // Even if something unexpected fails, still show the presentation
      clearTimeout(safetyTimer)
      if (!cancelled) onComplete()
    })

    return () => { cancelled = true; clearTimeout(safetyTimer) }
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
            ? `Imagen ${completed + 1} de ${total} — Nano Banana Pro`
            : 'Finalizando...'}
        </p>
        {failed > 0 && (
          <p className="text-xs text-amber-400/60 mt-1">
            {failed} imagen{failed > 1 ? 'es' : ''} no disponible{failed > 1 ? 's' : ''}
          </p>
        )}
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

      {/* Skip button — always available */}
      <button
        onClick={onComplete}
        className="text-xs px-4 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-white/40 hover:bg-white/[0.08] hover:text-white/60 transition-all mt-2"
      >
        Omitir imágenes y ver presentación
      </button>
    </div>
  )
}

interface PresentationViewerProps {
  contenido: Record<string, unknown>
  titulo: string
}

const KNOWN_LAYOUTS = [
  'title', 'bullets', 'two-column', 'stats', 'quote', 'image-left', 'image-right', 'closing', 
  'full-image', 'icon-grid', 'timeline', 'section-divider', 'bento-grid', 'comparison', 'chart',
  'photo-quote', 'product-mockup', 'split-spotlight', 'orbit-stats'
]

// Normalize legacy/unknown layout names to the closest known layout
function normalizeLayout(layout: string): string {
  if (KNOWN_LAYOUTS.includes(layout)) return layout
  if (layout === 'image-text') return 'image-right'
  if (layout === 'content' || layout === 'text') return 'bullets'
  if (layout === 'divider' || layout === 'separator') return 'section-divider'
  if (layout === 'features' || layout === 'grid') return 'icon-grid'
  if (layout === 'bento') return 'bento-grid'
  if (layout === 'roadmap' || layout === 'process') return 'timeline'
  if (layout === 'hero' || layout === 'splash') return 'full-image'
  if (layout === 'quote-photo' || layout === 'photo_quote') return 'photo-quote'
  if (layout === 'mockup' || layout === 'device-mockup') return 'product-mockup'
  if (layout === 'spotlight' || layout === 'split-hero') return 'split-spotlight'
  if (layout === 'radial-stats' || layout === 'kpi-orbit') return 'orbit-stats'
  return layout
}

// ═══════════════════════════════════════════════════════════════
// DECORATIVE ELEMENTS — give slides depth and visual richness
// ═══════════════════════════════════════════════════════════════

function DecoOrbs({ primary, secondary }: { primary: string; secondary: string }) {
  return (
    <>
      <div className="absolute -top-[20%] -right-[10%] w-[45%] aspect-square rounded-full opacity-[0.07] blur-[80px] pointer-events-none" style={{ background: primary }} />
      <div className="absolute -bottom-[15%] -left-[10%] w-[35%] aspect-square rounded-full opacity-[0.05] blur-[60px] pointer-events-none" style={{ background: secondary }} />
      {/* Radial center glow for depth */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] aspect-square rounded-full opacity-[0.03] blur-[100px] pointer-events-none" style={{ background: `radial-gradient(circle, ${primary} 0%, transparent 70%)` }} />
    </>
  )
}

function SlideNumber({ index, total, muted }: { index: number; total: number; muted: string }) {
  return (
    <div className="absolute top-3 right-4 md:top-4 md:right-5 z-10 flex items-center gap-1.5">
      <div className="h-px w-6 opacity-30" style={{ backgroundColor: muted }} />
      <span className="text-[10px] md:text-[11px] font-medium tracking-widest opacity-40" style={{ color: muted }}>
        {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
      </span>
    </div>
  )
}

function GlassCard({ children, className = '', delay = 0, style }: { children: React.ReactNode; className?: string; delay?: number; style?: React.CSSProperties }) {
  return (
    <div className={`relative rounded-2xl border border-white/[0.12] backdrop-blur-md overflow-hidden animate-scale-in shadow-xl shadow-black/30 ${className}`}
      style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)', animationDelay: `${delay}ms`, opacity: 0, ...style }}>
      {/* Top highlight for glass effect */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="relative z-10">{children}</div>
    </div>
  )
}

function BulletItem({ text, color, index }: { text: string; color: string; index: number }) {
  // Bold the first phrase (up to first colon, dash, or period) for visual hierarchy
  const separatorIdx = text.search(/[:\-–—.]/);
  const hasSeparator = separatorIdx > 0 && separatorIdx < text.length * 0.6;
  return (
    <li className="flex items-start gap-4 group animate-fade-in-up opacity-0" style={{ animationDelay: `${index * 80 + 100}ms` }}>
      <span className="relative mt-[8px] shrink-0">
        <span className="block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
        <span className="absolute inset-0 w-2.5 h-2.5 rounded-full opacity-60 blur-[4px]" style={{ backgroundColor: color }} />
      </span>
      <span className="text-base md:text-[17px] leading-relaxed">
        {hasSeparator ? (
          <><span className="font-semibold text-white/95">{text.slice(0, separatorIdx + 1)}</span><span className="opacity-85">{text.slice(separatorIdx + 1)}</span></>
        ) : (
          <span className="opacity-90">{text}</span>
        )}
      </span>
    </li>
  )
}

// ═══════════════════════════════════════════════════════════════
// SLIDE RENDERER — Premium visual quality per layout
// ═══════════════════════════════════════════════════════════════

function SlideRenderer({ slide: rawSlide, index, total, colors, isTransitioning }: { slide: Slide; index: number; total: number; colors: ColorScheme; isTransitioning?: boolean }) {
  const slide = useMemo(() => ({ ...rawSlide, layout: normalizeLayout(rawSlide.layout) }), [rawSlide])
  const imageUrl = resolveSlideImage(slide)
  const hasImage = !!imageUrl

  const slideStyle: React.CSSProperties = {
    background: colors.background,
    fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
    transition: 'opacity 0.3s ease, transform 0.3s ease',
    opacity: isTransitioning ? 0 : 1,
    transform: isTransitioning ? 'translateY(8px)' : 'translateY(0)',
  }

  return (
    <div className="w-full aspect-video rounded-3xl border border-white/[0.12] flex flex-col relative overflow-hidden shadow-2xl shadow-black/50" style={slideStyle}>
      <DecoOrbs primary={colors.primary} secondary={colors.secondary} />
      
      {/* Premium subtle dot grid pattern in background */}
      <div className="absolute inset-0 z-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
      {slide.texture_url && (
        <div className="absolute inset-0 z-0 opacity-[0.09] mix-blend-soft-light pointer-events-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={slide.texture_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      <SlideNumber index={index} total={total} muted={colors.muted} />

      {/* Background image overlay for content-heavy layouts */}
      {hasImage && !['image-left', 'image-right', 'title'].includes(slide.layout) && (
        <div className="absolute inset-0 z-0">
          <SlideImage imageUrl={imageUrl} focalPoint={slide.focal_point} className="w-full h-full !rounded-none !border-0" />
          <div className="absolute inset-0" style={{
            background: `linear-gradient(to top, rgba(0,0,0,${slide.overlay_opacity ?? 0.92}) 0%, rgba(0,0,0,0.72) 40%, rgba(0,0,0,0.45) 100%)`
          }} />
        </div>
      )}

      {/* ── CONTENT ── */}
      <div className="flex-1 flex flex-col justify-center px-8 py-6 md:px-16 md:py-12 relative z-[1]">

        {/* ════ TITLE SLIDE ════ */}
        {slide.layout === 'title' && (
          <div className={`flex items-center ${hasImage ? 'gap-10' : ''} h-full`}>
            <div className={`flex flex-col justify-center animate-fade-in-up opacity-0 ${hasImage ? 'flex-1' : 'w-full items-center text-center'}`} style={{ animationDelay: '100ms' }}>
              <div className={`h-1.5 rounded-full mb-10 opacity-90 shadow-lg shadow-black/20 ${hasImage ? 'w-20' : 'w-24 mx-auto'}`} style={{ background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})` }} />
              <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold leading-[1.1] tracking-tight mb-8 text-balance" style={{ color: colors.primary }}>
                {slide.title}
              </h1>
              {slide.subtitle && (
                <p className="text-lg md:text-xl lg:text-2xl leading-relaxed max-w-3xl text-balance font-light" style={{ color: colors.muted }}>
                  {slide.subtitle}
                </p>
              )}
            </div>
            {hasImage && (
              <div className="w-[45%] shrink-0 relative animate-scale-in opacity-0" style={{ animationDelay: '200ms' }}>
                <div className="absolute -inset-4 rounded-[2rem] opacity-25 blur-2xl" style={{ background: colors.primary }} />
                <SlideImage imageUrl={imageUrl} focalPoint={slide.focal_point} className="relative aspect-[4/3] !rounded-[1.5rem] shadow-2xl shadow-black/40 ring-1 ring-white/10" />
              </div>
            )}
          </div>
        )}

        {/* ════ IMAGE-LEFT ════ */}
        {slide.layout === 'image-left' && (
          <div className="flex items-center gap-6 md:gap-10 h-full">
            {hasImage && (
              <div className="w-[42%] shrink-0 relative">
                <div className="absolute -inset-2 rounded-2xl opacity-15 blur-lg" style={{ background: colors.primary }} />
                <SlideImage imageUrl={imageUrl} focalPoint={slide.focal_point} className="relative aspect-[4/3] !rounded-2xl shadow-lg shadow-black/20" />
              </div>
            )}
            <div className="flex-1 flex flex-col justify-center min-w-0">
              <h2 className="text-xl md:text-2xl font-bold mb-3 tracking-tight" style={{ color: colors.text }}>{slide.title}</h2>
              {slide.content && <p className="text-sm leading-relaxed mb-4" style={{ color: colors.muted }}>{slide.content}</p>}
              {slide.bullets && (
                <ul className="space-y-2.5" style={{ color: colors.muted }}>
                  {slide.bullets.map((b, i) => <BulletItem key={i} text={b} color={colors.primary} index={i} />)}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* ════ IMAGE-RIGHT ════ */}
        {slide.layout === 'image-right' && (
          <div className="flex items-center gap-6 md:gap-10 h-full">
            <div className="flex-1 flex flex-col justify-center min-w-0">
              <h2 className="text-xl md:text-2xl font-bold mb-3 tracking-tight" style={{ color: colors.text }}>{slide.title}</h2>
              {slide.content && <p className="text-sm leading-relaxed mb-4" style={{ color: colors.muted }}>{slide.content}</p>}
              {slide.bullets && (
                <ul className="space-y-2.5" style={{ color: colors.muted }}>
                  {slide.bullets.map((b, i) => <BulletItem key={i} text={b} color={colors.secondary} index={i} />)}
                </ul>
              )}
            </div>
            {hasImage && (
              <div className="w-[42%] shrink-0 relative">
                <div className="absolute -inset-2 rounded-2xl opacity-15 blur-lg" style={{ background: colors.secondary }} />
                <SlideImage imageUrl={imageUrl} focalPoint={slide.focal_point} className="relative aspect-[4/3] !rounded-2xl shadow-lg shadow-black/20" />
              </div>
            )}
          </div>
        )}

        {/* ════ BULLETS ════ */}
        {slide.layout === 'bullets' && (
          <div className="max-w-3xl">
            <h2 className="text-2xl md:text-3xl font-bold mb-6 tracking-tight animate-fade-in-up opacity-0" style={{ color: colors.primary }}>{slide.title}</h2>
            <ul className="space-y-4" style={{ color: colors.text }}>
              {slide.bullets?.map((bullet, i) => <BulletItem key={i} text={bullet} color={colors.secondary} index={i} />)}
            </ul>
          </div>
        )}

        {/* ════ TWO-COLUMN ════ */}
        {slide.layout === 'two-column' && (
          <div>
            <h2 className="text-xl md:text-2xl font-bold mb-6 tracking-tight" style={{ color: colors.primary }}>{slide.title}</h2>
            <div className="grid grid-cols-2 gap-4 md:gap-6">
              {slide.left && (
                <GlassCard className="p-5 md:p-6">
                  <div className="w-8 h-1 rounded-full mb-3" style={{ backgroundColor: colors.primary }} />
                  <h3 className="text-sm font-bold mb-2 tracking-tight" style={{ color: colors.primary }}>{slide.left.heading}</h3>
                  <p className="text-xs md:text-sm leading-relaxed" style={{ color: colors.muted }}>{slide.left.content}</p>
                </GlassCard>
              )}
              {slide.right && (
                <GlassCard className="p-5 md:p-6">
                  <div className="w-8 h-1 rounded-full mb-3" style={{ backgroundColor: colors.secondary }} />
                  <h3 className="text-sm font-bold mb-2 tracking-tight" style={{ color: colors.secondary }}>{slide.right.heading}</h3>
                  <p className="text-xs md:text-sm leading-relaxed" style={{ color: colors.muted }}>{slide.right.content}</p>
                </GlassCard>
              )}
            </div>
          </div>
        )}

        {/* ════ STATS ════ */}
        {slide.layout === 'stats' && (
          <div>
            <h2 className="text-xl md:text-2xl font-bold mb-8 text-center tracking-tight" style={{ color: colors.primary }}>{slide.title}</h2>
            <div className="flex justify-center gap-4 md:gap-6 flex-wrap">
              {slide.stats?.map((stat, i) => (
                <GlassCard key={i} className="text-center px-6 py-5 md:px-8 md:py-6 min-w-[120px]">
                  <div className="text-3xl md:text-4xl font-extrabold tracking-tight" style={{ color: colors.primary }}>
                    {stat.value}
                  </div>
                  <div className="w-6 h-0.5 rounded-full mx-auto my-2 opacity-30" style={{ backgroundColor: colors.secondary }} />
                  <div className="text-xs md:text-sm font-medium uppercase tracking-wider" style={{ color: colors.muted }}>{stat.label}</div>
                </GlassCard>
              ))}
            </div>
          </div>
        )}

        {/* ════ QUOTE ════ */}
        {slide.layout === 'quote' && (
          <div className="flex flex-col items-center justify-center text-center px-8 md:px-16">
            <div className="text-6xl md:text-7xl font-serif leading-none -mb-2" style={{ color: colors.primary, opacity: 0.2 }}>&ldquo;</div>
            <GlassCard className="px-8 py-6 md:px-12 md:py-8 max-w-2xl">
              <p className="text-base md:text-xl italic leading-relaxed" style={{ color: colors.text }}>
                {slide.quote}
              </p>
              {slide.author && (
                <>
                  <div className="w-10 h-0.5 rounded-full mx-auto my-4" style={{ background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})` }} />
                  <p className="text-xs md:text-sm font-semibold uppercase tracking-widest" style={{ color: colors.muted }}>
                    {slide.author}
                  </p>
                </>
              )}
            </GlassCard>
          </div>
        )}

        {/* ════ CLOSING ════ */}
        {slide.layout === 'closing' && (
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-16 h-1 rounded-full mb-8" style={{ background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})` }} />
            <h1 className="text-2xl md:text-4xl font-bold tracking-tight mb-4" style={{ color: colors.primary }}>{slide.title}</h1>
            {slide.contact && (
              <GlassCard className="px-6 py-3 mt-2">
                <p className="text-sm font-medium" style={{ color: colors.muted }}>{slide.contact}</p>
              </GlassCard>
            )}
          </div>
        )}

        {/* ════ FULL-IMAGE (NEW) ════ */}
        {slide.layout === 'full-image' && (
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-16 md:pb-24 z-[2]">
            {/* Full-bleed background image */}
            {hasImage && (
              <div className="absolute inset-0 z-0 animate-scale-in opacity-0" style={{ animationDuration: '1.2s' }}>
                <SlideImage imageUrl={imageUrl} focalPoint={slide.focal_point} className="w-full h-full !rounded-none !border-0" />
                <div className="absolute inset-0" style={{
                  background: `linear-gradient(to top, rgba(0,0,0,${slide.overlay_opacity ?? 0.95}) 0%, rgba(0,0,0,0.6) 35%, rgba(0,0,0,0.15) 100%)`
                }} />
              </div>
            )}

            {/* Highlight text — large and dramatic */}
            {slide.highlight_text && (
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-center px-10 mb-4 leading-tight relative z-10 animate-fade-in-up opacity-0 drop-shadow-2xl text-balance" style={{ color: '#ffffff', animationDelay: '300ms' }}>
                {slide.highlight_text}
              </h1>
            )}
            {slide.title && !slide.highlight_text && (
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-center px-10 mb-4 relative z-10 animate-fade-in-up opacity-0 drop-shadow-xl text-balance" style={{ color: '#ffffff', animationDelay: '300ms' }}>
                {slide.title}
              </h1>
            )}
            {slide.title && slide.highlight_text && (
              <p className="text-lg md:text-xl text-center px-10 relative z-10 animate-fade-in-up opacity-0 max-w-3xl text-balance" style={{ color: 'rgba(255,255,255,0.7)', animationDelay: '500ms' }}>
                {slide.title}
              </p>
            )}
            {slide.bullets && slide.bullets.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2.5 justify-center px-6 relative z-10 max-w-4xl">
                {slide.bullets.slice(0, 3).map((b, i) => (
                  <span
                    key={i}
                    className="text-[11px] md:text-xs px-3 py-1.5 rounded-full border border-white/20 bg-black/35 text-white/85 backdrop-blur-sm animate-fade-in-up opacity-0"
                    style={{ animationDelay: `${560 + i * 120}ms` }}
                  >
                    {b}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════ PHOTO-QUOTE (Canva-like) ════ */}
        {slide.layout === 'photo-quote' && (
          <div className="absolute inset-0 z-[2]">
            {hasImage && (
              <div className="absolute inset-0">
                <SlideImage imageUrl={imageUrl} focalPoint={slide.focal_point} className="w-full h-full !rounded-none !border-0" />
                <div className="absolute inset-0" style={{ background: `linear-gradient(105deg, rgba(0,0,0,${slide.overlay_opacity ?? 0.78}) 0%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0.2) 100%)` }} />
              </div>
            )}
            <div className="relative h-full flex flex-col justify-end px-10 md:px-16 pb-12 md:pb-16 max-w-4xl">
              {slide.quote && (
                <p className="text-2xl md:text-4xl lg:text-5xl font-semibold leading-tight text-white drop-shadow-xl text-balance">
                  &ldquo;{slide.quote}&rdquo;
                </p>
              )}
              {slide.author && (
                <p className="mt-5 text-sm md:text-base uppercase tracking-[0.18em] text-white/75">{slide.author}</p>
              )}
            </div>
          </div>
        )}

        {/* ════ ICON-GRID (NEW) ════ */}
        {slide.layout === 'icon-grid' && (
          <div>
            <h2 className="text-xl md:text-2xl font-bold mb-8 tracking-tight" style={{ color: colors.primary }}>{slide.title}</h2>
            <div className={`grid gap-4 md:gap-5 ${(slide.items?.length || 0) >= 4 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-1 md:grid-cols-3'}`}>
              {slide.items?.map((item, i) => (
                <GlassCard key={i} className="p-5 md:p-6 text-center">
                  <div className="text-3xl mb-3">{item.icon || '●'}</div>
                  <h3 className="text-sm font-bold mb-2 tracking-tight" style={{ color: colors.text }}>{item.title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: colors.muted }}>{item.description}</p>
                  <div className="w-6 h-0.5 rounded-full mx-auto mt-3 opacity-50" style={{ background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})` }} />
                </GlassCard>
              ))}
            </div>
          </div>
        )}

        {/* ════ TIMELINE (NEW) ════ */}
        {slide.layout === 'timeline' && (
          <div>
            <h2 className="text-xl md:text-2xl font-bold mb-8 tracking-tight" style={{ color: colors.primary }}>{slide.title}</h2>
            <div className="relative">
              {/* Horizontal connector line */}
              <div className="absolute top-4 left-0 right-0 h-px opacity-20" style={{ backgroundColor: colors.primary }} />
              <div className={`grid gap-3 md:gap-4 ${(slide.items?.length || 0) >= 5 ? 'grid-cols-5' : (slide.items?.length || 0) >= 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
                {slide.items?.map((item, i) => (
                  <div key={i} className="flex flex-col items-center text-center relative">
                    {/* Dot on the line */}
                    <div className="relative z-10 mb-4">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.primary }} />
                      <div className="absolute inset-0 w-3 h-3 rounded-full opacity-40 blur-[4px]" style={{ backgroundColor: colors.primary }} />
                    </div>
                    <GlassCard className="p-3 md:p-4 w-full">
                      <h4 className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: colors.primary }}>{item.title}</h4>
                      <p className="text-[11px] md:text-xs leading-relaxed" style={{ color: colors.muted }}>{item.description}</p>
                    </GlassCard>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ════ SECTION-DIVIDER (NEW) ════ */}
        {slide.layout === 'section-divider' && (
          <div className="flex flex-col items-center justify-center text-center h-full relative">
            {slide.section_number && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[12rem] md:text-[16rem] font-bold opacity-[0.03] pointer-events-none select-none z-0" style={{ color: colors.primary }}>
                {String(slide.section_number).padStart(2, '0')}
              </div>
            )}
            <div className="w-20 h-1.5 rounded-full mb-8 relative z-10 animate-scale-in opacity-0" style={{ background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})` }} />
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-5 relative z-10 animate-fade-in-up opacity-0 drop-shadow-lg text-balance" style={{ color: colors.text, animationDelay: '100ms' }}>{slide.title}</h1>
            {slide.subtitle && (
              <p className="text-base md:text-lg max-w-2xl relative z-10 animate-fade-in-up opacity-0 text-balance" style={{ color: colors.muted, animationDelay: '300ms' }}>{slide.subtitle}</p>
            )}
          </div>
        )}

        {/* ════ BENTO-GRID (NEW) ════ */}
        {slide.layout === 'bento-grid' && (
          <div className="h-full flex flex-col pt-2 md:pt-4">
            {slide.title && <h2 className="text-2xl md:text-4xl font-bold mb-6 tracking-tight animate-fade-in-up opacity-0" style={{ color: colors.primary }}>{slide.title}</h2>}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 flex-1 h-full pb-4">
              {slide.items?.map((item, i) => {
                const total = slide.items?.length || 0;
                // Asymmetrical grid logic: First item is large, 4th item is wide if there are 4 items, etc.
                const isFirst = i === 0;
                const isWide = (total === 4 && i === 3) || (total === 5 && i === 3) || (total === 5 && i === 4);
                
                return (
                  <GlassCard key={i} delay={i * 100} className={`p-5 flex flex-col justify-start hover:-translate-y-1 transition-transform ${isFirst ? 'md:col-span-2 md:row-span-2' : ''} ${isWide ? 'md:col-span-2' : ''}`}>
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center text-xl md:text-2xl mb-4 bg-white/[0.05] border border-white/10 shrink-0`} style={{ color: colors.primary }}>
                      {item.icon || '✨'}
                    </div>
                    <h3 className={`font-bold text-white/95 mb-2 ${isFirst ? 'text-xl md:text-2xl' : 'text-base md:text-lg'}`}>{item.title}</h3>
                    <p className={`text-white/60 leading-relaxed text-balance ${isFirst ? 'text-sm md:text-base' : 'text-xs md:text-sm'}`}>{item.description}</p>
                  </GlassCard>
                )
              })}
            </div>
          </div>
        )}

        {/* ════ COMPARISON (NEW) ════ */}
        {slide.layout === 'comparison' && (
          <div className="flex flex-col h-full pt-4">
            {slide.title && <h2 className="text-2xl md:text-4xl font-bold mb-8 tracking-tight text-center animate-fade-in-up opacity-0" style={{ color: colors.primary }}>{slide.title}</h2>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 flex-1 items-center pb-8">
              {slide.left && (
                <GlassCard delay={100} className="p-6 md:p-8 flex flex-col border border-white/[0.05] !bg-zinc-900/40 opacity-80 scale-95 origin-right">
                  <h3 className="text-xl md:text-2xl font-bold text-white/60 mb-4">{slide.left.heading}</h3>
                  <p className="text-white/40 mb-6 leading-relaxed flex-1">{slide.left.content}</p>
                  {slide.left.items && (
                    <ul className="space-y-3">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {slide.left.items.map((it: any, i: number) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-white/40"><span className="text-red-400/60 mt-0.5">✕</span> <span className="flex-1">{it}</span></li>
                      ))}
                    </ul>
                  )}
                </GlassCard>
              )}
              {slide.right && (
                <GlassCard delay={200} className="p-6 md:p-8 flex flex-col shadow-2xl shadow-indigo-500/10 border border-indigo-500/20 md:scale-105 origin-left z-10" style={{ background: `linear-gradient(135deg, ${colors.primary}15 0%, transparent 100%)` }}>
                  <div className="absolute -top-10 -right-10 w-32 h-32 blur-3xl opacity-20" style={{ background: colors.primary }} />
                  <h3 className="text-xl md:text-3xl font-bold mb-4" style={{ color: colors.primary }}>{slide.right.heading}</h3>
                  <p className="text-white/90 mb-6 leading-relaxed flex-1 text-lg">{slide.right.content}</p>
                  {slide.right.items && (
                    <ul className="space-y-3">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {slide.right.items.map((it: any, i: number) => (
                        <li key={i} className="flex items-start gap-3 text-base text-white/80"><span style={{ color: colors.secondary }} className="mt-0.5">✓</span> <span className="flex-1">{it}</span></li>
                      ))}
                    </ul>
                  )}
                </GlassCard>
              )}
            </div>
          </div>
        )}

        {/* ════ CHART (NEW) ════ */}
        {slide.layout === 'chart' && (
          <div className="flex flex-col h-full pt-4 w-full md:w-5/6 mx-auto">
            {slide.title && <h2 className="text-2xl md:text-4xl font-bold mb-10 tracking-tight animate-fade-in-up opacity-0 text-center" style={{ color: colors.primary }}>{slide.title}</h2>}
            <div className="flex flex-col gap-8 justify-center flex-1 pb-10">
              {slide.stats?.map((stat, i) => {
                // Parse percentage from value. If it's pure number, use it. Max 100%.
                const numMatch = stat.value.match(/(\d+(?:\.\d+)?)/);
                const percent = numMatch ? Math.min(100, Math.max(5, parseFloat(numMatch[1]))) : 50;
                return (
                  <div key={i} className="animate-fade-in-up opacity-0" style={{ animationDelay: `${i * 150 + 100}ms` }}>
                    <div className="flex justify-between mb-3 items-end">
                      <span className="text-white/80 font-medium text-sm md:text-lg">{stat.label}</span>
                      <span className="font-bold text-2xl md:text-3xl leading-none" style={{ color: colors.primary }}>{stat.value}</span>
                    </div>
                    <div className="h-3 md:h-4 w-full bg-white/[0.05] rounded-full overflow-hidden shadow-inner">
                      <div className="h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(255,255,255,0.3)]" style={{ width: '0%', animation: `growWidth 1.5s ease-out forwards ${i * 150 + 300}ms`, background: `linear-gradient(90deg, ${colors.secondary}, ${colors.primary})` }} />
                      <style>{`@keyframes growWidth { to { width: ${percent}%; } }`}</style>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ════ PRODUCT-MOCKUP (Canva-like) ════ */}
        {slide.layout === 'product-mockup' && (
          <div className="grid grid-cols-2 gap-8 md:gap-12 items-center h-full">
            <div className="min-w-0">
              {slide.title && (
                <h2 className="text-2xl md:text-4xl font-bold tracking-tight mb-4 text-balance" style={{ color: colors.primary }}>
                  {slide.title}
                </h2>
              )}
              {slide.content && (
                <p className="text-sm md:text-lg leading-relaxed mb-5" style={{ color: colors.muted }}>
                  {slide.content}
                </p>
              )}
              {slide.bullets && (
                <ul className="space-y-2.5">
                  {slide.bullets.map((b, i) => <BulletItem key={i} text={b} color={colors.secondary} index={i} />)}
                </ul>
              )}
            </div>

            <div className="relative flex justify-center">
              <div className="absolute -inset-6 blur-3xl opacity-25" style={{ background: `radial-gradient(circle, ${colors.primary} 0%, transparent 70%)` }} />
              <div className="relative w-[75%] max-w-[360px] rounded-[2rem] bg-zinc-900 border border-white/20 p-2 shadow-2xl shadow-black/50">
                <div className="w-16 h-1 mx-auto rounded-full bg-white/20 mb-2" />
                <div className="rounded-[1.5rem] overflow-hidden border border-white/10 aspect-[9/19] bg-black">
                  {hasImage ? (
                    <SlideImage imageUrl={imageUrl} focalPoint={slide.focal_point} className="w-full h-full !rounded-none !border-0" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-white/40">Sin mockup</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════ SPLIT-SPOTLIGHT (Gamma-like) ════ */}
        {slide.layout === 'split-spotlight' && (
          <div className="grid grid-cols-2 gap-8 md:gap-12 items-center h-full">
            <div className="relative h-full min-h-[280px]">
              {hasImage ? (
                <>
                  <div className="absolute -inset-4 blur-2xl opacity-20" style={{ background: colors.primary }} />
                  <SlideImage imageUrl={imageUrl} focalPoint={slide.focal_point} className="relative h-full min-h-[280px] !rounded-3xl shadow-2xl ring-1 ring-white/10" />
                </>
              ) : (
                <GlassCard className="h-full p-8 flex items-center justify-center text-white/50">Sin visual</GlassCard>
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl md:text-4xl font-bold tracking-tight mb-5 text-balance" style={{ color: colors.primary }}>
                {slide.title}
              </h2>
              {slide.content && (
                <p className="text-sm md:text-lg leading-relaxed mb-5" style={{ color: colors.muted }}>
                  {slide.content}
                </p>
              )}
              {slide.bullets && (
                <ul className="space-y-2.5">
                  {slide.bullets.map((b, i) => <BulletItem key={i} text={b} color={colors.secondary} index={i} />)}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* ════ ORBIT-STATS (Gamma-like) ════ */}
        {slide.layout === 'orbit-stats' && (
          <div className="flex flex-col items-center justify-center h-full">
            {slide.title && <h2 className="text-2xl md:text-4xl font-bold mb-8 tracking-tight text-center" style={{ color: colors.primary }}>{slide.title}</h2>}
            <div className="relative w-[84%] max-w-[820px] aspect-[16/8] flex items-center justify-center">
              <div className="absolute w-40 h-40 md:w-52 md:h-52 rounded-full border border-white/15 bg-white/[0.02] backdrop-blur-sm" />
              <div className="absolute w-64 h-64 md:w-80 md:h-80 rounded-full border border-white/10" />
              <div className="absolute w-[94%] h-[70%] rounded-full border border-white/5" />
              {(slide.stats || []).slice(0, 4).map((stat, i) => {
                const positions = [
                  'left-[8%] top-[12%]',
                  'right-[8%] top-[12%]',
                  'left-[14%] bottom-[8%]',
                  'right-[14%] bottom-[8%]',
                ]
                return (
                  <GlassCard key={i} className={`absolute ${positions[i]} px-4 py-3 min-w-[150px] text-center`}>
                    <p className="text-2xl md:text-3xl font-extrabold leading-none" style={{ color: colors.primary }}>{stat.value}</p>
                    <p className="text-xs md:text-sm mt-1" style={{ color: colors.muted }}>{stat.label}</p>
                  </GlassCard>
                )
              })}
            </div>
          </div>
        )}

        {/* ════ FALLBACK ════ */}
        {!KNOWN_LAYOUTS.includes(slide.layout) && (
          <div className={`${hasImage ? 'flex items-center gap-8' : ''}`}>
            <div className="flex-1">
              <h2 className="text-xl md:text-2xl font-bold mb-4 tracking-tight" style={{ color: colors.text }}>{slide.title}</h2>
              {slide.content && <p className="text-sm leading-relaxed" style={{ color: colors.muted }}>{slide.content}</p>}
              {slide.bullets && (
                <ul className="space-y-2.5 mt-4" style={{ color: colors.muted }}>
                  {slide.bullets.map((b, i) => <BulletItem key={i} text={b} color={colors.primary} index={i} />)}
                </ul>
              )}
            </div>
            {hasImage && (
              <div className="w-[40%] shrink-0 relative">
                <SlideImage imageUrl={imageUrl} focalPoint={slide.focal_point} className="aspect-[4/3] !rounded-2xl shadow-lg" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// PRESENTATION VIEWER — Main component
// ═══════════════════════════════════════════════════════════════

export function PresentationViewer({ contenido, titulo }: PresentationViewerProps) {
  const slidesKey = JSON.stringify(contenido.slides)

  const slides = useMemo(() => {
    const rawSlides = (Array.isArray(contenido.slides) ? contenido.slides : []) as Slide[]
    return optimizePresentationSlides(rawSlides, {
      seedKey: `${titulo}-${slidesKey}`,
      richLayouts: KNOWN_LAYOUTS,
    }) as Slide[]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slidesKey, titulo])
  const colors = useMemo(() => parseColorScheme(contenido), [contenido])
  const [currentSlide, setCurrentSlide] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const imagePrompts = useMemo(() => {
    const prompts: string[] = []
    for (const slide of slides) {
      // Skip image generation when a direct image_url is already provided
      if (slide.image_prompt && !slide.image_url && !prompts.includes(slide.image_prompt)) {
        prompts.push(slide.image_prompt)
      }
    }
    return prompts
  }, [slides])

  const goToSlide = useCallback((target: number) => {
    const clamped = Math.max(0, Math.min(slides.length - 1, target))
    if (clamped === currentSlide) return
    setIsTransitioning(true)
    setTimeout(() => {
      setCurrentSlide(clamped)
      setIsTransitioning(false)
    }, 200)
  }, [slides.length, currentSlide])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') goToSlide(currentSlide - 1)
    else if (e.key === 'ArrowRight') goToSlide(currentSlide + 1)
  }, [goToSlide, currentSlide])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const [phase, setPhase] = useState<'loading' | 'ready'>('ready')

  useEffect(() => {
    if (imagePrompts.length > 0 && !imagePrompts.every(p => imageCache.has(p))) {
      setPhase('loading')
    } else {
      setPhase('ready')
    }
  }, [imagePrompts])

  const handleDownload = async () => {
    setExporting(true)
    try {
      await exportToPptx(contenido as Record<string, unknown>, titulo, imageCache)
    } catch (err) {
      console.error('Error exporting PPTX:', err)
    } finally {
      setExporting(false)
    }
  }

  if (slides.length === 0) {
    return (
      <div className="flex flex-col h-full bg-zinc-950 items-center justify-center">
        <ThinkingIndicator userMessage="crea una presentación" />
        <p className="text-white/40 text-sm mt-8 animate-pulse">
          Tu arte ya está próxima a salir...
        </p>
      </div>
    )
  }

  if (phase === 'loading') {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-6 py-3 border-b border-white/[0.06] bg-zinc-950/50 backdrop-blur-sm">
          <div>
            <h2 className="text-sm font-semibold text-white/80 tracking-tight">{titulo}</h2>
            <span className="text-[11px] text-white/30">{slides.length} slides · preparando imágenes</span>
          </div>
          <span className="text-[10px] px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/20 font-medium tracking-wide">
            Presentación
          </span>
        </div>
        <ImagePreloader prompts={imagePrompts} onComplete={() => setPhase('ready')} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-white/[0.06] bg-zinc-900/30 backdrop-blur-sm shrink-0">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-white/80 tracking-tight truncate">{titulo}</h2>
          <span className="text-[11px] text-white/25">{slides.length} slides</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleDownload}
            disabled={exporting}
            className="text-[11px] px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/50 hover:bg-white/[0.08] hover:text-white/70 transition-all disabled:opacity-30 font-medium"
          >
            {exporting ? 'Exportando...' : '⬇ .pptx'}
          </button>
          <span className="text-[10px] px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/20 font-medium tracking-wide">
            Presentación
          </span>
        </div>
      </div>

      {/* ── Slide Display ── */}
      <div className="flex-1 overflow-y-auto flex items-center justify-center p-4 md:p-8 custom-scrollbar relative">
        <div className="w-full max-w-5xl transition-all duration-300">
          <SlideRenderer
            slide={slides[currentSlide]}
            index={currentSlide}
            total={slides.length}
            colors={colors}
            isTransitioning={isTransitioning}
          />
        </div>
      </div>

      {/* ── Premium Navigation Bar ── */}
      <div className="shrink-0 border-t border-white/[0.06] bg-zinc-900/40 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-2.5 md:px-6">
          {/* Prev */}
          <button
            onClick={() => goToSlide(currentSlide - 1)}
            disabled={currentSlide === 0}
            className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/50 hover:bg-white/[0.08] hover:text-white/80 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>

          {/* Slide dots / mini-thumbnails */}
          <div className="flex items-center gap-2 md:gap-3 overflow-x-auto max-w-[65vw] px-2 py-1 scrollbar-none custom-scrollbar">
            {slides.map((s, i) => (
              <button
                key={i}
                onClick={() => goToSlide(i)}
                className={`shrink-0 transition-all duration-300 rounded-lg overflow-hidden relative group border-2 ${
                  i === currentSlide
                    ? 'w-16 h-10 md:w-20 md:h-12 border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.3)]'
                    : 'w-10 h-6 md:w-14 md:h-8 border-white/10 opacity-60 hover:opacity-100 hover:border-white/30'
                }`}
                style={{ background: colors.background }}
                title={s.title || `Slide ${i + 1}`}
              >
                {/* Visual hint of layout inside thumbnail */}
                <div className="absolute inset-0 flex flex-col items-center justify-center p-1 opacity-40 group-hover:opacity-80 transition-opacity">
                  <div className="w-1/2 h-0.5 rounded-full bg-current mb-0.5" style={{ color: colors.primary }} />
                  <div className="w-3/4 h-0.5 rounded-full bg-current mb-0.5" style={{ color: colors.muted }} />
                  {(s.image_prompt || s.image_url) && <div className="absolute right-1 bottom-1 w-2 h-2 rounded bg-indigo-400/40" />}
                </div>
                
                {i === currentSlide && (
                  <div className="absolute inset-x-0 bottom-0 h-1" style={{ background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})` }} />
                )}
                <span className={`absolute inset-0 flex items-center justify-center font-bold ${i === currentSlide ? 'text-[10px] md:text-xs text-white drop-shadow-md' : 'text-[8px] md:text-[10px] text-white/50'}`}>
                  {i + 1}
                </span>
              </button>
            ))}
          </div>

          {/* Next */}
          <button
            onClick={() => goToSlide(currentSlide + 1)}
            disabled={currentSlide === slides.length - 1}
            className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/50 hover:bg-white/[0.08] hover:text-white/80 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
    </div>
  )
}
