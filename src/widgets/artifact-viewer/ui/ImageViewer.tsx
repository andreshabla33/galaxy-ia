'use client'

import React, { useState } from 'react'
import { Download, ZoomIn, ZoomOut } from 'lucide-react'

interface ImageViewerProps {
  contenido: { imageUrl?: string; prompt?: string; aspectRatio?: string }
  titulo: string
}

export function ImageViewer({ contenido, titulo }: ImageViewerProps) {
  const [zoom, setZoom] = useState(1)
  const imageUrl = contenido.imageUrl || ''

  const handleDownload = () => {
    if (!imageUrl) return
    const a = document.createElement('a')
    a.href = imageUrl
    a.download = `${titulo.replace(/\s+/g, '-').toLowerCase()}.png`
    a.click()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="text-sm">🖼️</span>
          <h3 className="text-sm font-medium text-white/70 truncate">{titulo}</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
            className="text-xs p-1.5 rounded bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 transition-all"
          >
            <ZoomOut className="w-3 h-3" />
          </button>
          <span className="text-[10px] text-white/30 w-8 text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(z => Math.min(3, z + 0.25))}
            className="text-xs p-1.5 rounded bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 transition-all"
          >
            <ZoomIn className="w-3 h-3" />
          </button>
          <button
            onClick={handleDownload}
            className="text-xs px-2 py-1 rounded bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 transition-all"
          >
            <Download className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Image display */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-black/30">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={titulo}
            style={{ transform: `scale(${zoom})`, transition: 'transform 0.2s ease' }}
            className="max-w-full max-h-full rounded-lg shadow-2xl object-contain"
          />
        ) : (
          <div className="text-white/20 text-sm">No se pudo generar la imagen</div>
        )}
      </div>

      {/* Prompt info */}
      {contenido.prompt && (
        <div className="px-4 py-2 border-t border-white/[0.06]">
          <p className="text-[10px] text-white/25 uppercase tracking-wider mb-1">Prompt</p>
          <p className="text-xs text-white/40 line-clamp-2">{contenido.prompt}</p>
        </div>
      )}
    </div>
  )
}
