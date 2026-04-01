'use client'

import React, { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useVisaLetterStore } from '@/features/visa-letter'
import { useAppStore, SettingsModal } from '@/features/settings'
import { GuidedChat, DocumentViewer } from '@/widgets/visa-letter'
import {
  VISA_LETTER_SYSTEM_PROMPT,
  buildVisaLetterPrompt,
  type VisaLetterData,
} from '@/shared/config/visa-letter-prompts'
import { parseArtifactFromResponse } from '@/shared/lib/artifact-parser'

export default function VisaLetterPage() {
  const router = useRouter()
  const { apiKey, provider } = useAppStore()
  const {
    phase,
    collectedData,
    generatedDocument,
    setPhase,
    setGeneratedDocument,
    setIsLoading,
    addMessage,
    reset,
  } = useVisaLetterStore()

  // Generate the document when all questions are answered
  const generateDocument = useCallback(async (data: Partial<VisaLetterData>) => {
    if (!apiKey) {
      addMessage({ role: 'assistant', content: '⚠️ Necesitas configurar tu API Key en los ajustes primero.' })
      setPhase('questions')
      return
    }

    setIsLoading(true)

    try {
      const userPrompt = buildVisaLetterPrompt(data as VisaLetterData)

      const response = await fetch('/api/visa-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: userPrompt }],
          apiKey,
          provider,
          systemPrompt: VISA_LETTER_SYSTEM_PROMPT,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || `Error ${response.status}`)
      }

      if (!response.body) throw new Error('No response body')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        fullContent += decoder.decode(value, { stream: true })
      }

      // Try to extract the artifact from the response
      const artifact = parseArtifactFromResponse(fullContent)
      if (artifact && artifact.type === 'documento') {
        const contenido = typeof artifact.contenido === 'string'
          ? artifact.contenido
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          : (artifact.contenido as any)?.markdown || JSON.stringify(artifact.contenido)
        setGeneratedDocument(contenido, artifact.titulo)
      } else {
        // If no artifact wrapper, use the raw content as markdown
        setGeneratedDocument(fullContent, `Expert Opinion Letter - ${data.beneficiaryName || 'Document'}`)
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Error desconocido'
      addMessage({ role: 'assistant', content: `⚠️ Error al generar la carta: ${errMsg}` })
      setPhase('questions')
      setIsLoading(false)
    }
  }, [apiKey, provider, addMessage, setPhase, setGeneratedDocument, setIsLoading])

  // Watch for phase change to 'generating' to trigger document generation
  useEffect(() => {
    if (phase === 'generating') {
      generateDocument(collectedData)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // Regenerate handler
  const handleRegenerate = useCallback(() => {
    // Briefly go to questions then back to generating to re-trigger the useEffect
    setPhase('questions')
    setTimeout(() => setPhase('generating'), 50)
  }, [setPhase])

  // Refine handler — send a refinement instruction
  const handleRefine = useCallback(async (instruction: string) => {
    if (!apiKey) return
    setIsLoading(true)

    try {
      const response = await fetch('/api/visa-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: buildVisaLetterPrompt(collectedData as VisaLetterData) },
            { role: 'assistant', content: generatedDocument },
            { role: 'user', content: `Please refine the document with this instruction: ${instruction}. Output the COMPLETE updated document in the same artifact format.` },
          ],
          apiKey,
          provider,
          systemPrompt: VISA_LETTER_SYSTEM_PROMPT,
        }),
      })

      if (!response.ok) throw new Error(await response.text())
      if (!response.body) throw new Error('No response body')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        fullContent += decoder.decode(value, { stream: true })
      }

      const artifact = parseArtifactFromResponse(fullContent)
      if (artifact && artifact.type === 'documento') {
        const contenido = typeof artifact.contenido === 'string'
          ? artifact.contenido
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          : (artifact.contenido as any)?.markdown || JSON.stringify(artifact.contenido)
        setGeneratedDocument(contenido, artifact.titulo)
      } else {
        setGeneratedDocument(fullContent, `Expert Opinion Letter - ${collectedData.beneficiaryName || 'Document'}`)
      }
    } catch (error: unknown) {
      console.error('Refine error:', error)
      setIsLoading(false)
    }
  }, [apiKey, provider, collectedData, generatedDocument, setGeneratedDocument, setIsLoading])

  const handleBack = () => {
    router.push('/')
    // Delay reset so the animation doesn't flash
    setTimeout(() => reset(), 300)
  }

  const handleBackToChat = () => {
    setPhase('questions')
  }

  return (
    <main className="h-screen w-screen bg-zinc-950 text-white overflow-hidden flex flex-col">
      <SettingsModal />

      {/* Background gradient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/20 via-zinc-950 to-purple-950/20" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col min-h-0">
        {phase === 'document' || (phase === 'refining') ? (
          <DocumentViewer
            onBack={handleBackToChat}
            onRegenerate={handleRegenerate}
            onRefine={handleRefine}
          />
        ) : (
          <GuidedChat onBack={handleBack} />
        )}
      </div>
    </main>
  )
}
