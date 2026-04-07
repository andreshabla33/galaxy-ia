'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { exportToPptx } from '@/shared/lib/export-pptx'
import { ThinkingIndicator } from '@/widgets/thinking-indicator'

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface AgendaItem { title: string; detail?: string }
interface TimelineEntry { label: string; title: string; detail?: string }

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
  agenda_items?: AgendaItem[]
  timeline?: TimelineEntry[]
}

interface ColorScheme {
  primary: string
  secondary: string
  accent: string
  background: string
  text: string
  muted: string
}

interface PresentationViewerProps {
  contenido: Record<string, unknown>
  titulo: string
}

// ═══════════════════════════════════════════════════════════════
// Theme & Color Parsing
// ═══════════════════════════════════════════════════════════════

const DEFAULT_COLORS: ColorScheme = {
  primary: '#22d3ee',
  secondary: '#c084fc',
  accent: '#f472b6',
  background: '#0f172a',
  text: 'rgba(255,255,255,0.88)',
  muted: 'rgba(255,255,255,0.40)',
}

function parseColorScheme(contenido: Record<string, unknown>): ColorScheme {
  const cs = contenido.color_scheme as Record<string, string> | undefined
  if (!cs) return DEFAULT_COLORS
  return {
    primary: cs.primary || DEFAULT_COLORS.primary,
    secondary: cs.secondary || DEFAULT_COLORS.secondary,
    accent: cs.accent || DEFAULT_COLORS.accent,
    background: cs.background || DEFAULT_COLORS.background,
    text: cs.text || DEFAULT_COLORS.text,
    muted: cs.muted || DEFAULT_COLORS.muted,
  }
}

// ═══════════════════════════════════════════════════════════════
// Image Cache & Preloader
// ═══════════════════════════════════════════════════════════════

const imageCache = new Map<string, string>()

function SlideImage({ prompt, className = '' }: { prompt: string; className?: string }) {
  const url = imageCache.get(prompt)
  if (!url) return null
  return (
    <div className={`overflow-hidden rounded-xl border border-white/[0.08] ${className}`}>
      <img src={url} alt="" className="w-full h-full object-cover" />
    </div>
  )
}

async function generateSingleImage(prompt: string): Promise<{ prompt: string; url: string | null }> {
  if (imageCache.has(prompt)) return { prompt, url: imageCache.get(prompt)! }
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    const res = await fetch('/api/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, aspectRatio: '16:9', quality: 'pro' }),
      signal: controller.signal,
    })
    clearTimeout(timeout)
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

function ImagePreloader({ prompts, onComplete }: { prompts: string[]; onComplete: () => void }) {
  const [completed, setCompleted] = useState(0)
  const [failed, setFailed] = useState(0)
  const total = prompts.length

  useEffect(() => {
    if (prompts.length === 0) { onComplete(); return }
    let cancelled = false
    let consecutiveFailures = 0
    const MAX_FAIL = 3
    const safetyTimer = setTimeout(() => { if (!cancelled) { cancelled = true; onComplete() } }, 45000)
    const queue = [...prompts]
    let done = 0
    let failCount = 0

    async function processNext() {
      while (queue.length > 0 && !cancelled) {
        if (consecutiveFailures >= MAX_FAIL) {
          done += queue.length; failCount += queue.length
          setCompleted(done); setFailed(failCount); queue.length = 0; break
        }
        const prompt = queue.shift()!
        const result = await generateSingleImage(prompt)
        if (cancelled) return
        done++
        if (!result.url) { failCount++; consecutiveFailures++; setFailed(failCount) }
        else { consecutiveFailures = 0 }
        setCompleted(done)
      }
    }
    const workers = Array.from({ length: Math.min(3, prompts.length) }, () => processNext())
    Promise.all(workers).then(() => { clearTimeout(safetyTimer); if (!cancelled) onComplete() })
    return () => { cancelled = true; clearTimeout(safetyTimer) }
  }, [])

  const progress = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-8 px-6">
      <div className="relative">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 border border-white/[0.1] flex items-center justify-center">
          <svg className="w-9 h-9 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
        </div>
        <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center">
          <div className="w-3.5 h-3.5 border-2 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin" />
        </div>
      </div>
      <div className="text-center space-y-3 w-full max-w-sm">
        <h3 className="text-sm font-semibold text-white/70">Generando imágenes con IA</h3>
        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${DEFAULT_COLORS.primary}, ${DEFAULT_COLORS.secondary})` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/30">{completed}/{total} imágenes</span>
          <span className="text-white/20">{progress}%</span>
        </div>
        {failed > 0 && (
          <p className="text-xs text-amber-400/50">{failed} imag{failed > 1 ? 'enes' : 'en'} fallaron</p>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Layout Constants
// ═══════════════════════════════════════════════════════════════

const KNOWN_LAYOUTS = [
  'title', 'section', 'agend', 'agenda', 'timeline', 'two-column',
  'image-left', 'image-right', 'bullets', 'stats', 'quote', 'closing',
  'comparison', 'metric', 'process',
]

// ═══════════════════════════════════════════════════════════════
// Subcomponents (helpers)
// ═══════════════════════════════════════════════════════════════

function BulletItem({ text, color, index = 0 }: { text: string; color: string; index?: number }) {
  return (
    <li
      className="flex items-start gap-3 leading-relaxed text-sm"
      style={{
        animationDelay: `${index * 80}ms`,
      }}
    >
      <span
        className="mt-1.5 w-1.5 h-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}40` }}
      />
      <span className="text-white/70">{text}</span>
    </li>
  )
}

function GlassCard({
  children, className = '', accent, style,
}: {
  children: React.ReactNode; className?: string; accent?: string; style?: React.CSSProperties
}) {
  return (
    <div
      className={`rounded-xl border p-5 backdrop-blur-sm ${className}`}
      style={{
        background: 'rgba(255,255,255,0.03)',
        borderColor: accent ? `${accent}20` : 'rgba(255,255,255,0.06)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function getTimelineEntries(slide: Slide): TimelineEntry[] {
  if (slide.timeline) return slide.timeline
  if (slide.agenda_items) return slide.agenda_items as TimelineEntry[]
  if (Array.isArray(slide.bullets)) return slide.bullets.map((t) => ({ label: '—', title: t }))
  return []
}

// ═══════════════════════════════════════════════════════════════
// ANIMATED MESH BACKGROUND
// ═══════════════════════════════════════════════════════════════

function MeshBackground({ colors, slideIndex }: { colors: ColorScheme; slideIndex: number }) {
  // Generate deterministic orbit positions from slide index
  const seed1 = (slideIndex * 37 + 13) % 360
  const seed2 = (slideIndex * 53 + 41) % 360
  const seed3 = (slideIndex * 71 + 73) % 360

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Base mesh gradient — NotebookLM style */}
      <div
        className="absolute -inset-[100%] opacity-[0.07]"
        style={{
          background: `
            radial-gradient(ellipse at ${20 + Math.sin(seed1) * 30}% ${30 + Math.cos(seed1) * 20}%, ${colors.primary} 0%, transparent 50%),
            radial-gradient(ellipse at ${70 + Math.sin(seed2) * 25}% ${60 + Math.cos(seed2) * 30}%, ${colors.secondary} 0%, transparent 50%),
            radial-gradient(ellipse at ${50 + Math.sin(seed3) * 20}% ${20 + Math.cos(seed3) * 40}%, ${colors.accent}55 0%, transparent 60%)
          `,
        }}
      />
      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.4) 100%)',
        }}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// SLIDE RENDERER with entrance animations
// ═══════════════════════════════════════════════════════════════

function SlideRenderer({
  slide, index, total, colors,
}: {
  slide: Slide; index: number; total: number; colors: ColorScheme
}) {
  const [visible, setVisible] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Reset animation state on slide change
  useEffect(() => {
    setVisible(false)
    setElapsed(0)
    const t = setTimeout(() => setVisible(true), 30)
    return () => clearTimeout(t)
  }, [index])

  // Timer for slides with duration
  useEffect(() => {
    const duration = (slide as unknown as Record<string, number>).duration
    if (duration && duration > 0) {
      setElapsed(0)
      timerRef.current = setInterval(() => {
        setElapsed((p) => {
          if (p + 0.1 >= duration) {
            if (timerRef.current) clearInterval(timerRef.current)
            return duration
          }
          return p + 0.1
        })
      }, 100)
    } else {
      setElapsed(0)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [index, slide])

  const hasImage = !!slide.image_prompt && imageCache.has(slide.image_prompt)

  // ── Shared container classes ──
  const containerBase = `relative w-full aspect-[16/9] rounded-2xl border overflow-hidden flex flex-col`
  const containerStyle = {
    background: `linear-gradient(135deg, ${colors.background} 0%, ${colors.background}88 100%)`,
    borderColor: 'rgba(255,255,255,0.06)',
    animation: visible ? undefined : 'none',
  }

  // ── Content wrapper with entrance animation ──
  const contentClasses = `relative z-10 w-full h-full flex flex-col items-center justify-center p-6 md:p-12 lg:p-16 transition-all duration-700 ease-out`
  const contentStyle = visible
    ? { opacity: 1, transform: 'translateY(0) scale(1)' }
    : { opacity: 0, transform: 'translateY(12px) scale(0.985)' }

  // ── Progress bar (top edge) ──
  const timerDuration = (slide as unknown as Record<string, number>).duration
  const progressPct = timerDuration && timerDuration > 0 ? (elapsed / timerDuration) * 100 : 0

  // ── Renderers for each layout ──
  const renderTitle = () => (
    <div className="flex flex-col items-center justify-center text-center gap-3 md:gap-5">
      <div
        className="w-14 h-0.5 rounded-full transition-all duration-700 ease-out"
        style={{
          background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`,
          opacity: visible ? 1 : 0, transform: visible ? 'scaleX(1)' : 'scaleX(0.3)',
        }}
      />
      <h1
        className="text-2xl md:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.1] transition-all duration-500 ease-out delay-100"
        style={{
          color: colors.text,
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(16px)',
        }}
      >
        {slide.title}
      </h1>
      {slide.subtitle && (
        <p
          className="text-sm md:text-lg max-w-xl leading-relaxed transition-all duration-500 ease-out delay-200"
          style={{
            color: colors.muted,
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
          }}
        >
          {slide.subtitle}
        </p>
      )}
      <div
        className="mt-4 text-[11px] uppercase tracking-[0.2em] font-medium transition-all duration-500 ease-out delay-300"
        style={{ color: colors.muted, opacity: visible ? 0.6 : 0 }}
      >
        {index + 1} / {total}
      </div>
    </div>
  )

  const renderSection = () => (
    <div className="flex flex-col items-center justify-center text-center gap-4">
      <div
        className="text-5xl md:text-7xl font-black tracking-tighter leading-none transition-all duration-600 ease-out"
        style={{
          color: colors.primary,
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1)' : 'scale(0.8)',
        }}
      >
        {slide.title}
      </div>
      {slide.subtitle && (
        <p
          className="text-sm md:text-lg max-w-lg transition-all duration-500 ease-out delay-150"
          style={{
            color: colors.muted, opacity: visible ? 1 : 0,
          }}
        >
          {slide.subtitle}
        </p>
      )}
    </div>
  )

  const renderAgenda = () => (
    <div className="w-full max-w-2xl">
      <h2
        className="text-xl md:text-2xl font-bold mb-8 text-center tracking-tight transition-all duration-500 ease-out"
        style={{ color: colors.primary, opacity: visible ? 1 : 0 }}
      >
        {slide.title}
      </h2>
      <div className="grid gap-3">
        {getTimelineEntries(slide).map((item, i) => (
          <GlassCard
            key={i}
            className={`flex items-center gap-4 transition-all ease-out`}
            style={{
              animationDelay: `${(i + 1) * 100}ms`,
              opacity: visible ? 1 : 0,
              transform: visible ? `translateX(0)` : `translateX(${i % 2 === 0 ? '-16px' : '16px'})`,
              transitionDuration: '500ms',
            }}
          >
            <span
              className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
              style={{ background: `${colors.primary}20`, color: colors.primary }}
            >
              {item.label}
            </span>
            <div>
              <div className="text-sm font-semibold flex-1" style={{ color: colors.text }}>{item.title}</div>
              {item.detail && <div className="text-xs mt-0.5" style={{ color: colors.muted }}>{item.detail}</div>}
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  )

  const renderTimeline = () => (
    <div className="w-full">
      <h2
        className="text-xl md:text-2xl font-bold mb-8 md:mb-10 tracking-tight text-center transition-all duration-500 ease-out"
        style={{ color: colors.primary, opacity: visible ? 1 : 0 }}
      >
        {slide.title}
      </h2>
      {getTimelineEntries(slide).length === 0 ? (
        <p className="text-center text-sm" style={{ color: colors.muted }}>Añade entradas en <code className="text-white/40">timeline</code> en el JSON.</p>
      ) : (
        <div className="relative">
          <div className="hidden md:block absolute top-[22px] left-[8%] right-[8%] h-px z-0" style={{ background: `linear-gradient(90deg, transparent, ${colors.primary}55, ${colors.secondary}55, transparent)` }} />
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-none lg:flex lg:justify-between gap-6 md:gap-4 relative z-[1]">
            {getTimelineEntries(slide).map((ev, i) => (
              <div
                key={i}
                className="flex md:flex-col items-start md:items-center gap-4 md:gap-4 lg:flex-1 lg:max-w-[28%] transition-all duration-500 ease-out"
                style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(20px)', transitionDelay: `${i * 120}ms` }}
              >
                <div
                  className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-xs font-bold border-2"
                  style={{
                    borderColor: colors.primary,
                    color: colors.primary,
                    background: 'rgba(15,23,42,0.92)',
                    boxShadow: `0 0 24px ${colors.primary}33`,
                  }}
                >
                  {ev.label}
                </div>
                <GlassCard className="md:text-center p-4 md:p-5 flex-1 md:w-full">
                  <h3 className="text-sm font-bold mb-2 tracking-tight" style={{ color: colors.text }}>{ev.title}</h3>
                  {ev.detail && <p className="text-xs leading-relaxed" style={{ color: colors.muted }}>{ev.detail}</p>}
                </GlassCard>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  const renderImageSide = (imageSide: 'left' | 'right') => {
    const isLeft = imageSide === 'left'
    const glowColor = isLeft ? colors.primary : colors.secondary
    return (
      <div className="flex items-center gap-6 md:gap-10 h-full">
        {hasImage && (
          <div className={`w-[42%] shrink-0 relative ${!isLeft ? 'order-2' : ''}`}>
            <div className="absolute -inset-2 rounded-xl opacity-20 blur-xl" style={{ background: glowColor }} />
            <SlideImage prompt={slide.image_prompt!} className="relative aspect-[4/3] !rounded-xl shadow-2xl shadow-black/30" />
          </div>
        )}
        <div className="flex-1 flex flex-col justify-center min-w-0">
          <h2
            className="text-xl md:text-2xl font-bold mb-3 tracking-tight transition-all duration-500 ease-out"
            style={{ color: colors.text, opacity: visible ? 1 : 0, transform: visible ? 'translateX(0)' : `translateX(${isLeft ? '-12px' : '12px'})` }}
          >
            {slide.title}
          </h2>
          {slide.content && (
            <p
              className="text-sm leading-relaxed mb-4 transition-all duration-500 ease-out delay-100"
              style={{ color: colors.muted, opacity: visible ? 1 : 0 }}
            >
              {slide.content}
            </p>
          )}
          {slide.bullets && (
            <ul className="space-y-2.5">
              {slide.bullets.map((b, i) => (
                <BulletItem key={i} text={b} color={glowColor} index={i} />
              ))}
            </ul>
          )}
        </div>
      </div>
    )
  }

  const renderBullets = () => (
    <div className="max-w-2xl">
      <h2
        className="text-xl md:text-2xl font-bold mb-6 tracking-tight transition-all duration-500 ease-out"
        style={{ color: colors.primary, opacity: visible ? 1 : 0 }}
      >
        {slide.title}
      </h2>
      <ul className="space-y-3">
        {slide.bullets?.map((bullet, i) => (
          <div
            key={i}
            className="transition-all duration-500 ease-out"
            style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateX(0)' : 'translateX(-12px)', transitionDelay: `${(i + 1) * 80}ms` }}
          >
            <BulletItem text={bullet} color={colors.secondary} index={i} />
          </div>
        ))}
      </ul>
    </div>
  )

  const renderTwoColumn = () => (
    <div>
      <h2
        className="text-xl md:text-2xl font-bold mb-6 tracking-tight transition-all duration-500 ease-out"
        style={{ color: colors.primary, opacity: visible ? 1 : 0 }}
      >
        {slide.title}
      </h2>
      <div className="grid grid-cols-2 gap-4 md:gap-6">
        {slide.left && (
          <GlassCard
            accent={colors.primary}
            className="p-5 md:p-6 transition-all duration-500 ease-out delay-100"
            style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateX(0)' : 'translateX(-16px)' }}
          >
            <div className="w-8 h-1 rounded-full mb-3" style={{ backgroundColor: colors.primary }} />
            <h3 className="text-sm font-bold mb-2 tracking-tight" style={{ color: colors.primary }}>{slide.left.heading}</h3>
            <p className="text-xs md:text-sm leading-relaxed" style={{ color: colors.muted }}>{slide.left.content}</p>
          </GlassCard>
        )}
        {slide.right && (
          <GlassCard
            accent={colors.secondary}
            className="p-5 md:p-6 transition-all duration-500 ease-out delay-200"
            style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateX(0)' : 'translateX(16px)' }}
          >
            <div className="w-8 h-1 rounded-full mb-3" style={{ backgroundColor: colors.secondary }} />
            <h3 className="text-sm font-bold mb-2 tracking-tight" style={{ color: colors.secondary }}>{slide.right.heading}</h3>
            <p className="text-xs md:text-sm leading-relaxed" style={{ color: colors.muted }}>{slide.right.content}</p>
          </GlassCard>
        )}
      </div>
    </div>
  )

  const renderStats = () => (
    <div>
      <h2
        className="text-xl md:text-2xl font-bold mb-8 text-center tracking-tight transition-all duration-500 ease-out"
        style={{ color: colors.primary, opacity: visible ? 1 : 0 }}
      >
        {slide.title}
      </h2>
      <div className="flex justify-center gap-4 md:gap-8 flex-wrap">
        {slide.stats?.map((stat, i) => (
          <GlassCard
            key={i}
            className="text-center px-6 py-5 md:px-8 md:py-6 min-w-[120px] md:min-w-[160px] transition-all duration-500 ease-out"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.95)',
              transitionDelay: `${i * 100}ms`,
            }}
          >
            <div className="text-3xl md:text-4xl font-extrabold tracking-tight" style={{ color: colors.primary }}>{stat.value}</div>
            <div className="w-8 h-0.5 rounded-full mx-auto my-3 opacity-25" style={{ backgroundColor: colors.secondary }} />
            <div className="text-xs md:text-sm font-medium uppercase tracking-wider" style={{ color: colors.muted }}>{stat.label}</div>
          </GlassCard>
        ))}
      </div>
    </div>
  )

  const renderComparison = () => (
    <div className="w-full max-w-3xl">
      <h2
        className="text-xl md:text-2xl font-bold mb-8 text-center tracking-tight transition-all duration-500 ease-out"
        style={{ color: colors.text, opacity: visible ? 1 : 0 }}
      >
        {slide.title}
      </h2>
      <div className="grid grid-cols-2 gap-4">
        {/* Left side — "Antes / Problema" */}
        <GlassCard className="transition-all duration-500 ease-out" style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateX(0)' : 'translateX(-12px)', transitionDelay: '100ms' }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-red-400/60" />
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: '#f87171' }}>Antes</h3>
          </div>
          <ul className="space-y-2">
            {(slide as unknown as Record<string, string[]>).before?.map((item: string, i: number) => (
              <li key={i} className="text-sm text-white/60 flex items-start gap-2">
                <span className="text-red-400/40 mt-0.5">✕</span>{item}</li>
            ))}
          </ul>
        </GlassCard>
        {/* Right side — "Después / Solución" */}
        <GlassCard accent={colors.primary} className="transition-all duration-500 ease-out" style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateX(0)' : 'translateX(12px)', transitionDelay: '200ms' }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-emerald-400/60" />
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: '#34d399' }}>Después</h3>
          </div>
          <ul className="space-y-2">
            {(slide as unknown as Record<string, string[]>).after?.map((item: string, i: number) => (
              <li key={i} className="text-sm text-white/60 flex items-start gap-2">
                <span className="text-emerald-400/40 mt-0.5">✓</span>{item}</li>
            ))}
          </ul>
        </GlassCard>
      </div>
    </div>
  )

  const renderProcess = () => (
    <div className="w-full max-w-3xl">
      <h2
        className="text-xl md:text-2xl font-bold mb-10 text-center tracking-tight transition-all duration-500 ease-out"
        style={{ color: colors.text, opacity: visible ? 1 : 0 }}
      >
        {slide.title}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {(slide as unknown as Record<string, Array<{ step: string; title: string; detail: string }>>).steps?.map((step: Record<string, string>, i) => (
          <div
            key={i}
            className="flex flex-col items-center text-center gap-3 transition-all duration-500 ease-out"
            style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(16px)', transitionDelay: `${i * 120}ms` }}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold"
              style={{ background: `${colors.primary}18`, color: colors.primary, border: `1px solid ${colors.primary}30` }}
            >
              {step.step || i + 1}
            </div>
            <div>
              <h3 className="text-sm font-bold mb-1" style={{ color: colors.text }}>{step.title}</h3>
              {step.detail && <p className="text-xs leading-relaxed" style={{ color: colors.muted }}>{step.detail}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderQuote = () => (
    <div className="flex flex-col items-center justify-center text-center px-8 md:px-16">
      <div className="text-6xl md:text-7xl font-serif leading-none -mb-2" style={{ color: colors.primary, opacity: 0.15 }}>&ldquo;</div>
      <GlassCard className="px-8 py-6 md:px-12 md:py-8 max-w-2xl">
        <p
          className="text-base md:text-xl italic leading-relaxed transition-all duration-500 ease-out"
          style={{ color: colors.text, opacity: visible ? 1 : 0 }}
        >
          {slide.quote}
        </p>
        {slide.author && (
          <div className="mt-6 transition-all duration-500 ease-out delay-200" style={{ opacity: visible ? 1 : 0 }}>
            <div className="w-10 h-0.5 rounded-full mx-auto mb-3" style={{ background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})` }} />
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: colors.muted }}>{slide.author}</p>
          </div>
        )}
      </GlassCard>
    </div>
  )

  const renderClosing = () => (
    <div className="flex flex-col items-center justify-center text-center">
      <div
        className="w-14 h-0.5 rounded-full mb-8 transition-all duration-700 ease-out"
        style={{
          background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`,
          opacity: visible ? 1 : 0, transform: visible ? 'scaleX(1)' : 'scaleX(0.3)',
        }}
      />
      <h1
        className="text-2xl md:text-4xl font-bold tracking-tight mb-4 transition-all duration-500 ease-out delay-100"
        style={{ color: colors.primary, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(12px)' }}
      >
        {slide.title}
      </h1>
      {slide.contact && (
        <GlassCard
          className="px-6 py-3 mt-2 transition-all duration-500 ease-out delay-200"
          style={{ opacity: visible ? 1 : 0 }}
        >
          <p className="text-sm font-medium" style={{ color: colors.muted }}>{slide.contact}</p>
        </GlassCard>
      )}
    </div>
  )

  // ── Layout Router ──
  const layout = slide.layout
  let content: React.ReactNode

  if (layout === 'title') content = renderTitle()
  else if (layout === 'section') content = renderSection()
  else if (layout === 'agenda' || layout === 'agend') content = renderAgenda()
  else if (layout === 'timeline') content = renderTimeline()
  else if (layout === 'image-left') content = renderImageSide('left')
  else if (layout === 'image-right') content = renderImageSide('right')
  else if (layout === 'bullets') content = renderBullets()
  else if (layout === 'two-column') content = renderTwoColumn()
  else if (layout === 'stats') content = renderStats()
  else if (layout === 'comparison') content = renderComparison()
  else if (layout === 'process') content = renderProcess()
  else if (layout === 'quote') content = renderQuote()
  else if (layout === 'closing') content = renderClosing()
  else {
    // Fallback — content + optional image
    content = (
      <div className={`flex items-center gap-8 ${hasImage ? '' : ''}`}>
        <div className="flex-1">
          <h2 className="text-xl md:text-2xl font-bold mb-4 tracking-tight" style={{ color: colors.text }}>{slide.title}</h2>
          {slide.content && <p className="text-sm leading-relaxed" style={{ color: colors.muted }}>{slide.content}</p>}
          {slide.bullets && (
            <ul className="space-y-2.5 mt-4">
              {slide.bullets.map((b, i) => <BulletItem key={i} text={b} color={colors.primary} index={i} />)}
            </ul>
          )}
        </div>
        {hasImage && (
          <div className="w-[40%] shrink-0 relative">
            <SlideImage prompt={slide.image_prompt!} className="aspect-[4/3] !rounded-xl shadow-2xl shadow-black/30" />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={containerBase} style={containerStyle}>
      {/* Animated mesh background */}
      <MeshBackground colors={colors} slideIndex={index} />

      {/* Timer progress (top edge) */}
      {timerDuration && timerDuration > 0 && (
        <div className="absolute top-0 left-0 h-[2px] z-20 rounded-r-full" style={{
          width: `${progressPct}%`,
          background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`,
          transition: 'width 0.1s linear',
        }} />
      )}

      {/* Slide content */}
      <div className={contentClasses} style={contentStyle}>
        {content}
      </div>

      {/* Slide counter (bottom-right) */}
      <div className="absolute bottom-3 right-5 text-[10px] font-medium z-20" style={{ color: colors.muted }}>
        {index + 1} / {total}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// PRESENTATION VIEWER — Main component
// ═══════════════════════════════════════════════════════════════

export function PresentationViewer({ contenido, titulo }: PresentationViewerProps) {
  const slidesKey = JSON.stringify(contenido.slides)

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
    return slides
      .map((s) => s.image_prompt!)
      .filter((p, i, arr) => p && arr.indexOf(p) === i)
  }, [slides])

  const goToSlide = useCallback((index: number) => {
    if (isTransitioning) return
    setIsTransitioning(true)
    setCurrentSlide(index)
    setTimeout(() => setIsTransitioning(false), 600)
  }, [isTransitioning])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') goToSlide(Math.max(0, currentSlide - 1))
    else if (e.key === 'ArrowRight') goToSlide(Math.min(slides.length - 1, currentSlide + 1))
  }, [currentSlide, slides.length, goToSlide])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Touch / swipe support
  const touchStartX = useRef(0)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }, [])
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (diff > 50) goToSlide(Math.min(slides.length - 1, currentSlide + 1))
    else if (diff < -50) goToSlide(Math.max(0, currentSlide - 1))
  }, [currentSlide, slides.length, goToSlide])

  const [phase, setPhase] = useState<'loading' | 'ready'>('ready')
  useEffect(() => {
    if (imagePrompts.length > 0 && !imagePrompts.every((p) => imageCache.has(p))) {
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
          Tu presentación está por llegar...
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
      <div
        className="flex-1 overflow-y-auto flex items-center justify-center p-3 md:p-5"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className={`w-full max-w-4xl transition-all duration-500 ease-out ${isTransitioning ? 'opacity-0 scale-[0.97]' : 'opacity-100 scale-100'}`}>
          <SlideRenderer
            slide={slides[currentSlide]}
            index={currentSlide}
            total={slides.length}
            colors={colors}
          />
        </div>
      </div>

      {/* ── Premium Navigation Bar ── */}
      <div className="shrink-0 border-t border-white/[0.06] bg-zinc-900/40 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-2.5 md:px-6">
          {/* Prev */}
          <button
            onClick={() => goToSlide(Math.max(0, currentSlide - 1))}
            disabled={currentSlide === 0}
            className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/50 hover:bg-white/[0.08] hover:text-white/80 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>

          {/* Slide dots */}
          <div className="flex items-center gap-1.5 md:gap-2 overflow-x-auto max-w-[55vw] md:max-w-[65vw] px-2 scrollbar-none">
            {slides.map((s, i) => (
              <button
                key={i}
                onClick={() => goToSlide(i)}
                className={`shrink-0 transition-all duration-300 rounded-lg border overflow-hidden relative ${
                  i === currentSlide
                    ? 'w-12 h-8 md:w-16 md:h-10 border-white/20 shadow-lg'
                    : 'w-7 h-4 md:w-9 md:h-6 border-white/[0.06] opacity-50 hover:opacity-80'
                }`}
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
            onClick={() => goToSlide(Math.min(slides.length - 1, currentSlide + 1))}
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
