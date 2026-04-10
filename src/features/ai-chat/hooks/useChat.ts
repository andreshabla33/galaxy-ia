'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { ChatMessage } from '@/entities/message'
import { generateId } from '@/shared/lib/generate-id'
import { parseArtifactFromResponse, type ParsedArtifact } from '@/shared/lib/artifact-parser'
import { buildDynamicPrompt } from '@/shared/lib/prompt-loader'
import { needsWebSearch, performWebSearch, formatSearchContext } from '@/shared/lib/web-search'
import { supabase } from '@/shared/lib/supabase'

interface UseChatOptions {
  apiKey: string;
  provider: string;
  systemPrompt?: string;
  onArtifact?: (artifact: ParsedArtifact) => void;
  sessionId?: string | null;
  onSessionCreated?: (id: string) => void;
}

interface UseChatReturn {
  messages: ChatMessage[];
  input: string;
  setInput: (value: string) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  append: (message: Pick<ChatMessage, 'role' | 'content'>, overrideSystemPrompt?: string) => Promise<void>;
  isLoading: boolean;
  lastArtifact: ParsedArtifact | null;
  setMessages: (messages: ChatMessage[]) => void;
}

export function useChat({ apiKey, provider, systemPrompt, onArtifact, sessionId, onSessionCreated }: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [lastArtifact, setLastArtifact] = useState<ParsedArtifact | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const onArtifactRef = useRef(onArtifact)
  onArtifactRef.current = onArtifact
  const messagesRef = useRef(messages)
  messagesRef.current = messages

  // Guard: skip loadHistory for sessions we just created (messages are already in memory)
  const skipNextHistoryLoadRef = useRef(false)

  // Cargar historial si hay sessionId
  useEffect(() => {
    if (!sessionId) {
      setMessages([])
      return
    }

    // Skip loading history for sessions we just created — messages are already correct in memory
    // This prevents the race condition where loadHistory overwrites the streaming assistant message
    if (skipNextHistoryLoadRef.current) {
      console.log('[useChat] Skipping loadHistory for newly created session:', sessionId)
      skipNextHistoryLoadRef.current = false
      return
    }

    const loadHistory = async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('[useChat] Error loading history:', error)
        return
      }

      if (data) {
        const historyMessages = data.map((m: { id: string; role: string; content: string }) => ({
          id: m.id,
          role: m.role as ChatMessage['role'],
          content: m.content
        }))
        setMessages(historyMessages)

        // Detectar el último artefacto para que el UI reaccione (fondo, etc.)
        for (let i = historyMessages.length - 1; i >= 0; i--) {
          if (historyMessages[i].role === 'assistant') {
            const artifact = parseArtifactFromResponse(historyMessages[i].content)
            if (artifact) {
              setLastArtifact(artifact)
              break
            }
          }
        }
      }
    }

    loadHistory()
  }, [sessionId])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
  }, [])

  const append = useCallback(async (message: Pick<ChatMessage, 'role' | 'content'>, overrideSystemPrompt?: string) => {
    let currentSessionId = sessionId
    const userMessage: ChatMessage = {
      id: generateId(),
      role: message.role,
      content: message.content,
    }

    const updatedMessages = [...messagesRef.current, userMessage]
    setMessages(updatedMessages)
    setIsLoading(true)

    // Persistir mensaje del usuario
    try {
      const { data: userData } = await supabase.auth.getUser()
      const user = userData.user

      if (user) {
        // Crear sesión si no existe
        if (!currentSessionId) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: session, error: sessionError } = await (supabase
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .from('chat_sessions') as any)
            .insert({
              user_id: user.id,
              title: message.content.slice(0, 40) + (message.content.length > 40 ? '...' : '')
            })
            .select()
            .single()

          if (!sessionError && session) {
            currentSessionId = session.id
            // CRITICAL: Set flag BEFORE triggering sessionId change to prevent
            // loadHistory from overwriting in-memory messages during streaming
            skipNextHistoryLoadRef.current = true
            if (onSessionCreated) onSessionCreated(session.id)
          }
        }

        if (currentSessionId) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from('chat_messages') as any).insert({
            session_id: currentSessionId,
            role: userMessage.role,
            content: userMessage.content
          })
        }
      }
    } catch (e) {
      console.error('[useChat] Error persisting user message:', e)
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    const assistantMessage: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: '',
    }

    setMessages([...updatedMessages, assistantMessage])

    try {
      // Build dynamic prompt: base + type-specific from Supabase (cached)
      console.log('[useChat] Building dynamic prompt for:', message.content.slice(0, 50))
      let dynamicPrompt = overrideSystemPrompt || await buildDynamicPrompt(message.content, apiKey, provider)

      // Web search: auto-detect if user needs research and enrich prompt with results
      if (!overrideSystemPrompt && needsWebSearch(message.content)) {
        console.log('[useChat] Web search triggered for:', message.content.slice(0, 60))
        const results = await performWebSearch(message.content)
        if (results.length > 0) {
          dynamicPrompt += formatSearchContext(results)
          console.log('[useChat] Web context added:', results.length, 'results')
        }
      }

      console.log('[useChat] Prompt built, length:', dynamicPrompt.length, '| Sending to /api/chat')

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          apiKey,
          provider,
          systemPrompt: dynamicPrompt,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || `Error ${response.status}`)
      }

      if (!response.body) {
        throw new Error('No response body')
      }

      console.log('[useChat] Response OK, starting stream read...')
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''
      let chunkCount = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          console.log('[useChat] Stream done. Total chunks:', chunkCount, '| Content length:', fullContent.length)
          console.log('[DEBUG FULL CONTENT]:', fullContent)
          break
        }

        const chunk = decoder.decode(value, { stream: true })
        fullContent += chunk
        chunkCount++

        if (chunkCount <= 3 || chunkCount % 20 === 0) {
          console.log(`[useChat] Chunk #${chunkCount}, size: ${chunk.length}, total: ${fullContent.length}`)
        }

        setMessages((prev) => {
          const newMessages = [...prev]
          const lastMessage = newMessages[newMessages.length - 1]
          if (lastMessage && lastMessage.role === 'assistant') {
            newMessages[newMessages.length - 1] = { ...lastMessage, content: fullContent }
          }
          return newMessages
        })
      }

      // ── Stream complete: force final message state synchronously ──
      // This MUST happen before setIsLoading(false) to prevent a race condition
      // where ArtifactsPanel re-renders with isLoading=false but stale messages.
      setMessages((prev) => {
        const newMessages = [...prev]
        const lastMessage = newMessages[newMessages.length - 1]
        if (lastMessage && lastMessage.role === 'assistant') {
          newMessages[newMessages.length - 1] = { ...lastMessage, content: fullContent }
        }
        return newMessages
      })

      // Persistir mensaje del asistente al finalizar el stream
      if (currentSessionId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('chat_messages') as any).insert({
          session_id: currentSessionId,
          role: 'assistant',
          content: fullContent
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }).then(({ error }: any) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (error) console.error('[useChat] Error saving assistant response:', (error as any))
        })
      }

      // Detectar artefacto en la respuesta completa
      const artifact = parseArtifactFromResponse(fullContent)
      if (artifact) {
        console.log('[useChat] Artifact detected after stream:', artifact.type, artifact.titulo)
        setLastArtifact(artifact)
        onArtifactRef.current?.(artifact)
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') return

      const errorText = error instanceof Error ? error.message : 'Error desconocido'
      setMessages((prev) => {
        const newMessages = [...prev]
        const lastMessage = newMessages[newMessages.length - 1]
        if (lastMessage && lastMessage.role === 'assistant') {
          newMessages[newMessages.length - 1] = {
            ...lastMessage,
            content: `⚠️ Error: ${errorText}`,
          }
        }
        return newMessages
      })
    } finally {
      setIsLoading(false)
    }
  }, [apiKey, provider, systemPrompt, sessionId, onSessionCreated])

  return { messages, input, setInput, handleInputChange, append, isLoading, lastArtifact, setMessages }
}
