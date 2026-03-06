'use client'

import React, { useEffect, useState } from 'react'
import { DocumentViewer } from './DocumentViewer'
import { PresentationViewer } from './PresentationViewer'
import { CodeViewer } from './CodeViewer'
import { ImageViewer } from './ImageViewer'
import type { ParsedArtifact } from '@/shared/lib/artifact-parser'

interface ArtifactViewerProps {
  artifact: ParsedArtifact
}

function ImageArtifactWrapper({ artifact }: { artifact: ParsedArtifact }) {
  const [imageUrl, setImageUrl] = useState(artifact.contenido.imageUrl as string || '')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (imageUrl || generating) return
    const prompt = artifact.contenido.prompt as string
    if (!prompt) return

    setGenerating(true)
    setError('')

    fetch('/api/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        aspectRatio: artifact.contenido.aspectRatio || '16:9',
      }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.image) {
          setImageUrl(data.image)
        } else {
          setError(data.error || 'No se pudo generar la imagen')
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setGenerating(false))
  }, [artifact.contenido.prompt, artifact.contenido.aspectRatio, imageUrl, generating])

  if (generating) {
    return (
      <div className="flex flex-col items-center justify-center p-12 gap-4">
        <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin" />
        <p className="text-sm text-white/40">Generando imagen con Nano Banana...</p>
        <p className="text-xs text-white/20 max-w-sm text-center">{artifact.contenido.prompt as string}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 gap-3">
        <p className="text-sm text-red-400/70">⚠ {error}</p>
        <button
          onClick={() => { setImageUrl(''); setError('') }}
          className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 transition-all"
        >
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <ImageViewer
      contenido={{ ...artifact.contenido as Record<string, string>, imageUrl }}
      titulo={artifact.titulo}
    />
  )
}

export function ArtifactViewer({ artifact }: ArtifactViewerProps) {
  switch (artifact.type) {
    case 'documento':
      return (
        <DocumentViewer
          contenido={artifact.contenido as { markdown?: string; toc?: string[]; word_count?: number }}
          titulo={artifact.titulo}
        />
      )
    case 'presentacion':
      return (
        <PresentationViewer
          contenido={artifact.contenido as Record<string, unknown>}
          titulo={artifact.titulo}
        />
      )
    case 'codigo':
      return (
        <CodeViewer
          contenido={artifact.contenido as { html?: string; framework?: string; dependencies?: string[] }}
          titulo={artifact.titulo}
        />
      )
    case 'imagen':
      return <ImageArtifactWrapper artifact={artifact} />
    default:
      return (
        <div className="p-8 text-white/40 text-center">
          Tipo de artefacto no soportado: {artifact.type}
        </div>
      )
  }
}
