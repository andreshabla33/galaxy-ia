'use client'

import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { SquareTerminal, X } from 'lucide-react'
import type { ChatMessage } from '@/entities/message'
import { ArtifactViewer } from '@/widgets/artifact-viewer'
import { ArtifactEditChat } from '@/widgets/artifact-viewer/ui/ArtifactEditChat'
import { parseArtifactFromResponse, type ParsedArtifact } from '@/shared/lib/artifact-parser'
import { buildEditSystemPrompt } from '@/shared/config/edit-prompts'
import { useAppStore } from '@/features/settings'
import { generateId } from '@/shared/lib/generate-id'
import { ThinkingIndicator } from '@/widgets/thinking-indicator'
import { ErrorBoundary } from './ErrorBoundary'

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

// Module-level cache — survives Fast Refresh / HMR (not inside component state)
let _cachedArtifact: ParsedArtifact | null = null
let _cachedVersion = 0
let _cachedHistory: EditMessage[] = []

function AssistantMessage({ content }: { content: string }) {
  const artifact = useMemo(() => {
    const a = parseArtifactFromResponse(content)
    if (a) console.log(`[AssistantMessage] Parsed artifact: ${a.type} - ${a.titulo}`)
    return a
  }, [content])

  // Completed artifact → show viewer
  if (artifact) {
    return (
      <div className="w-full rounded-xl border border-white/10 bg-zinc-900/80 overflow-hidden" style={{ minHeight: '300px' }}>
        <ErrorBoundary>
          <ArtifactViewer artifact={artifact} />
        </ErrorBoundary>
      </div>
    )
  }

  // If content contains artifact markers (streaming in progress), hide raw text to avoid showing raw XML/JSON
  // But ONLY if we haven't successfully parsed it yet (which we check above)
  if (content.includes('```artifact:') || content.includes('```artifact') || content.includes('<artifact')) {
    return (
      <div className="flex items-center gap-3 p-4 bg-zinc-900/40 rounded-xl border border-white/5 animate-pulse">
        <div className="w-2 h-2 rounded-full bg-indigo-500" />
        <span className="text-xs text-white/40 font-medium">Generando artefacto...</span>
      </div>
    )
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
  const [currentArtifact, setCurrentArtifact] = useState<ParsedArtifact | null>(_cachedArtifact)
  const [artifactVersion, setArtifactVersion] = useState(_cachedVersion)
  const [isEditing, setIsEditing] = useState(false)
  const [editHistory, setEditHistory] = useState<EditMessage[]>(_cachedHistory)

  const artifactRef = useRef<ParsedArtifact | null>(null)

  _cachedArtifact = currentArtifact
  _cachedVersion = artifactVersion
  _cachedHistory = editHistory

  // Detect latest artifact from messages
  const latestArtifact = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') {
        const a = parseArtifactFromResponse(messages[i].content)
        if (a) return a
      }
    }
    return null
  }, [messages])

  const displayArtifact = currentArtifact || latestArtifact
  artifactRef.current = displayArtifact

  const lastUserMessage = useMemo(() => {
    return [...messages].reverse().find(m => m.role === 'user')?.content || ''
  }, [messages])

  const latestArtifactTitleRef = useRef<string | null>(null)
  if (latestArtifact && latestArtifact.titulo !== latestArtifactTitleRef.current) {
    latestArtifactTitleRef.current = latestArtifact.titulo
    if (!currentArtifact || currentArtifact.titulo !== latestArtifact.titulo) {
      _cachedArtifact = null
      _cachedHistory = []
      _cachedVersion = 0
      if (currentArtifact !== null) setCurrentArtifact(null)
      if (editHistory.length > 0) setEditHistory([])
      if (artifactVersion !== 0) setArtifactVersion(0)
    }
  }

  const hasEdited = currentArtifact !== null

  // ── Deferred Sandpack mount ─────────────────────────────────────────
  // Sandpack iframes can fail to render when mounted in the same frame
  // as a large React tree transition (ThinkingIndicator → CodeViewer).
  // We wait for the DOM to stabilize before mounting.
  const [codeViewerReady, setCodeViewerReady] = useState(!isLoading)
  const wasStreamingRef = useRef(isLoading)

  useEffect(() => {
    if (isLoading) {
      // Stream starting — reset readiness
      wasStreamingRef.current = true
      setCodeViewerReady(false)
    } else if (wasStreamingRef.current && displayArtifact?.type === 'codigo') {
      // Stream just finished with a code artifact — defer Sandpack mount
      wasStreamingRef.current = false
      console.log('[ArtifactsPanel] Stream ended for code artifact, deferring Sandpack mount…')
      const timer = setTimeout(() => {
        console.log('[ArtifactsPanel] DOM stable → mounting Sandpack')
        setCodeViewerReady(true)
      }, 200)
      return () => clearTimeout(timer)
    } else {
      // Non-code artifact or initial mount — ready immediately
      wasStreamingRef.current = false
      setCodeViewerReady(true)
    }
  }, [isLoading, displayArtifact?.type])

  const shouldDelayLiveCodePreview = Boolean(
    displayArtifact &&
    displayArtifact.type === 'codigo' &&
    (isLoading || !codeViewerReady) &&
    !currentArtifact
  )

  // Diagnostic log (only on key transitions)
  useEffect(() => {
    console.log('[ArtifactsPanel]', {
      isLoading,
      type: displayArtifact?.type ?? 'none',
      htmlLen: displayArtifact?.type === 'codigo' ? (displayArtifact?.contenido?.html as string)?.length ?? 0 : '-',
      ready: codeViewerReady,
      delay: shouldDelayLiveCodePreview,
    })
  }, [isLoading, codeViewerReady, shouldDelayLiveCodePreview, displayArtifact?.type])

  const artifactRenderKey = hasEdited
    ? `artifact-v${artifactVersion}`
    : displayArtifact
      ? `${displayArtifact.type}-${displayArtifact.titulo}-${isLoading ? 'loading' : 'ready'}`
      : 'latest-artifact'

  const handleSendEdit = useCallback(async (instruction: string) => {
    const artifact = artifactRef.current
    if (!artifact || !apiKey) return

    const userMsg: EditMessage = { id: generateId(), role: 'user', content: instruction }
    setEditHistory(prev => [...prev, userMsg])
    setIsEditing(true)

    try {
      const editSystemPrompt = buildEditSystemPrompt(artifact.type, artifact.raw)
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

      const edited = parseArtifactFromResponse(fullContent)
      if (edited) {
        setCurrentArtifact(edited)
        setArtifactVersion(v => v + 1)
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      setEditHistory(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: `⚠ Error: ${msg}`
      }])
    } finally {
      setIsEditing(false)
    }
  }, [apiKey, provider])

  return (
    <div className={`border-l border-white/[0.06] bg-zinc-950/90 backdrop-blur-xl flex flex-col transition-all duration-500 ${isOpen && messages.length > 0 ? 'w-full lg:w-[45%] lg:min-w-[450px] lg:max-w-[700px] opacity-100' : 'w-0 min-w-0 opacity-0 overflow-hidden'} h-full shrink-0`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.06]">
        <SquareTerminal className="w-4 h-4 text-indigo-400" />
        <h2 className="text-sm font-medium text-white/60 flex-1">
          {displayArtifact ? 'Previsualización' : 'Espacio de Trabajo'}
        </h2>
        {hasEdited && (
          <button
            onClick={() => { setCurrentArtifact(null); setEditHistory([]); setArtifactVersion(0); _cachedArtifact = null; _cachedHistory = []; _cachedVersion = 0 }}
            className="text-[10px] px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-white/30 hover:text-white/50 transition-all"
          >
            Ver original
          </button>
        )}
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/70 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col relative">
        {/* If we have an artifact, we show it primarily */}
        {displayArtifact ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {shouldDelayLiveCodePreview ? (
              <div className="p-6">
                <ThinkingIndicator userMessage={lastUserMessage} />
              </div>
            ) : isEditing && !currentArtifact ? (
              <div className="p-6">
                <ThinkingIndicator userMessage={editHistory.filter(m => m.role === 'user').pop()?.content || 'Editando artefacto'} />
              </div>
            ) : (
              <div key={artifactRenderKey} className="w-full h-full min-h-[400px]">
                <ErrorBoundary>
                  <ArtifactViewer artifact={displayArtifact} />
                </ErrorBoundary>
              </div>
            )}
          </div>
        ) : (
          // Message List (Workspace mode)
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

            {isLoading && !latestArtifact && (() => {
              return <ThinkingIndicator userMessage={lastUserMessage} />
            })()}
          </div>
        )}

        {/* Floating Edit Chat when artifact exists */}
        {displayArtifact && !isLoading && (
          <div className="p-4 bg-zinc-950/80 border-t border-white/5 backdrop-blur-md">
             <ArtifactEditChat
              onSendEdit={handleSendEdit}
              isEditing={isEditing}
              editHistory={editHistory}
              artifactType={displayArtifact.type}
            />
          </div>
        )}
      </div>
    </div>
  )
}
