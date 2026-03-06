'use client'

import { useState, useCallback, useRef } from 'react'
import type { ChatMessage } from '@/entities/message'
import { generateId } from '@/shared/lib/generate-id'
import { parseArtifactFromResponse, type ParsedArtifact } from '@/shared/lib/artifact-parser'
import { buildDynamicPrompt } from '@/shared/lib/prompt-loader'
import { needsWebSearch, performWebSearch, formatSearchContext } from '@/shared/lib/web-search'

interface UseChatOptions {
  apiKey: string;
  provider: string;
  systemPrompt?: string;
  onArtifact?: (artifact: ParsedArtifact) => void;
}

interface UseChatReturn {
  messages: ChatMessage[];
  input: string;
  setInput: (value: string) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  append: (message: Pick<ChatMessage, 'role' | 'content'>, overrideSystemPrompt?: string) => Promise<void>;
  isLoading: boolean;
  lastArtifact: ParsedArtifact | null;
}

export function useChat({ apiKey, provider, systemPrompt, onArtifact }: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [lastArtifact, setLastArtifact] = useState<ParsedArtifact | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const onArtifactRef = useRef(onArtifact)
  onArtifactRef.current = onArtifact

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
  }, [])

  const append = useCallback(async (message: Pick<ChatMessage, 'role' | 'content'>, overrideSystemPrompt?: string) => {
    const userMessage: ChatMessage = {
      id: generateId(),
      role: message.role,
      content: message.content,
    }

    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setIsLoading(true)

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
      let dynamicPrompt = overrideSystemPrompt || await buildDynamicPrompt(message.content)

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

      // Detectar artefacto en la respuesta completa
      const artifact = parseArtifactFromResponse(fullContent)
      if (artifact) {
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
  }, [messages, apiKey, provider, systemPrompt])

  return { messages, input, setInput, handleInputChange, append, isLoading, lastArtifact }
}
