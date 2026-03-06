'use client'

import React, { useRef, useState } from 'react'

interface CodeViewerProps {
  contenido: {
    html?: string
    framework?: string
    dependencies?: string[]
  }
  titulo: string
}

export function CodeViewer({ contenido, titulo }: CodeViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [showCode, setShowCode] = useState(false)
  const html = contenido.html || ''

  const handleCopy = () => {
    navigator.clipboard.writeText(html)
  }

  const handleDownload = () => {
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${titulo.replace(/\s+/g, '-').toLowerCase()}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/10">
        <div>
          <h2 className="text-lg font-medium text-white/90">{titulo}</h2>
          <span className="text-xs text-white/40">{contenido.framework || 'HTML'}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCode(!showCode)}
            className={`text-xs px-2 py-1 rounded border transition-all ${
              showCode
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10'
            }`}
          >
            {showCode ? 'Preview' : 'Código'}
          </button>
          <button
            onClick={handleCopy}
            className="text-xs px-2 py-1 rounded bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 transition-all"
          >
            Copiar
          </button>
          <button
            onClick={handleDownload}
            className="text-xs px-2 py-1 rounded bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 transition-all"
          >
            Descargar
          </button>
          <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            Código
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {showCode ? (
          <div className="h-full overflow-auto p-4">
            <pre className="text-xs text-white/70 font-mono whitespace-pre-wrap break-words bg-white/5 rounded-lg p-4 border border-white/10">
              {html}
            </pre>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            srcDoc={html}
            className="w-full h-full bg-white rounded-none"
            sandbox="allow-scripts allow-same-origin"
            title={titulo}
          />
        )}
      </div>
    </div>
  )
}
