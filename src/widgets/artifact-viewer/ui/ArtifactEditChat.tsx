'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, MicOff, Send, Loader2, Sparkles } from 'lucide-react'
import type { ArtifactType } from '@/shared/config/artifact-prompts'

interface EditMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface ArtifactEditChatProps {
  onSendEdit: (instruction: string) => Promise<void>
  isEditing: boolean
  editHistory: EditMessage[]
  artifactType?: ArtifactType
}

const QUICK_ACTIONS: Record<ArtifactType, { label: string; prompt: string; icon: string }[]> = {
  presentacion: [
    { label: 'Más slides', prompt: 'Agrega 3 slides más con contenido relevante', icon: '📊' },
    { label: 'Colores cálidos', prompt: 'Cambia la paleta de colores a tonos cálidos (naranja, dorado, rojo)', icon: '🎨' },
    { label: 'Más visual', prompt: 'Agrega descripciones de imágenes y haz los slides más visuales con menos texto', icon: '🖼️' },
    { label: 'Más conciso', prompt: 'Reduce el texto de cada slide a lo esencial, máximo 3 bullets por slide', icon: '✂️' },
    { label: 'Agregar stats', prompt: 'Agrega un slide de estadísticas con datos relevantes al tema', icon: '📈' },
    { label: 'Tono formal', prompt: 'Cambia el tono a más formal y corporativo', icon: '👔' },
  ],
  documento: [
    { label: 'Más corto', prompt: 'Reduce el documento a la mitad manteniendo los puntos clave', icon: '✂️' },
    { label: 'Más detallado', prompt: 'Expande cada sección con más detalle y ejemplos', icon: '📝' },
    { label: 'Agregar tabla', prompt: 'Agrega una tabla comparativa relevante al tema', icon: '📊' },
    { label: 'Tono casual', prompt: 'Cambia el tono a más conversacional y accesible', icon: '💬' },
    { label: 'Agregar conclusión', prompt: 'Agrega una sección de conclusiones y próximos pasos', icon: '🎯' },
    { label: 'Formato ejecutivo', prompt: 'Reestructura como resumen ejecutivo con puntos clave al inicio', icon: '👔' },
  ],
  codigo: [
    { label: 'Modo oscuro', prompt: 'Cambia el tema a modo oscuro con colores elegantes', icon: '🌙' },
    { label: 'Más colorido', prompt: 'Agrega más colores vibrantes y gradientes al diseño', icon: '🎨' },
    { label: 'Responsive', prompt: 'Mejora la responsividad para móviles y tablets', icon: '📱' },
    { label: 'Animaciones', prompt: 'Agrega animaciones CSS sutiles de entrada y hover', icon: '✨' },
    { label: 'Agregar sección', prompt: 'Agrega una nueva sección con contenido relevante', icon: '➕' },
    { label: 'Minimalista', prompt: 'Simplifica el diseño a un estilo más minimalista', icon: '🔲' },
  ],
  imagen: [
    { label: 'Más detalle', prompt: 'Agrega más detalle y textura a la imagen, hazla más realista', icon: '🔍' },
    { label: 'Estilo anime', prompt: 'Cambia el estilo a anime/manga japonés con colores vibrantes', icon: '🎨' },
    { label: 'Fotorrealista', prompt: 'Hazla completamente fotorrealista, como una fotografía profesional', icon: '📷' },
    { label: 'Cambiar colores', prompt: 'Cambia la paleta de colores a tonos más cálidos y vibrantes', icon: '🌈' },
    { label: 'Vertical', prompt: 'Cambia el aspect ratio a 9:16 vertical, ideal para stories', icon: '📱' },
    { label: 'Minimalista', prompt: 'Simplifica la imagen a un estilo minimalista y limpio', icon: '✨' },
  ],
}

export function ArtifactEditChat({ onSendEdit, isEditing, editHistory, artifactType }: ArtifactEditChatProps) {
  const [input, setInput] = useState('')
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const historyEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to latest message
  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [editHistory.length])

  const stopVoice = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch (e) { /* ignore */ }
      recognitionRef.current = null
    }
    setIsListening(false)
  }, [])

  const startVoice = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'es-ES'

    recognition.onresult = (event: any) => {
      let transcript = ''
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      setInput(transcript)
    }

    recognition.onerror = (event: any) => {
      if (event.error !== 'aborted') {
        console.error('Edit voice error:', event.error)
      }
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }, [])

  const toggleVoice = () => {
    if (isListening) {
      stopVoice()
      // Auto-send if there's text
      if (input.trim()) {
        handleSend()
      }
    } else {
      setInput('')
      startVoice()
    }
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isEditing) return
    stopVoice()
    setInput('')
    await onSendEdit(text)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const actions = artifactType ? QUICK_ACTIONS[artifactType] : []

  return (
    <div className="border-t border-white/[0.08] bg-zinc-950/90 backdrop-blur-sm">
      {/* Quick action chips */}
      {actions.length > 0 && editHistory.length === 0 && !isEditing && (
        <div className="px-3 pt-3 pb-1">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span className="text-[10px] uppercase tracking-wider text-white/25 font-medium">Acciones rápidas</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {actions.map((action) => (
              <button
                key={action.label}
                onClick={() => onSendEdit(action.prompt)}
                disabled={isEditing}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs
                  bg-white/[0.03] border border-white/[0.06]
                  text-white/40 hover:text-white/70 hover:bg-white/[0.06] hover:border-white/[0.12]
                  active:scale-[0.97] transition-all duration-200
                  disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <span className="text-[11px]">{action.icon}</span>
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Edit history */}
      {editHistory.length > 0 && (
        <div className="max-h-32 overflow-y-auto px-4 py-2 space-y-2 border-b border-white/[0.05]">
          {editHistory.map((msg) => (
            <div
              key={msg.id}
              className={`text-xs px-2.5 py-1.5 rounded-lg max-w-[85%] ${
                msg.role === 'user'
                  ? 'ml-auto bg-indigo-500/15 text-indigo-300 border border-indigo-500/20'
                  : 'bg-white/[0.03] text-white/50 border border-white/[0.06]'
              }`}
            >
              {msg.content}
            </div>
          ))}
          <div ref={historyEndRef} />
        </div>
      )}

      {/* Input bar */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          onClick={toggleVoice}
          className={`p-2 rounded-xl transition-all duration-300 ${
            isListening
              ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
              : 'bg-white/[0.04] text-white/40 border border-white/[0.08] hover:bg-white/[0.08] hover:text-white/60'
          }`}
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isEditing}
          placeholder={isListening ? 'Escuchando...' : 'Editar: "cambia los colores a azul"'}
          className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white/80
            placeholder:text-white/20 focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.05]
            transition-all disabled:opacity-40"
        />

        <button
          onClick={handleSend}
          disabled={!input.trim() || isEditing}
          className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30
            hover:bg-indigo-500/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {isEditing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}
