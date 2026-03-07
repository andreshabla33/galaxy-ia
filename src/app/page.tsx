'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'

// FSD imports: features → widgets → shared (dependencia unidireccional)
import { useAudioVisualizer } from '@/features/voice-input'
import { useChat } from '@/features/ai-chat'
import { useAppStore, SettingsModal } from '@/features/settings'
import { useAuthStore } from '@/features/auth'
import { ChatInput } from '@/widgets/chat-input'
import { ArtifactsPanel } from '@/widgets/artifacts-panel'
import { TemplateSelector } from '@/widgets/template-selector'
import { supabase } from '@/shared/lib/supabase'
import { UserMenu } from '@/widgets/user-menu'
import type { ParsedArtifact } from '@/shared/lib/artifact-parser'
import type { Template } from '@/shared/config/templates'
import { saveArtifactMemory, buildArtifactSummary } from '@/shared/lib/memory'
import { useMediaQuery } from '@/shared/hooks/useMediaQuery'

// Frases dinámicas rotativas para el estado de loading en el galaxy canvas
const LOADING_PHRASES = [
  'Creando algo increíble...',
  'Conectando neuronas artificiales...',
  'Transformando ideas en realidad...',
  'La magia está sucediendo...',
  'Tejiendo píxeles con propósito...',
  'Construyendo tu visión...',
  'Un momento de genialidad...',
  'Preparando algo épico...',
  'Dale forma a lo imposible...',
  'Tu idea está cobrando vida...',
  'Iterando a la velocidad de la luz...',
  'Casi listo, esto va a ser bueno...',
  'Los electrones están trabajando...',
  'Generando pura creatividad...',
  'Mezclando arte y tecnología...',
]

const IDLE_PHRASES = [
  '¿Qué vamos a crear hoy?',
  'Tu próxima gran idea empieza aquí',
  'Describe tu visión y la hacemos realidad',
  'El lienzo está listo para ti',
  'Crea algo que no existía antes',
]

function useRotatingPhrase(phrases: string[], intervalMs: number, active: boolean) {
  const [index, setIndex] = useState(0)
  const [fade, setFade] = useState(true)
  useEffect(() => {
    if (!active) { setIndex(0); setFade(true); return }
    const timer = setInterval(() => {
      setFade(false)
      setTimeout(() => {
        setIndex(prev => (prev + 1) % phrases.length)
        setFade(true)
      }, 400)
    }, intervalMs)
    return () => clearInterval(timer)
  }, [active, phrases.length, intervalMs])
  return { text: phrases[index], fade }
}

const GalaxyCanvas = dynamic(
  () => import('@/widgets/galaxy-canvas/ui/GalaxyCanvas'),
  { ssr: false, loading: () => <div className="w-full h-full absolute inset-0 bg-black -z-10" /> }
)

// Frases de comando de voz para enviar (voice-first UX pattern)
// El usuario dice una de estas frases al final y el mensaje se envía automáticamente
const SEND_TRIGGERS = [
  'enviar', 'envía', 'envía eso', 'enviar eso',
  'listo', 'ya está', 'eso es todo', 'manda eso',
  'send', 'send it', 'that\'s it',
]

export default function Home() {
  const { isListening, setIsListening, apiKey, provider } = useAppStore()
  const user = useAuthStore((s) => s.user)
  const { isMobile, isTablet, isDesktop } = useMediaQuery()
  const [panelOpen, setPanelOpen] = useState(true)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showArtifactOverlay, setShowArtifactOverlay] = useState(false)
  const inputRef = useRef<string>('')
  const stopListeningRef = useRef<(() => void) | null>(null)

  // Guardar artefacto en Supabase cuando el LLM genera uno
  const handleArtifact = useCallback(async (artifact: ParsedArtifact) => {
    if (!user) { console.warn('No user, skipping artifact save'); return }
    const { error } = await supabase.from('artefactos').insert({
      tipo: artifact.type,
      titulo: artifact.titulo,
      subtipo: artifact.subtipo,
      contenido: artifact.contenido,
      metadata: {
        ...(artifact.type === 'documento' ? { word_count: artifact.contenido.word_count } : {}),
        ...(artifact.type === 'presentacion' ? { total_slides: artifact.contenido.total_slides } : {}),
        ...(artifact.type === 'codigo' ? { framework: artifact.contenido.framework } : {}),
      },
      creado_por: user.id,
    })
    if (error) {
      console.error('Error saving artifact:', error.message, error.details, error.hint)
    } else {
      console.log('Artifact saved:', artifact.titulo)
      // Guardar embedding para memoria de contexto (async, no bloquea)
      if (apiKey) {
        const summary = buildArtifactSummary(artifact.type, artifact.titulo, artifact.contenido)
        saveArtifactMemory('00000000-0000-0000-0000-000000000000', user.id, summary, apiKey, {
          type: artifact.type,
          titulo: artifact.titulo,
          subtipo: artifact.subtipo,
        }).catch(() => {}) // Silent fail — memory is optional
      }
    }
  }, [user, apiKey])

  const { messages, input, handleInputChange, setInput, append, isLoading, lastArtifact } = useChat({
    apiKey,
    provider,
    onArtifact: handleArtifact,
  })

  // Rotating phrases for galaxy heading
  const loadingPhrase = useRotatingPhrase(LOADING_PHRASES, 3000, isLoading)
  const idlePhrase = useRotatingPhrase(IDLE_PHRASES, 8000, !isLoading && !isListening)

  inputRef.current = input

  const handleSilenceStop = useCallback(() => {
    stopListeningRef.current?.()
    setIsListening(false)
    const currentInput = inputRef.current
    if (currentInput.trim() && apiKey) {
      append({ role: 'user', content: currentInput })
      setInput('')
    }
  }, [apiKey, append, setInput, setIsListening])

  const { volume, frequencyRef, startListening, stopListening, isRecording, error: audioError, transcript } = useAudioVisualizer({
    onSilenceStop: handleSilenceStop,
    silenceThreshold: 0.1,
    silenceTimeout: 3000,
  })

  stopListeningRef.current = stopListening

  // Detectar trigger phrases de voz para enviar automáticamente
  const voiceSendingRef = useRef(false)
  useEffect(() => {
    if (!isRecording || !transcript) return
    setInput(transcript)

    // Verificar si el transcript termina con una frase de comando de voz
    const lower = transcript.toLowerCase().trim()
    for (const trigger of SEND_TRIGGERS) {
      if (lower.endsWith(trigger)) {
        // Evitar doble envío
        if (voiceSendingRef.current) return
        voiceSendingRef.current = true

        // Limpiar: quitar la frase trigger del mensaje
        const cleanMsg = transcript.trim().slice(0, -trigger.length).trim()

        // Pequeño delay para que el usuario vea que se detectó el comando
        setTimeout(() => {
          stopListeningRef.current?.()
          setIsListening(false)
          if (cleanMsg && apiKey) {
            setInput(cleanMsg)
            append({ role: 'user', content: cleanMsg })
            setInput('')
          }
          voiceSendingRef.current = false
        }, 300)
        return
      }
    }
  }, [transcript, isRecording, setInput, apiKey, append, setIsListening])

  useEffect(() => {
    if (messages.length > 0) setPanelOpen(true)
  }, [messages.length])

  // Enviar manualmente mientras graba (botón Send durante recording)
  const sendVoice = useCallback(() => {
    stopListening()
    setIsListening(false)
    const currentInput = inputRef.current
    if (currentInput.trim() && apiKey) {
      append({ role: 'user', content: currentInput })
      setInput('')
    } else if (!apiKey && currentInput.trim()) {
      alert('Por favor, configura tu API Key en los ajustes primero.')
    }
  }, [apiKey, append, setInput, setIsListening, stopListening])

  const toggleRecording = async () => {
    if (isRecording) {
      stopListening()
      setIsListening(false)
    } else {
      setInput('')
      await startListening()
      setIsListening(true)
    }
  }

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!apiKey) { alert('Por favor, configura tu API Key en los ajustes primero.'); return }
    if (!input.trim()) return
    append({ role: 'user', content: input })
    setInput('')
  }

  const handleTemplateSelect = (template: Template, topic: string) => {
    setShowTemplates(false)
    if (!apiKey) { alert('Configura tu API Key primero.'); return }
    const fullPrompt = template.prompt + topic
    append({ role: 'user', content: fullPrompt })
  }

  // Auto-open artifact overlay when artifacts arrive (tablet/mobile)
  useEffect(() => {
    if (!isDesktop && lastArtifact) {
      setShowArtifactOverlay(true)
    }
  }, [lastArtifact, isDesktop])

  // Galaxy + Chat input section (reusable across layouts)
  const galaxyChatSection = (
    <div className={`flex-1 flex flex-col ${isMobile ? 'justify-center' : 'justify-end'} ${isMobile ? 'px-4 pb-4' : 'p-8 pb-12'}`}>
      <div className={`${isMobile ? 'w-full' : isTablet ? 'max-w-xl mx-auto w-full' : 'max-w-2xl mx-auto w-full'}`}>
        <h1 className={`${isMobile ? 'text-xl text-center' : 'text-4xl'} font-light mb-6 transition-all duration-700 min-h-[36px] md:min-h-[48px] ${isListening ? 'text-indigo-300 scale-105 transform translate-y-[-10px] opacity-100' : isLoading ? '' : ''}`}>
          {isListening ? (
            <span className="text-indigo-300">Escuchando tu idea...</span>
          ) : isLoading ? (
            <span className={`bg-gradient-to-r from-cyan-400 via-indigo-400 to-fuchsia-400 bg-clip-text text-transparent transition-opacity duration-400 ${loadingPhrase.fade ? 'opacity-100' : 'opacity-0'}`}>
              {loadingPhrase.text}
            </span>
          ) : (
            <span className={`bg-gradient-to-r from-indigo-400 to-fuchsia-400 bg-clip-text text-transparent transition-opacity duration-400 ${idlePhrase.fade ? 'opacity-80' : 'opacity-0'}`}>
              {idlePhrase.text}
            </span>
          )}
        </h1>

        {!apiKey && (
          <div className="mb-4 text-amber-400/80 text-xs bg-amber-400/5 p-2.5 rounded-lg border border-amber-400/10">
            Configura tu API Key de <strong className="capitalize">{provider}</strong> en ⚙️ Ajustes para empezar.
          </div>
        )}

        {audioError && (
          <div className="mb-4 text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">
            {audioError}
          </div>
        )}

        {/* Template button */}
        <div className={`mb-3 flex gap-2 ${isMobile ? 'justify-center' : ''}`}>
          <button
            onClick={() => setShowTemplates(true)}
            className="text-xs px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white/35 hover:bg-white/[0.06] hover:text-white/55 hover:border-white/[0.12] transition-all flex items-center gap-1.5"
          >
            <span>✨</span> Usar plantilla
          </button>
        </div>

        <ChatInput
          input={input}
          isListening={isListening}
          isLoading={isLoading}
          onInputChange={handleInputChange}
          onSubmit={onSubmit}
          onToggleRecording={toggleRecording}
          onSendVoice={sendVoice}
        />
      </div>
    </div>
  )

  return (
    <main className="flex min-h-screen text-white overflow-hidden relative">
      <SettingsModal />
      {showTemplates && <TemplateSelector onSelectTemplate={handleTemplateSelect} onClose={() => setShowTemplates(false)} />}

      {/* User avatar menu */}
      {user && (
        <div className="fixed top-4 right-4 z-50">
          <UserMenu user={user} />
        </div>
      )}

      {/* Galaxy Canvas — always rendered as background */}
      <GalaxyCanvas isListening={isListening || isLoading} volume={isLoading ? 0.3 : volume} frequencyRef={frequencyRef} artifactType={lastArtifact?.type ?? null} panelOpen={isDesktop && panelOpen && messages.length > 0} />

      {/* ═══ DESKTOP LAYOUT: side-by-side ═══ */}
      {isDesktop && (
        <div className="flex w-full h-screen relative z-10">
          {galaxyChatSection}
          <ArtifactsPanel
            messages={messages}
            isLoading={isLoading}
            isOpen={panelOpen}
            onClose={() => setPanelOpen(false)}
          />
        </div>
      )}

      {/* ═══ TABLET LAYOUT: galaxy + chat, overlay for artifacts ═══ */}
      {isTablet && (
        <div className="flex flex-col w-full h-screen relative z-10">
          {galaxyChatSection}

          {/* Artifact overlay */}
          {showArtifactOverlay && messages.length > 0 && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                  <span className="text-sm text-white/60">Resultado</span>
                  <button onClick={() => setShowArtifactOverlay(false)} className="text-white/40 hover:text-white text-xl px-2">✕</button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <ArtifactsPanel
                    messages={messages}
                    isLoading={isLoading}
                    isOpen={true}
                    onClose={() => setShowArtifactOverlay(false)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ MOBILE LAYOUT: galaxy + centered chat, fullscreen overlay for artifacts ═══ */}
      {isMobile && (
        <div className="flex flex-col w-full h-screen relative z-10">
          {galaxyChatSection}

          {/* Artifact fullscreen overlay — slides up when artifact is generated */}
          {showArtifactOverlay && messages.length > 0 && (
            <div className="fixed inset-0 z-50 bg-zinc-950/95 backdrop-blur-md" style={{ animation: 'slideUp 0.3s ease-out' }}>
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
                  <span className="text-sm text-white/60">Resultado</span>
                  <button onClick={() => setShowArtifactOverlay(false)} className="text-white/40 hover:text-white text-xl px-2">✕</button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <ArtifactsPanel
                    messages={messages}
                    isLoading={isLoading}
                    isOpen={true}
                    onClose={() => setShowArtifactOverlay(false)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  )
}
