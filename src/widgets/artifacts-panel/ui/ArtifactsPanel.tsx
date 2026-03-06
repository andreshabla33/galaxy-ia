'use client'

import React, { useMemo, useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { SquareTerminal, X, Pencil, MessageSquare } from 'lucide-react'
import type { ChatMessage } from '@/entities/message'
import { ArtifactViewer } from '@/widgets/artifact-viewer'
import { ArtifactEditChat } from '@/widgets/artifact-viewer/ui/ArtifactEditChat'
import { parseArtifactFromResponse, type ParsedArtifact } from '@/shared/lib/artifact-parser'
import { buildEditSystemPrompt } from '@/shared/config/edit-prompts'
import { useAppStore } from '@/features/settings'
import { generateId } from '@/shared/lib/generate-id'
import { ThinkingIndicator } from '@/widgets/thinking-indicator'

interface ArtifactsPanelProps {
  messages: ChatMessage[];
  isLoading: boolean;
  isOpen: boolean;
  onClose: () => void;
}

interface EditMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

function AssistantMessage({ content, onArtifactDetected }: { content: string; onArtifactDetected?: (a: ParsedArtifact) => void }) {
  const artifact = useMemo(() => {
    const a = parseArtifactFromResponse(content)
    if (a && onArtifactDetected) onArtifactDetected(a)
    return a
  }, [content, onArtifactDetected])

  // Completed artifact → show viewer
  if (artifact) {
    return (
      <div className="w-full rounded-xl border border-white/10 bg-zinc-900/80 overflow-hidden" style={{ minHeight: '300px' }}>
        <ArtifactViewer artifact={artifact} />
      </div>
    )
  }

  // If content contains artifact markers (streaming in progress), hide raw text
  // The ThinkingIndicator will handle the UX during this phase
  if (content.includes('```artifact:') || content.includes('```artifact')) {
    return null
  }

  // Empty content — nothing to show
  if (!content.trim()) return null

  // Plain markdown conversation — show normally
  return (
    <div className="max-w-[90%] rounded-2xl p-4 bg-zinc-900/50 border border-zinc-800 text-zinc-300 prose prose-invert prose-sm prose-p:leading-relaxed prose-pre:bg-zinc-950 prose-pre:border prose-pre:border-zinc-800">
      <div className="text-sm">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {content}
        </ReactMarkdown>
      </div>
    </div>
  )
}

export default function ArtifactsPanel({ messages, isLoading, isOpen, onClose }: ArtifactsPanelProps) {
  const { apiKey, provider } = useAppStore()
  const [editMode, setEditMode] = useState(false)
  const [currentArtifact, setCurrentArtifact] = useState<ParsedArtifact | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editHistory, setEditHistory] = useState<EditMessage[]>([])

  // Detectar el último artefacto de los mensajes
  const latestArtifact = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') {
        const a = parseArtifactFromResponse(messages[i].content)
        if (a) return a
      }
    }
    return null
  }, [messages])

  // Use edited artifact if available, otherwise latest from messages
  const displayArtifact = currentArtifact || latestArtifact

  const handleSendEdit = useCallback(async (instruction: string) => {
    if (!displayArtifact || !apiKey) return

    // Add user message to edit history
    const userMsg: EditMessage = { id: generateId(), role: 'user', content: instruction }
    setEditHistory(prev => [...prev, userMsg])
    setIsEditing(true)

    try {
      const editSystemPrompt = buildEditSystemPrompt(displayArtifact.type, displayArtifact.raw)

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: instruction }],
          apiKey,
          provider,
          systemPrompt: editSystemPrompt,
        }),
      })

      if (!response.ok) throw new Error(`Error ${response.status}`)
      if (!response.body) throw new Error('No response body')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        fullContent += decoder.decode(value, { stream: true })
      }

      // Parse the edited artifact
      const edited = parseArtifactFromResponse(fullContent)
      if (edited) {
        setCurrentArtifact(edited)
        setEditHistory(prev => [...prev, {
          id: generateId(),
          role: 'assistant',
          content: '✓ Artefacto actualizado'
        }])
      } else {
        setEditHistory(prev => [...prev, {
          id: generateId(),
          role: 'assistant',
          content: '⚠ No pude aplicar los cambios. Intenta ser más específico.'
        }])
      }
    } catch (err: any) {
      setEditHistory(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: `⚠ Error: ${err.message}`
      }])
    } finally {
      setIsEditing(false)
    }
  }, [displayArtifact, apiKey, provider])

  const toggleEditMode = () => {
    if (!editMode) {
      // Entering edit mode
      if (latestArtifact && !currentArtifact) {
        setCurrentArtifact(latestArtifact)
      }
    }
    setEditMode(!editMode)
  }

  return (
    <div className={`border-l border-white/[0.06] bg-zinc-950/90 backdrop-blur-xl flex flex-col transition-all duration-500 ${isOpen && messages.length > 0 ? 'w-[45%] min-w-[450px] max-w-[700px] opacity-100' : 'w-0 min-w-0 opacity-0 overflow-hidden'} h-full shrink-0`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.06]">
        <SquareTerminal className="w-4 h-4 text-indigo-400" />
        <h2 className="text-sm font-medium text-white/60 flex-1">Espacio de Trabajo</h2>
        {displayArtifact && (
          <button
            onClick={toggleEditMode}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all ${
              editMode
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'bg-white/[0.04] text-white/40 border border-white/[0.08] hover:bg-white/[0.08] hover:text-white/60'
            }`}
          >
            {editMode ? <MessageSquare className="w-3 h-3" /> : <Pencil className="w-3 h-3" />}
            {editMode ? 'Editando' : 'Editar'}
          </button>
        )}
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/70 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content area */}
      {editMode && displayArtifact ? (
        // === EDIT MODE: Focused artifact + edit chat ===
        <>
          <div className="flex-1 overflow-y-auto">
            <div className="w-full" style={{ minHeight: '300px' }}>
              <ArtifactViewer artifact={displayArtifact} />
            </div>
          </div>
          <ArtifactEditChat
            onSendEdit={handleSendEdit}
            isEditing={isEditing}
            editHistory={editHistory}
            artifactType={displayArtifact.type}
          />
        </>
      ) : (
        // === NORMAL MODE: Message list + always-visible edit chat ===
        <>
          <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-4">
            {messages.map((m) => (
              <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                {m.role === 'user' ? (
                  <div className="max-w-[90%] rounded-2xl p-4 bg-indigo-500/20 text-indigo-100 border border-indigo-500/20">
                    <p className="text-sm">{m.content}</p>
                  </div>
                ) : (
                  <AssistantMessage content={m.content} />
                )}
              </div>
            ))}

            {isLoading && (() => {
              // Find last user message for context-aware thinking steps
              const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content || ''
              return <ThinkingIndicator userMessage={lastUserMsg} />
            })()}
          </div>

          {/* Always-visible edit chat when artifact exists */}
          {displayArtifact && !isLoading && (
            <ArtifactEditChat
              onSendEdit={handleSendEdit}
              isEditing={isEditing}
              editHistory={editHistory}
              artifactType={displayArtifact.type}
            />
          )}
        </>
      )}
    </div>
  )
}
