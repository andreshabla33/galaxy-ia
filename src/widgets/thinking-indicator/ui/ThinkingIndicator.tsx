'use client'

import { useState, useEffect, useRef } from 'react'
import { Sparkles, Brain, Palette, Code2, FileText, Image, Layers, Wand2 } from 'lucide-react'

const THINKING_STEPS = [
  { icon: Brain, text: 'Analizando tu solicitud...', color: 'text-indigo-400' },
  { icon: Sparkles, text: 'Diseñando la estructura...', color: 'text-fuchsia-400' },
  { icon: Wand2, text: 'Generando contenido...', color: 'text-cyan-400' },
  { icon: Layers, text: 'Refinando detalles...', color: 'text-purple-400' },
  { icon: Palette, text: 'Aplicando estilos...', color: 'text-pink-400' },
]

const TYPE_STEPS: Record<string, { icon: typeof Brain; text: string; color: string }[]> = {
  presentacion: [
    { icon: Brain, text: 'Analizando el tema...', color: 'text-indigo-400' },
    { icon: Layers, text: 'Estructurando slides...', color: 'text-cyan-400' },
    { icon: FileText, text: 'Redactando contenido...', color: 'text-fuchsia-400' },
    { icon: Image, text: 'Preparando imágenes...', color: 'text-pink-400' },
    { icon: Palette, text: 'Aplicando diseño visual...', color: 'text-purple-400' },
  ],
  documento: [
    { icon: Brain, text: 'Investigando el tema...', color: 'text-indigo-400' },
    { icon: Layers, text: 'Creando estructura...', color: 'text-cyan-400' },
    { icon: FileText, text: 'Redactando secciones...', color: 'text-fuchsia-400' },
    { icon: Wand2, text: 'Puliendo redacción...', color: 'text-purple-400' },
  ],
  codigo: [
    { icon: Brain, text: 'Analizando requerimientos...', color: 'text-indigo-400' },
    { icon: Code2, text: 'Escribiendo código...', color: 'text-green-400' },
    { icon: Layers, text: 'Componiendo interfaz...', color: 'text-cyan-400' },
    { icon: Wand2, text: 'Optimizando...', color: 'text-purple-400' },
  ],
  imagen: [
    { icon: Brain, text: 'Interpretando tu idea...', color: 'text-indigo-400' },
    { icon: Palette, text: 'Componiendo el prompt...', color: 'text-pink-400' },
    { icon: Image, text: 'Generando imagen...', color: 'text-cyan-400' },
  ],
}

interface ThinkingIndicatorProps {
  userMessage?: string
}

function detectType(msg: string): string | null {
  const lower = msg.toLowerCase()
  if (/presentaci[oó]n|slides|diapositivas|pitch|keynote/i.test(lower)) return 'presentacion'
  if (/documento|reporte|gu[ií]a|contrato|art[ií]culo|manual/i.test(lower)) return 'documento'
  if (/c[oó]digo|landing|componente|dashboard|p[aá]gina web|interfaz|formulario/i.test(lower)) return 'codigo'
  if (/imagen|foto|logo|ilustraci[oó]n|banner|poster|dise[ñn]o visual|arte/i.test(lower)) return 'imagen'
  return null
}

export function ThinkingIndicator({ userMessage = '' }: ThinkingIndicatorProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const type = detectType(userMessage)
  const steps = type ? (TYPE_STEPS[type] || THINKING_STEPS) : THINKING_STEPS

  useEffect(() => {
    setCurrentStep(0)
    setCompletedSteps([])

    let step = 0
    timerRef.current = setInterval(() => {
      step++
      if (step < steps.length) {
        setCompletedSteps(prev => [...prev, step - 1])
        setCurrentStep(step)
      } else {
        // Loop back with completed visual
        setCompletedSteps(prev => [...prev, step - 1])
      }
    }, 2200)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [steps.length])

  return (
    <div className="flex items-start">
      <div className="bg-zinc-900/70 border border-white/[0.06] backdrop-blur-xl rounded-2xl p-4 max-w-sm w-full">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-white" />
          </div>
          <span className="text-xs font-medium text-white/50">Galaxy AI está trabajando</span>
        </div>

        {/* Steps */}
        <div className="space-y-2">
          {steps.map((s, i) => {
            const Icon = s.icon
            const isCompleted = completedSteps.includes(i)
            const isCurrent = currentStep === i && !isCompleted

            return (
              <div
                key={i}
                className={`flex items-center gap-2.5 transition-all duration-500 ${
                  i > currentStep && !isCompleted ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
                }`}
              >
                {/* Status dot */}
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                  isCompleted
                    ? 'bg-emerald-500/20 border border-emerald-500/30'
                    : isCurrent
                    ? 'bg-white/[0.06] border border-white/[0.12]'
                    : 'bg-white/[0.03] border border-white/[0.06]'
                }`}>
                  {isCompleted ? (
                    <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : isCurrent ? (
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-indigo-400 to-fuchsia-400 animate-pulse" />
                  ) : null}
                </div>

                {/* Icon + text */}
                <Icon className={`w-3.5 h-3.5 shrink-0 transition-colors duration-300 ${
                  isCompleted ? 'text-emerald-400/60' : isCurrent ? s.color : 'text-white/20'
                }`} />
                <span className={`text-xs transition-colors duration-300 ${
                  isCompleted ? 'text-white/40 line-through decoration-white/20' : isCurrent ? 'text-white/70' : 'text-white/25'
                }`}>
                  {s.text}
                </span>

                {/* Spinner for current */}
                {isCurrent && (
                  <div className="w-3 h-3 border border-white/10 border-t-indigo-400 rounded-full animate-spin ml-auto" />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
