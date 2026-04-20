'use client'

import React, { useState, useMemo } from 'react'
import { X, Sparkles, FileText, Presentation, Code, ImageIcon, Zap } from 'lucide-react'

export type DetectedIntent = 'documento' | 'presentacion' | 'codigo' | 'imagen' | null

interface PreflightConfig {
  tone: string
  length: string
  audience: string
  language: string
  style: string
  presentationFormat: string
  imageStyle: string
  narrative: string
}

interface PreflightFormProps {
  userMessage: string
  detectedIntent: DetectedIntent
  onConfirm: (enrichedPrompt: string) => void
  onSkip: () => void
  onCancel: () => void
}

const INTENT_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  documento: { label: 'Documento', icon: <FileText className="w-4 h-4" />, color: 'text-blue-400' },
  presentacion: { label: 'Presentación', icon: <Presentation className="w-4 h-4" />, color: 'text-purple-400' },
  codigo: { label: 'Código', icon: <Code className="w-4 h-4" />, color: 'text-green-400' },
  imagen: { label: 'Imagen', icon: <ImageIcon className="w-4 h-4" />, color: 'text-pink-400' },
}

const TONE_OPTIONS = [
  { value: 'profesional', label: 'Profesional' },
  { value: 'casual', label: 'Casual' },
  { value: 'tecnico', label: 'Técnico' },
  { value: 'academico', label: 'Académico' },
  { value: 'creativo', label: 'Creativo' },
]

const LENGTH_OPTIONS: Record<string, { value: string; label: string }[]> = {
  documento: [
    { value: 'corto', label: 'Corto (~500 palabras)' },
    { value: 'medio', label: 'Medio (~1500 palabras)' },
    { value: 'largo', label: 'Largo (~3000 palabras)' },
  ],
  presentacion: [
    { value: '8', label: '8 slides' },
    { value: '12', label: '12 slides' },
    { value: '16', label: '16 slides' },
    { value: '20', label: '20 slides' },
  ],
  codigo: [
    { value: 'simple', label: 'Simple (1 sección)' },
    { value: 'completo', label: 'Completo (multi-sección)' },
    { value: 'full-page', label: 'Página completa' },
  ],
  imagen: [
    { value: 'cuadrada', label: 'Cuadrada (1:1)' },
    { value: 'horizontal', label: 'Horizontal (16:9)' },
    { value: 'vertical', label: 'Vertical (9:16)' },
  ],
}

const AUDIENCE_OPTIONS = [
  { value: 'general', label: 'General' },
  { value: 'ejecutivos', label: 'Ejecutivos' },
  { value: 'tecnico', label: 'Equipo técnico' },
  { value: 'estudiantes', label: 'Estudiantes' },
  { value: 'clientes', label: 'Clientes' },
]

const LANGUAGE_OPTIONS = [
  { value: 'español', label: 'Español' },
  { value: 'inglés', label: 'English' },
  { value: 'portugués', label: 'Português' },
]

const STYLE_OPTIONS: Record<string, { value: string; label: string }[]> = {
  presentacion: [
    { value: 'oscuro-elegante', label: 'Oscuro elegante' },
    { value: 'corporativo', label: 'Corporativo' },
    { value: 'colorido', label: 'Colorido y vibrante' },
    { value: 'minimalista', label: 'Minimalista' },
    { value: 'gradientes', label: 'Gradientes modernos' },
  ],
  codigo: [
    { value: 'moderno', label: 'Moderno / Glassmorphism' },
    { value: 'minimalista', label: 'Minimalista' },
    { value: 'colorido', label: 'Gradientes vibrantes' },
    { value: 'corporativo', label: 'Corporativo' },
  ],
  imagen: [
    { value: 'fotorrealista', label: 'Fotorrealista' },
    { value: 'digital-art', label: 'Arte digital' },
    { value: 'ilustracion', label: 'Ilustración' },
    { value: 'minimalista', label: 'Minimalista' },
  ],
  documento: [],
}

const PRESENTATION_FORMAT_OPTIONS = [
  { value: 'presenter', label: 'Presenter Slides (visual, pocas palabras)' },
  { value: 'detailed', label: 'Detailed Deck (más texto, para enviar)' },
]

const IMAGE_STYLE_OPTIONS = [
  { value: 'editorial', label: 'Fotografía editorial' },
  { value: 'flat-illustration', label: 'Ilustración flat' },
  { value: '3d-isometric', label: '3D isométrico' },
  { value: 'cinematic', label: 'Cinematográfico' },
  { value: 'none', label: 'Sin imágenes' },
]

const NARRATIVE_OPTIONS = [
  { value: 'problema-solucion', label: 'Problema → Solución' },
  { value: 'cronologico', label: 'Cronológico / Historia' },
  { value: 'comparativo', label: 'Comparativo' },
  { value: 'educativo', label: 'Educativo paso a paso' },
  { value: 'pitch', label: 'Pitch (Hook → Visión → CTA)' },
]

function ChipSelect({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
            value === opt.value
              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
              : 'bg-white/[0.03] text-white/40 border-white/[0.06] hover:bg-white/[0.06] hover:text-white/60'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// Build an enriched prompt by appending user preferences to their original message
function buildEnrichedPrompt(original: string, intent: DetectedIntent, config: PreflightConfig): string {
  const parts: string[] = [original]
  const extras: string[] = []

  if (config.language && config.language !== 'español') {
    extras.push(`Idioma: ${config.language}`)
  }
  if (config.tone) {
    extras.push(`Tono: ${config.tone}`)
  }
  if (config.audience && config.audience !== 'general') {
    extras.push(`Público objetivo: ${config.audience}`)
  }

  if (intent === 'documento' && config.length) {
    const lengthMap: Record<string, string> = { corto: '~500 palabras', medio: '~1500 palabras', largo: '~3000 palabras' }
    extras.push(`Extensión: ${lengthMap[config.length] || config.length}`)
  }
  if (intent === 'presentacion' && config.length) {
    extras.push(`Número de slides: ${config.length}`)
  }
  if (intent === 'codigo' && config.length) {
    extras.push(`Complejidad: ${config.length}`)
  }
  if (intent === 'imagen' && config.length) {
    extras.push(`Formato: ${config.length}`)
  }

  if (config.style) {
    extras.push(`Estilo visual: ${config.style}`)
  }

  // Presentation-specific options
  if (intent === 'presentacion') {
    if (config.presentationFormat) {
      const fmtMap: Record<string, string> = { presenter: 'Slides de presentador (visual, pocas palabras, más imágenes)', detailed: 'Deck detallado (más texto explicativo, para enviar sin presentar)' }
      extras.push(`Formato: ${fmtMap[config.presentationFormat] || config.presentationFormat}`)
    }
    if (config.imageStyle && config.imageStyle !== 'none') {
      const imgMap: Record<string, string> = { editorial: 'fotografía editorial profesional', 'flat-illustration': 'ilustración flat moderna', '3d-isometric': 'renders 3D isométricos', cinematic: 'fotografía cinematográfica dramática' }
      extras.push(`Estilo de imágenes: ${imgMap[config.imageStyle] || config.imageStyle}`)
    }
    if (config.imageStyle === 'none') {
      extras.push('NO generar imágenes (solo texto y elementos gráficos)')
    }
    if (config.narrative) {
      const narMap: Record<string, string> = { 'problema-solucion': 'Estructura Problema → Solución → Evidencia', cronologico: 'Narrativa cronológica / Historia', comparativo: 'Estructura comparativa (antes vs después, nosotros vs competencia)', educativo: 'Estructura educativa paso a paso', pitch: 'Estructura Pitch: Hook → Visión → Solución → Métricas → CTA' }
      extras.push(`Marco narrativo: ${narMap[config.narrative] || config.narrative}`)
    }
  }

  if (extras.length > 0) {
    parts.push('\n\n[Preferencias del usuario: ' + extras.join(' | ') + ']')
  }

  return parts.join('')
}

export function PreflightForm({ userMessage, detectedIntent, onConfirm, onSkip, onCancel }: PreflightFormProps) {
  const [config, setConfig] = useState<PreflightConfig>({
    tone: 'profesional',
    length: detectedIntent === 'presentacion' ? '12' : detectedIntent === 'documento' ? 'medio' : detectedIntent === 'codigo' ? 'completo' : 'cuadrada',
    audience: 'general',
    language: 'español',
    style: '',
    presentationFormat: 'presenter',
    imageStyle: 'editorial',
    narrative: 'problema-solucion',
  })

  const meta = detectedIntent ? INTENT_META[detectedIntent] : null
  const lengthOpts = detectedIntent ? LENGTH_OPTIONS[detectedIntent] || [] : []
  const styleOpts = detectedIntent ? STYLE_OPTIONS[detectedIntent] || [] : []

  const enrichedPrompt = useMemo(
    () => buildEnrichedPrompt(userMessage, detectedIntent, config),
    [userMessage, detectedIntent, config]
  )

  const handleConfirm = () => {
    onConfirm(enrichedPrompt)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-zinc-900/95 border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
        {/* Top shine */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/20">
              <Sparkles className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white/85 tracking-tight">Personaliza tu contenido</h2>
              {meta && (
                <div className={`flex items-center gap-1.5 text-[11px] mt-0.5 ${meta.color}`}>
                  {meta.icon}
                  <span>{meta.label} detectada</span>
                </div>
              )}
            </div>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User message preview */}
        <div className="px-5 pt-4 pb-2">
          <div className="text-xs text-white/25 uppercase tracking-wider font-medium mb-1.5">Tu instrucción</div>
          <div className="text-sm text-white/60 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 line-clamp-2">
            {userMessage}
          </div>
        </div>

        {/* Options */}
        <div className="px-5 py-3 space-y-4 max-h-[50vh] overflow-y-auto">
          {/* Tone */}
          <div>
            <label className="text-[11px] text-white/30 uppercase tracking-wider font-medium mb-2 block">Tono</label>
            <ChipSelect options={TONE_OPTIONS} value={config.tone} onChange={v => setConfig(c => ({ ...c, tone: v }))} />
          </div>

          {/* Length / Slides / Complexity */}
          {lengthOpts.length > 0 && (
            <div>
              <label className="text-[11px] text-white/30 uppercase tracking-wider font-medium mb-2 block">
                {detectedIntent === 'presentacion' ? 'Slides' : detectedIntent === 'documento' ? 'Extensión' : detectedIntent === 'imagen' ? 'Formato' : 'Complejidad'}
              </label>
              <ChipSelect options={lengthOpts} value={config.length} onChange={v => setConfig(c => ({ ...c, length: v }))} />
            </div>
          )}

          {/* Audience */}
          {detectedIntent !== 'imagen' && (
            <div>
              <label className="text-[11px] text-white/30 uppercase tracking-wider font-medium mb-2 block">Público</label>
              <ChipSelect options={AUDIENCE_OPTIONS} value={config.audience} onChange={v => setConfig(c => ({ ...c, audience: v }))} />
            </div>
          )}

          {/* Visual style */}
          {styleOpts.length > 0 && (
            <div>
              <label className="text-[11px] text-white/30 uppercase tracking-wider font-medium mb-2 block">Estilo visual</label>
              <ChipSelect options={styleOpts} value={config.style} onChange={v => setConfig(c => ({ ...c, style: v }))} />
            </div>
          )}

          {/* Language */}
          <div>
            <label className="text-[11px] text-white/30 uppercase tracking-wider font-medium mb-2 block">Idioma</label>
            <ChipSelect options={LANGUAGE_OPTIONS} value={config.language} onChange={v => setConfig(c => ({ ...c, language: v }))} />
          </div>

          {/* Presentation-specific options */}
          {detectedIntent === 'presentacion' && (
            <>
              <div className="border-t border-white/[0.06] pt-3 mt-1">
                <label className="text-[11px] text-white/30 uppercase tracking-wider font-medium mb-2 block">Formato de presentación</label>
                <ChipSelect options={PRESENTATION_FORMAT_OPTIONS} value={config.presentationFormat} onChange={v => setConfig(c => ({ ...c, presentationFormat: v }))} />
              </div>
              <div>
                <label className="text-[11px] text-white/30 uppercase tracking-wider font-medium mb-2 block">Estilo de imágenes</label>
                <ChipSelect options={IMAGE_STYLE_OPTIONS} value={config.imageStyle} onChange={v => setConfig(c => ({ ...c, imageStyle: v }))} />
              </div>
              <div>
                <label className="text-[11px] text-white/30 uppercase tracking-wider font-medium mb-2 block">Marco narrativo</label>
                <ChipSelect options={NARRATIVE_OPTIONS} value={config.narrative} onChange={v => setConfig(c => ({ ...c, narrative: v }))} />
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-white/[0.06] bg-white/[0.01]">
          <button
            onClick={onSkip}
            className="text-xs text-white/30 hover:text-white/50 transition-colors px-3 py-1.5"
          >
            Saltar y generar directo →
          </button>
          <button
            onClick={handleConfirm}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/30 hover:text-white transition-all text-sm font-medium"
          >
            <Zap className="w-3.5 h-3.5" />
            Generar con preferencias
          </button>
        </div>
      </div>
    </div>
  )
}
