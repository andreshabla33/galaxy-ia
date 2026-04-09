'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { exportToPptx } from '@/shared/lib/export-pptx'
import { ThinkingIndicator } from '@/widgets/thinking-indicator'
import { useAppStore } from '@/features/settings/model/appStore'

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

const KNOWN_LAYOUTS = ['title', 'bullets', 'two-column', 'stats', 'quote', 'image-left', 'image-right', 'closing', 'full-image', 'icon-grid', 'timeline', 'section-divider']

// Normalize legacy/unknown layout names to the closest known layout
function normalizeLayout(layout: string): string {
  if (KNOWN_LAYOUTS.includes(layout)) return layout
  if (layout === 'image-text') return 'image-right'
  if (layout === 'content' || layout === 'text') return 'bullets'
  if (layout === 'divider' || layout === 'separator') return 'section-divider'
  if (layout === 'features' || layout === 'grid') return 'icon-grid'
  if (layout === 'roadmap' || layout === 'process') return 'timeline'
  if (layout === 'hero' || layout === 'splash') return 'full-image'
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

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative rounded-xl border border-white/[0.08] backdrop-blur-sm overflow-hidden ${className}`}
      style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)' }}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      {children}
    </div>
  )
}

function BulletItem({ text, color, index }: { text: string; color: string; index: number }) {
  // Bold the first phrase (up to first colon, dash, or period) for visual hierarchy
  const separatorIdx = text.search(/[:\-–—.]/);
  const hasSeparator = separatorIdx > 0 && separatorIdx < text.length * 0.6;
  return (
    <li className="flex items-start gap-3 group" style={{ animationDelay: `${index * 60}ms` }}>
      <span className="relative mt-[7px] shrink-0">
        <span className="block w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="absolute inset-0 w-2 h-2 rounded-full opacity-40 blur-[3px]" style={{ backgroundColor: color }} />
      </span>
      <span className="text-sm leading-relaxed">
        {hasSeparator ? (
          <><span className="font-semibold text-white/90">{text.slice(0, separatorIdx + 1)}</span>{text.slice(separatorIdx + 1)}</>
        ) : text}
      </span>
    </li>
  )
}

// ═══════════════════════════════════════════════════════════════
// SLIDE RENDERER — Premium visual quality per layout
// ═══════════════════════════════════════════════════════════════

function SlideRenderer({ slide: rawSlide, index, total, colors, isTransitioning }: { slide: Slide; index: number; total: number; colors: ColorScheme; isTransitioning?: boolean }) {
  const slide = useMemo(() => ({ ...rawSlide, layout: normalizeLayout(rawSlide.layout) }), [rawSlide])
  const hasImage = !!slide.image_prompt

  const slideStyle: React.CSSProperties = {
    background: colors.background,
    fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
    transition: 'opacity 0.3s ease, transform 0.3s ease',
    opacity: isTransitioning ? 0 : 1,
    transform: isTransitioning ? 'translateY(8px)' : 'translateY(0)',
  }

  return (
    <div className="w-full aspect-video rounded-2xl border border-white/[0.08] flex flex-col relative overflow-hidden shadow-2xl shadow-black/40" style={slideStyle}>
      <DecoOrbs primary={colors.primary} secondary={colors.secondary} />
      <SlideNumber index={index} total={total} muted={colors.muted} />

      {/* Background image overlay for content-heavy layouts */}
      {hasImage && !['image-left', 'image-right', 'title'].includes(slide.layout) && (
        <div className="absolute inset-0 z-0">
          <SlideImage prompt={slide.image_prompt!} className="w-full h-full !rounded-none !border-0" />
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.75) 40%, rgba(0,0,0,0.5) 100%)'
          }} />
        </div>
      )}

      {/* ── CONTENT ── */}
      <div className="flex-1 flex flex-col justify-center px-8 py-6 md:px-16 md:py-12 relative z-[1]">

        {/* ════ TITLE SLIDE ════ */}
        {slide.layout === 'title' && (
          <div className={`flex items-center ${hasImage ? 'gap-8' : ''} h-full`}>
            <div className={`flex flex-col justify-center ${hasImage ? 'flex-1' : 'w-full items-center text-center'}`}>
              <div className="w-12 h-1 rounded-full mb-6 opacity-80" style={{ background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})` }} />
              <h1 className="text-2xl md:text-4xl font-bold leading-tight tracking-tight mb-4" style={{ color: colors.primary }}>
                {slide.title}
              </h1>
              {slide.subtitle && (
                <p className="text-sm md:text-lg leading-relaxed max-w-xl" style={{ color: colors.muted }}>
                  {slide.subtitle}
                </p>
              )}
            </div>
            {hasImage && (
              <div className="w-[44%] shrink-0 relative">
                <div className="absolute -inset-3 rounded-2xl opacity-20 blur-xl" style={{ background: colors.primary }} />
                <SlideImage prompt={slide.image_prompt!} className="relative aspect-[4/3] !rounded-2xl shadow-xl shadow-black/30" />
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
                <SlideImage prompt={slide.image_prompt!} className="relative aspect-[4/3] !rounded-2xl shadow-lg shadow-black/20" />
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
                <SlideImage prompt={slide.image_prompt!} className="relative aspect-[4/3] !rounded-2xl shadow-lg shadow-black/20" />
              </div>
            )}
          </div>
        )}

        {/* ════ BULLETS ════ */}
        {slide.layout === 'bullets' && (
          <div className="max-w-2xl">
            <h2 className="text-xl md:text-2xl font-bold mb-6 tracking-tight" style={{ color: colors.primary }}>{slide.title}</h2>
            <ul className="space-y-3" style={{ color: colors.text }}>
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
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-12 md:pb-16 z-[2]">
            {/* Full-bleed background image */}
            {hasImage && (
              <div className="absolute inset-0 z-0">
                <SlideImage prompt={slide.image_prompt!} className="w-full h-full !rounded-none !border-0" />
                <div className="absolute inset-0" style={{
                  background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.5) 35%, rgba(0,0,0,0.15) 100%)'
                }} />
              </div>
            )}
            {/* Highlight text — large and dramatic */}
            {slide.highlight_text && (
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-center px-8 mb-3 leading-tight relative z-10" style={{ color: '#ffffff' }}>
                {slide.highlight_text}
              </h1>
            )}
            {slide.title && !slide.highlight_text && (
              <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-center px-8 mb-3 relative z-10" style={{ color: '#ffffff' }}>
                {slide.title}
              </h1>
            )}
            {slide.title && slide.highlight_text && (
              <p className="text-sm md:text-base text-center px-8 relative z-10" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {slide.title}
              </p>
            )}
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
          <div className="flex flex-col items-center justify-center text-center h-full">
            {slide.section_number && (
              <div className="text-6xl md:text-8xl font-extrabold mb-4 opacity-10" style={{ color: colors.primary }}>
                {String(slide.section_number).padStart(2, '0')}
              </div>
            )}
            <div className="w-12 h-1 rounded-full mb-6" style={{ background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})` }} />
            <h1 className="text-2xl md:text-4xl font-bold tracking-tight mb-3" style={{ color: colors.text }}>{slide.title}</h1>
            {slide.subtitle && (
              <p className="text-sm md:text-base max-w-xl" style={{ color: colors.muted }}>{slide.subtitle}</p>
            )}
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
                <SlideImage prompt={slide.image_prompt!} className="aspect-[4/3] !rounded-2xl shadow-lg" />
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

  useEffect(() => {
    console.log('[PresentationViewer] Mount with titulo:', titulo)
    console.log('[PresentationViewer] Is slides array?', Array.isArray(contenido.slides))
  }, [titulo, contenido])

  const slides = useMemo(
    () => (Array.isArray(contenido.slides) ? contenido.slides : []) as Slide[],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slidesKey]
  )
  const colors = useMemo(() => parseColorScheme(contenido), [contenido])
  const [currentSlide, setCurrentSlide] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const imagePrompts = useMemo(() => {
    const prompts: string[] = []
    for (const slide of slides) {
      if (slide.image_prompt && !prompts.includes(slide.image_prompt)) {
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
      <div className="flex-1 overflow-y-auto flex items-center justify-center p-3 md:p-5">
        <div className="w-full max-w-4xl">
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
          <div className="flex items-center gap-1.5 md:gap-2 overflow-x-auto max-w-[55vw] md:max-w-[65vw] px-2 scrollbar-none">
            {slides.map((s, i) => (
              <button
                key={i}
                onClick={() => goToSlide(i)}
                className={`shrink-0 transition-all duration-300 rounded-md border ${
                  i === currentSlide
                    ? 'w-10 h-7 md:w-14 md:h-9 border-white/20 shadow-lg'
                    : 'w-6 h-4 md:w-8 md:h-5 border-white/[0.06] opacity-50 hover:opacity-80'
                } overflow-hidden relative`}
                style={{ background: colors.background }}
                title={s.title || `Slide ${i + 1}`}
              >
                {i === currentSlide && (
                  <div className="absolute inset-x-0 bottom-0 h-0.5" style={{ background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})` }} />
                )}
                <span className="absolute inset-0 flex items-center justify-center text-[6px] md:text-[7px] font-bold" style={{ color: colors.muted }}>
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
