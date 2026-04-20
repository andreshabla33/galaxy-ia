'use client'

import { useMemo, useState } from 'react'
import { PresentationViewer } from '@/widgets/artifact-viewer'
import { analyzeSlideDiversity, optimizePresentationSlides } from '@/shared/lib/presentation-layout-engine'

type ThemeStyle = 'dark-glass' | 'light-minimal' | 'bold-gradient' | 'corporate' | 'editorial' | 'gamma-auto'
type IndustryPreset = 'startup' | 'education' | 'agency' | 'finance'

type Slide = Record<string, unknown>
type Presentation = {
  titulo: string
  subtipo: string
  theme: 'dark' | 'light'
  theme_style: ThemeStyle
  color_scheme: {
    primary: string
    secondary: string
    background: string
    text: string
    muted: string
  }
  slides: Slide[]
}

const THEMES: Record<ThemeStyle, Presentation> = {
  'dark-glass': {
    titulo: 'Tech Startup Showcase',
    subtipo: 'pitch-deck',
    theme: 'dark',
    theme_style: 'dark-glass',
    color_scheme: {
      primary: '#22d3ee',
      secondary: '#8b5cf6',
      background: 'linear-gradient(140deg, #020617 0%, #0f172a 45%, #1e1b4b 100%)',
      text: 'rgba(255,255,255,0.9)',
      muted: 'rgba(255,255,255,0.62)',
    },
    slides: [
      {
        layout: 'full-image',
        title: 'Build Faster with AI',
        highlight_text: 'Voice-to-Product in Minutes',
        image_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1920&q=80',
        overlay_opacity: 0.86,
      },
      {
        layout: 'image-right',
        title: 'Platform Overview',
        content: 'A complete creation workflow for documents, decks and code.',
        bullets: ['Voice-first creation', 'Live collaboration', 'AI images + exports'],
        image_prompt: 'futuristic holographic dashboard in dark room, cyan and violet lights, premium product render, no text',
      },
      {
        layout: 'photo-quote',
        quote: 'Great products are built at the speed of ideas, not meetings.',
        author: 'Product Team',
        image_url: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1920&q=80',
        focal_point: 'center 40%',
      },
      {
        layout: 'product-mockup',
        title: 'Product Experience',
        content: 'A polished app surface increases trust and conversion from first interaction.',
        bullets: ['Mobile-first UX', 'Fast onboarding flow', 'Elegant micro-interactions'],
        image_url: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=900&q=80',
      },
      {
        layout: 'stats',
        title: 'Adoption Metrics',
        stats: [
          { value: '180K', label: 'Monthly Users' },
          { value: '42%', label: 'Time Saved' },
          { value: '12M', label: 'Assets Generated' },
        ],
      },
      {
        layout: 'closing',
        title: 'Let’s Build the Next Category Leader',
        contact: 'hello@galaxy-ia.com',
      },
    ],
  },
  'light-minimal': {
    titulo: 'Education Program Deck',
    subtipo: 'educativo',
    theme: 'light',
    theme_style: 'light-minimal',
    color_scheme: {
      primary: '#4f46e5',
      secondary: '#0ea5e9',
      background: '#ffffff',
      text: '#0f172a',
      muted: '#64748b',
    },
    slides: [
      {
        layout: 'title',
        title: 'Modern Learning Framework',
        subtitle: 'Project-based education with measurable outcomes',
        image_url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1600&q=80',
      },
      {
        layout: 'full-image',
        title: 'Learning by Building',
        highlight_text: 'From Theory to Real Skills',
        bullets: [
          'Challenge-first modules that begin with a real-world scenario, not abstract theory.',
          'Mentor checkpoints convert each milestone into measurable skill progression.',
          'Portfolio-ready deliverables document capability for internships and hiring.',
        ],
        image_url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1920&q=80',
        overlay_opacity: 0.72,
      },
      {
        layout: 'product-mockup',
        title: 'Student App Experience',
        content: 'Track progress, access modules and receive mentor feedback from one interface.',
        bullets: ['Roadmap view', 'Assignment timeline', 'Mentor messaging'],
        image_url: 'https://images.unsplash.com/photo-1523289333742-be1143f6b766?auto=format&fit=crop&w=900&q=80',
      },
      {
        layout: 'bento-grid',
        title: 'Student Experience',
        items: [
          { icon: '🧠', title: 'Mentor-led', description: 'Weekly feedback and coaching loops.' },
          { icon: '💻', title: 'Hands-on Labs', description: 'Production-like projects in every module.' },
          { icon: '🤝', title: 'Peer Pods', description: 'Collaborative problem solving and reviews.' },
          { icon: '📈', title: 'Progress Analytics', description: 'Skill growth tracked in real time.' },
        ],
      },
      {
        layout: 'photo-quote',
        quote: 'The best classes make students creators, not spectators.',
        author: 'Academic Director',
        image_url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1920&q=80',
      },
      {
        layout: 'closing',
        title: 'Admissions Open',
        contact: 'admissions@academy.edu',
      },
    ],
  },
  'bold-gradient': {
    titulo: 'Summer Festival Campaign',
    subtipo: 'marketing',
    theme: 'dark',
    theme_style: 'bold-gradient',
    color_scheme: {
      primary: '#fb7185',
      secondary: '#f59e0b',
      background: 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)',
      text: 'rgba(255,255,255,0.95)',
      muted: 'rgba(255,255,255,0.72)',
    },
    slides: [
      {
        layout: 'full-image',
        title: 'Summer Festival 2026',
        highlight_text: '3 Days · 80 Artists · 1 City',
        image_url: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1920&q=80',
      },
      {
        layout: 'comparison',
        title: 'Old Campaign vs New Visual System',
        left: { heading: 'Before', content: 'Static ads with low recall', items: ['Generic banners', 'Low social engagement', 'Weak visual identity'] },
        right: { heading: 'After', content: 'Canva-style campaign with dynamic visuals', items: ['Photo-first creatives', 'Template system', 'High retention storytelling'] },
      },
      {
        layout: 'product-mockup',
        title: 'Creative Asset System',
        content: 'Ready-to-launch templates for stories, reels, posters and ad creatives.',
        bullets: ['Brand-safe variants', 'Quick copy swaps', 'Multi-format exports'],
        image_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=900&q=80',
      },
      {
        layout: 'icon-grid',
        title: 'Content Pillars',
        items: [
          { icon: '🎤', title: 'Live Energy', description: 'Headliner performances and moments.' },
          { icon: '📸', title: 'Creator Ready', description: 'Instagram-first scenes and shots.' },
          { icon: '🍔', title: 'Food Story', description: 'Editorial style vendor showcase.' },
          { icon: '🎟️', title: 'Conversion', description: 'Ticket drops with urgency hooks.' },
        ],
      },
      {
        layout: 'photo-quote',
        quote: 'People buy the vibe before they buy the ticket.',
        author: 'Creative Strategy',
        image_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1920&q=80',
      },
      {
        layout: 'closing',
        title: 'Launch Campaign in 7 Days',
        contact: 'campaign@summerfest.com',
      },
    ],
  },
  corporate: {
    titulo: 'Q4 Investor Report',
    subtipo: 'reporte',
    theme: 'light',
    theme_style: 'corporate',
    color_scheme: {
      primary: '#1e3a5f',
      secondary: '#f59e0b',
      background: '#f8fafc',
      text: '#1e293b',
      muted: '#64748b',
    },
    slides: [
      {
        layout: 'title',
        title: 'Financial Performance 2026',
        subtitle: 'Focused growth with stronger margins',
        image_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1600&q=80',
      },
      {
        layout: 'chart',
        title: 'Quarter Highlights',
        stats: [
          { value: '38%', label: 'Revenue Growth' },
          { value: '24%', label: 'Operating Margin' },
          { value: '94%', label: 'Net Retention' },
        ],
      },
      {
        layout: 'product-mockup',
        title: 'Executive Dashboard',
        content: 'One unified panel for cashflow, retention and strategic KPIs.',
        bullets: ['Real-time metrics', 'Cohort views', 'Board-ready exports'],
        image_url: 'https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=900&q=80',
      },
      {
        layout: 'full-image',
        title: 'Global Expansion',
        highlight_text: '3 New Markets Opened',
        image_url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1920&q=80',
      },
      {
        layout: 'photo-quote',
        quote: 'We are scaling with discipline and long-term focus.',
        author: 'CFO Statement',
        image_url: 'https://images.unsplash.com/photo-1521791055366-0d553872125f?auto=format&fit=crop&w=1920&q=80',
      },
      {
        layout: 'closing',
        title: 'Investor Relations',
        contact: 'ir@company.com',
      },
    ],
  },
  editorial: {
    titulo: 'Design Magazine Feature',
    subtipo: 'publicacion',
    theme: 'light',
    theme_style: 'editorial',
    color_scheme: {
      primary: '#111827',
      secondary: '#ef4444',
      background: '#faf9f7',
      text: '#1c1917',
      muted: '#78716c',
    },
    slides: [
      {
        layout: 'full-image',
        title: 'ICONIC DESIGN',
        highlight_text: 'Where Form Meets Culture',
        image_url: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1920&q=80',
      },
      {
        layout: 'image-left',
        title: 'Material Storytelling',
        content: 'Texture, light and shadow are the new typography in spatial design.',
        bullets: ['Natural palette', 'Bold geometry', 'Sustainable finishes'],
        image_url: 'https://images.unsplash.com/photo-1493666438817-866a91353ca9?auto=format&fit=crop&w=1600&q=80',
      },
      {
        layout: 'product-mockup',
        title: 'Digital Magazine Prototype',
        content: 'Interactive long-form storytelling with smooth transitions and immersive spreads.',
        bullets: ['Cover-to-story flow', 'Interactive cards', 'Reader analytics'],
        image_url: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=900&q=80',
      },
      {
        layout: 'photo-quote',
        quote: 'A great layout feels inevitable, never accidental.',
        author: 'Editorial Team',
        image_url: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1920&q=80',
      },
      {
        layout: 'timeline',
        title: 'Design Evolution',
        items: [
          { title: '1990s', description: 'Postmodern experimentation' },
          { title: '2000s', description: 'Digital acceleration' },
          { title: '2010s', description: 'Minimalist wave' },
          { title: '2020s', description: 'Sustainable narrative' },
        ],
      },
      {
        layout: 'closing',
        title: 'Read the Full Issue',
        contact: 'editors@designmag.com',
      },
    ],
  },
  'gamma-auto': {
    titulo: 'Auto Layout Stress Test',
    subtipo: 'pitch-deck',
    theme: 'dark',
    theme_style: 'dark-glass',
    color_scheme: {
      primary: '#38bdf8',
      secondary: '#a78bfa',
      background: '#0b1020',
      text: 'rgba(255,255,255,0.9)',
      muted: 'rgba(255,255,255,0.6)',
    },
    slides: [
      {
        layout: 'bullets',
        title: 'AI Strategy 2026',
        bullets: ['Vision and strategic alignment for all teams with clear execution streams and measurable outcomes.'],
      },
      {
        layout: 'bullets',
        title: 'Market Context',
        bullets: ['The market is moving fast and we need coordinated initiatives with platform, product and GTM alignment.'],
        image_url: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1600&q=80',
      },
      {
        layout: 'bullets',
        title: 'Problem Definition',
        bullets: ['Current workflows are fragmented and teams lose momentum due to manual handoffs and duplicated efforts.'],
      },
      {
        layout: 'bullets',
        title: 'Product Capabilities',
        items: [
          { icon: '⚡', title: 'Speed', description: 'Draft to delivery in hours instead of weeks.' },
          { icon: '🧠', title: 'Intelligence', description: 'Context-aware generation with structured outputs.' },
          { icon: '🔒', title: 'Trust', description: 'Governance and brand-safe content controls.' },
          { icon: '📈', title: 'Scale', description: 'Reusable templates and organization-wide rollout.' },
        ],
      },
      {
        layout: 'bullets',
        title: 'Evidence',
        stats: [
          { value: '47%', label: 'Cycle Time Reduction' },
          { value: '2.3x', label: 'Output Increase' },
          { value: '91%', label: 'Adoption Rate' },
        ],
      },
      {
        layout: 'bullets',
        title: 'Operational Model',
        left: { heading: 'Today', content: 'Disconnected tools and serial approvals.', items: ['Rework', 'Slow delivery', 'Low visibility'] },
        right: { heading: 'Target', content: 'Unified creative operating system.', items: ['Single workflow', 'Shared assets', 'Continuous optimization'] },
      },
      {
        layout: 'bullets',
        title: 'Visual Narrative',
        quote: 'Execution quality compounds when teams share one system.',
        author: 'Strategy Office',
        image_url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1920&q=80',
      },
      {
        layout: 'split-spotlight',
        title: 'Execution Engine',
        content: 'From scattered tasks to one orchestrated production flow.',
        bullets: ['One intake channel', 'Reusable visual blocks', 'Cross-team review loops'],
        image_url: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1920&q=80',
      },
      {
        layout: 'orbit-stats',
        title: 'Business Impact Orbit',
        stats: [
          { value: '73%', label: 'Activation' },
          { value: '2.8x', label: 'Delivery Speed' },
          { value: '91%', label: 'Adoption' },
          { value: '39%', label: 'Cost Down' },
        ],
      },
      {
        layout: 'bullets',
        title: 'Rollout Plan',
        items: [
          { title: 'Q2', description: 'Pilot with three business units.' },
          { title: 'Q3', description: 'Expand templates and governance.' },
          { title: 'Q4', description: 'Global launch and enablement.' },
        ],
      },
      {
        layout: 'bullets',
        title: 'Call to Action',
        bullets: ['Approve phase-one rollout and align execution squads for the next 90 days.'],
        contact: 'strategy@galaxy-ia.com',
      },
    ],
  },
}

const THEME_ORDER: ThemeStyle[] = ['dark-glass', 'light-minimal', 'bold-gradient', 'corporate', 'editorial', 'gamma-auto']
const INDUSTRY_ORDER: IndustryPreset[] = ['startup', 'education', 'agency', 'finance']
const TEXTURE_MAP: Record<IndustryPreset, string> = {
  startup: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2"/></filter><rect width="180" height="180" filter="url(%23n)" opacity="0.16"/></svg>',
  education: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220"><defs><pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.3" fill="gray" fill-opacity="0.2"/></pattern></defs><rect width="100%25" height="100%25" fill="url(%23dots)"/></svg>',
  agency: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><defs><pattern id="g" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M0 24 L24 0" stroke="gray" stroke-opacity="0.16" stroke-width="1"/></pattern></defs><rect width="100%25" height="100%25" fill="url(%23g)"/></svg>',
  finance: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="260" height="260"><defs><pattern id="grid" width="26" height="26" patternUnits="userSpaceOnUse"><path d="M26 0H0V26" fill="none" stroke="gray" stroke-opacity="0.16" stroke-width="1"/></pattern></defs><rect width="100%25" height="100%25" fill="url(%23grid)"/></svg>',
}
const INDUSTRY_COPY: Record<IndustryPreset, { label: string; suffix: string }> = {
  startup: { label: 'Startup', suffix: 'for Startups' },
  education: { label: 'Education', suffix: 'for Education' },
  agency: { label: 'Agency', suffix: 'for Creative Agencies' },
  finance: { label: 'Finance', suffix: 'for Finance Teams' },
}

const THEME_INFO: Record<ThemeStyle, { icon: string; title: string; description: string }> = {
  'dark-glass': {
    icon: '✨',
    title: 'Dark Glass',
    description: 'Futurista, premium y cinematográfico. Ideal para tech, AI y startups.',
  },
  'light-minimal': {
    icon: '📘',
    title: 'Light Minimal',
    description: 'Limpio y editorial. Perfecto para educación, salud y consultoría.',
  },
  'bold-gradient': {
    icon: '🔥',
    title: 'Bold Gradient',
    description: 'Alto impacto visual, ideal para campañas, eventos y marketing.',
  },
  corporate: {
    icon: '💼',
    title: 'Corporate',
    description: 'Formal y ejecutivo, con enfoque en confianza y claridad de datos.',
  },
  editorial: {
    icon: '🎨',
    title: 'Editorial',
    description: 'Estilo revista con fotografía protagonista y ritmo visual.',
  },
  'gamma-auto': {
    icon: '🧪',
    title: 'Gamma Auto Layout',
    description: 'Caso de prueba intencionalmente repetitivo para visualizar la variación automática de layouts.',
  },
}

export default function TestPage() {
  const [selectedTheme, setSelectedTheme] = useState<ThemeStyle>('dark-glass')
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryPreset>('startup')
  const [showDiversityMeter, setShowDiversityMeter] = useState(true)
  const theme = useMemo(() => {
    const base = THEMES[selectedTheme]
    const texture = TEXTURE_MAP[selectedIndustry]
    const copy = INDUSTRY_COPY[selectedIndustry]
    const seededSlides = optimizePresentationSlides(base.slides as Slide[], {
      seedKey: `${selectedTheme}-${selectedIndustry}-${base.titulo}`,
    })
    return {
      ...base,
      titulo: `${base.titulo} ${copy.suffix}`,
      slides: seededSlides.map((slide) => ({
        ...slide,
        texture_url: texture,
      })),
    }
  }, [selectedTheme, selectedIndustry])

  const diversityReport = useMemo(() => analyzeSlideDiversity(theme.slides as Slide[]), [theme])
  const avgPct = Math.round(diversityReport.averageDiversity * 100)

  return (
    <main className="flex h-screen bg-gray-950 text-white">
      <aside className="w-96 bg-gray-900 border-r border-gray-800 overflow-y-auto">
        <div className="sticky top-0 bg-gray-900/95 backdrop-blur border-b border-gray-800 p-6">
          <h1 className="text-2xl font-black mb-1">Canva-like Theme Lab</h1>
          <p className="text-xs text-gray-400">5 estilos con enfoque en imagen y composición</p>
        </div>

        <div className="p-5 space-y-3">
          <div className="rounded-xl border border-gray-800 bg-gray-800/40 p-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-wider text-gray-400">Diversity meter</p>
              <button
                onClick={() => setShowDiversityMeter(v => !v)}
                className="text-[11px] px-2 py-1 rounded-md border border-gray-700 bg-gray-900/50 text-gray-300 hover:bg-gray-800"
              >
                {showDiversityMeter ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            <div className="mt-2">
              <div className="h-2 rounded-full bg-gray-900 overflow-hidden">
                <div
                  className={`h-full ${avgPct >= 60 ? 'bg-emerald-400' : avgPct >= 45 ? 'bg-amber-400' : 'bg-rose-400'}`}
                  style={{ width: `${Math.max(4, avgPct)}%` }}
                />
              </div>
              <p className="text-xs text-gray-300 mt-2">
                Diferencia promedio: <span className="font-semibold">{avgPct}%</span> {avgPct >= 60 ? '✓ objetivo' : '· por debajo de 60%'}
              </p>
            </div>
            {showDiversityMeter && (
              <div className="mt-3 max-h-36 overflow-y-auto pr-1 space-y-1.5">
                {diversityReport.pairs.map((pair, idx) => {
                  const pct = Math.round(pair.diversity * 100)
                  return (
                    <div key={idx} className="text-[11px] flex items-center justify-between rounded-md px-2 py-1 bg-gray-900/55 border border-gray-800">
                      <span className="text-gray-400">Slide {pair.from + 1} → {pair.to + 1}</span>
                      <span className={pct >= 60 ? 'text-emerald-300' : pct >= 45 ? 'text-amber-300' : 'text-rose-300'}>
                        {pct}%
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-800/40 p-3">
            <p className="text-[11px] uppercase tracking-wider text-gray-400 mb-2">Preset industria</p>
            <div className="flex flex-wrap gap-2">
              {INDUSTRY_ORDER.map((preset) => {
                const selected = selectedIndustry === preset
                return (
                  <button
                    key={preset}
                    onClick={() => setSelectedIndustry(preset)}
                    className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                      selected
                        ? 'border-indigo-400/60 bg-indigo-500/15 text-indigo-200'
                        : 'border-gray-700 bg-gray-900/40 text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    {INDUSTRY_COPY[preset].label}
                  </button>
                )
              })}
            </div>
          </div>
          {THEME_ORDER.map((themeId) => {
            const info = THEME_INFO[themeId]
            const selected = selectedTheme === themeId
            return (
              <button
                key={themeId}
                onClick={() => setSelectedTheme(themeId)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  selected
                    ? 'border-indigo-400/60 bg-indigo-500/15'
                    : 'border-gray-700 bg-gray-800/50 hover:bg-gray-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl">{info.icon}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{info.title}</p>
                    <p className="text-xs text-gray-400 mt-1">{info.description}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </aside>

      <section className="flex-1 p-6 md:p-8 overflow-hidden">
        <div className="h-full w-full max-w-6xl mx-auto">
          <PresentationViewer contenido={theme} titulo={theme.titulo} />
        </div>
      </section>
    </main>
  )
}
