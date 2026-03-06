'use client'

import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { exportToDocx } from '@/shared/lib/export-docx'

interface DocumentViewerProps {
  contenido: {
    markdown?: string
    toc?: string[]
    word_count?: number
  }
  titulo: string
}

export function DocumentViewer({ contenido, titulo }: DocumentViewerProps) {
  const markdown = contenido.markdown || ''

  const [exporting, setExporting] = useState(false)

  const handleDownload = async () => {
    setExporting(true)
    try {
      await exportToDocx(contenido, titulo)
    } catch (err) {
      console.error('Error exporting DOCX:', err)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/10">
        <div>
          <h2 className="text-lg font-medium text-white/90">{titulo}</h2>
          {contenido.word_count && (
            <span className="text-xs text-white/40">{contenido.word_count.toLocaleString()} palabras</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            disabled={exporting}
            className="text-xs px-2 py-1 rounded bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 transition-all disabled:opacity-40"
          >
            {exporting ? 'Exportando...' : 'Descargar .docx'}
          </button>
          <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
            Documento
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <article className="prose prose-invert prose-sm max-w-none
            prose-headings:text-white/90 prose-headings:font-medium
            prose-h1:text-2xl prose-h1:border-b prose-h1:border-white/10 prose-h1:pb-3
            prose-h2:text-xl prose-h2:mt-8
            prose-h3:text-lg
            prose-p:text-white/70 prose-p:leading-relaxed
            prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:underline
            prose-strong:text-white/90
            prose-code:text-cyan-300 prose-code:bg-white/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
            prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/10
            prose-table:border-collapse
            prose-th:bg-white/5 prose-th:border prose-th:border-white/10 prose-th:px-3 prose-th:py-2 prose-th:text-left
            prose-td:border prose-td:border-white/10 prose-td:px-3 prose-td:py-2
            prose-li:text-white/70
            prose-blockquote:border-l-cyan-400/50 prose-blockquote:text-white/60
            prose-hr:border-white/10
          ">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {markdown}
            </ReactMarkdown>
          </article>
        </div>
      </div>
    </div>
  )
}
