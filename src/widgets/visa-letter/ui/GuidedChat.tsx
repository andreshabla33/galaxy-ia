'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Send, SkipForward, ArrowLeft, Loader2, Settings } from 'lucide-react'
import { useVisaLetterStore } from '@/features/visa-letter'
import { useAppStore } from '@/features/settings'
import { VISA_LETTER_STEPS } from '@/shared/config/visa-letter-prompts'
import { MessageBubble } from './MessageBubble'

interface GuidedChatProps {
  onBack: () => void
}

export function GuidedChat({ onBack }: GuidedChatProps) {
  const {
    messages,
    currentStep,
    totalSteps,
    phase,
    isLoading,
    answerStep,
    skipStep,
    goBack,
    addMessage,
  } = useVisaLetterStore()

  const { apiKey, openSettings, provider } = useAppStore()

  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Initialize first question on mount
  useEffect(() => {
    if (messages.length === 0) {
      const firstStep = VISA_LETTER_STEPS[0]
      addMessage({
        role: 'assistant',
        content: `¡Hola! Voy a ayudarte a crear una **Carta de Experto** profesional para una petición de visa. Te haré ${totalSteps} preguntas para recopilar toda la información necesaria.\n\n${firstStep.question}${firstStep.helperText ? `\n\n💡 *${firstStep.helperText}*` : ''}`,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input after each question
  useEffect(() => {
    if (phase === 'questions') {
      inputRef.current?.focus()
    }
  }, [currentStep, phase])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || phase !== 'questions') return
    answerStep(input.trim())
    setInput('')
  }

  const handleSkip = () => {
    const step = VISA_LETTER_STEPS[currentStep]
    if (step?.required) return
    skipStep()
    setInput('')
  }

  const currentStepData = currentStep < VISA_LETTER_STEPS.length ? VISA_LETTER_STEPS[currentStep] : null
  const canSkip = currentStepData && !currentStepData.required
  const progress = Math.min((currentStep / totalSteps) * 100, 100)

  return (
    <div className="flex flex-col h-full">
      {/* Header with progress */}
      <div className="shrink-0 border-b border-white/[0.06] bg-zinc-950/80 backdrop-blur-xl">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white/70 transition-colors"
            title="Volver"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <h2 className="text-sm font-medium text-white/80 flex items-center gap-2">
              🏛️ Carta de Experto para Visa
            </h2>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-[10px] text-white/30 tabular-nums">
                {Math.min(currentStep + 1, totalSteps)}/{totalSteps}
              </span>
            </div>
          </div>
          <button
            onClick={openSettings}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-colors"
            title="Ajustes"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* API Key warning */}
        {!apiKey && (
          <div className="mx-4 mb-2 mt-1 text-amber-400/80 text-xs bg-amber-400/5 p-2.5 rounded-lg border border-amber-400/10">
            Configura tu API Key de <strong className="capitalize">{provider}</strong> en ⚙️ Ajustes para poder generar la carta.
          </div>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isLatest={i === messages.length - 1}
          />
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
            </div>
            <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-indigo-400/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-indigo-400/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-indigo-400/60 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      {phase === 'questions' && currentStepData && (
        <div className="shrink-0 border-t border-white/[0.06] bg-zinc-950/80 backdrop-blur-xl p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            {/* Back button */}
            {currentStep > 0 && (
              <button
                type="button"
                onClick={goBack}
                className="shrink-0 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all"
                title="Pregunta anterior"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}

            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={currentStepData.placeholder}
              className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white/80
                placeholder:text-white/20 focus:outline-none focus:border-indigo-500/30 focus:bg-white/[0.05] transition-all"
            />

            {/* Skip button (only for optional steps) */}
            {canSkip && (
              <button
                type="button"
                onClick={handleSkip}
                className="shrink-0 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all text-xs flex items-center gap-1"
              >
                <SkipForward className="w-3.5 h-3.5" />
                Omitir
              </button>
            )}

            {/* Send button */}
            <button
              type="submit"
              disabled={!input.trim()}
              className="shrink-0 p-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 
                hover:bg-indigo-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          {/* Step indicator */}
          <div className="mt-2 text-[10px] text-white/20 flex items-center justify-between">
            <span>
              {currentStepData.required ? '* Requerido' : 'Opcional — puedes omitir'}
            </span>
            <span>
              Paso {currentStep + 1} de {totalSteps}
            </span>
          </div>
        </div>
      )}

      {/* Generating state */}
      {(phase === 'generating' || isLoading) && phase !== 'document' && (
        <div className="shrink-0 border-t border-white/[0.06] bg-zinc-950/80 backdrop-blur-xl p-4">
          <div className="flex items-center justify-center gap-3 py-2">
            <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
            <span className="text-sm text-white/50">Generando carta de experto...</span>
          </div>
        </div>
      )}
    </div>
  )
}
