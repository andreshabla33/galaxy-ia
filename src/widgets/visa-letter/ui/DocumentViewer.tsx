'use client'

import React, { useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Copy, Download, RefreshCw, Check, ArrowLeft, FileText, ChevronDown } from 'lucide-react'
import { useVisaLetterStore } from '@/features/visa-letter'
import { exportToDocx } from '@/shared/lib/export-docx'

interface DocumentViewerProps {
  onBack: () => void
  onRegenerate: () => void
  onRefine: (instruction: string) => void
}

export function DocumentViewer({ onBack, onRegenerate, onRefine }: DocumentViewerProps) {
  const { generatedDocument, documentTitle, isLoading } = useVisaLetterStore()
  const [copied, setCopied] = useState(false)
  const [showRefine, setShowRefine] = useState(false)
  const [refineInput, setRefineInput] = useState('')
  const documentRef = useRef<HTMLDivElement>(null)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedDocument)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = generatedDocument
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownload = async () => {
    try {
      await exportToDocx({ markdown: generatedDocument }, documentTitle || 'Expert-Opinion-Letter')
    } catch (err) {
      console.error('Error exporting to DOCX:', err)
    }
  }

  const handleRefineSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!refineInput.trim()) return
    onRefine(refineInput.trim())
    setRefineInput('')
    setShowRefine(false)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header toolbar */}
      <div className="shrink-0 border-b border-white/[0.06] bg-zinc-950/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white/70 transition-colors"
              title="Volver al chat"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-medium text-white/80 truncate max-w-[200px] md:max-w-[400px]">
                {documentTitle || 'Expert Opinion Letter'}
              </h2>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-white/[0.03] border border-white/[0.08]
                text-white/50 hover:bg-white/[0.06] hover:text-white/70 transition-all"
              title="Copiar al portapapeles"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-white/[0.03] border border-white/[0.08]
                text-white/50 hover:bg-white/[0.06] hover:text-white/70 transition-all"
              title="Descargar como .docx"
            >
              <Download className="w-3.5 h-3.5" />
              .docx
            </button>

            <button
              onClick={onRegenerate}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-indigo-500/10 border border-indigo-500/20
                text-indigo-300 hover:bg-indigo-500/20 transition-all disabled:opacity-30"
              title="Regenerar documento"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Regenerar
            </button>
          </div>
        </div>
      </div>

      {/* Document content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-3xl mx-auto px-6 py-8" ref={documentRef}>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
              <p className="text-white/40 text-sm">Generando documento...</p>
            </div>
          ) : (
            <article className="prose prose-invert prose-sm max-w-none
              prose-headings:text-white/90 prose-headings:font-semibold
              prose-h1:text-2xl prose-h1:border-b prose-h1:border-white/10 prose-h1:pb-3 prose-h1:mb-6
              prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4
              prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3
              prose-p:text-white/70 prose-p:leading-relaxed
              prose-strong:text-white/90
              prose-em:text-white/60
              prose-li:text-white/70
              prose-blockquote:border-indigo-500/30 prose-blockquote:text-white/50
              prose-hr:border-white/10
            ">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {generatedDocument}
              </ReactMarkdown>
            </article>
          )}
        </div>
      </div>

      {/* Refine bar */}
      <div className="shrink-0 border-t border-white/[0.06] bg-zinc-950/80 backdrop-blur-xl">
        {!showRefine ? (
          <div className="flex items-center justify-center p-3">
            <button
              onClick={() => setShowRefine(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs bg-white/[0.03] border border-white/[0.06]
                text-white/40 hover:bg-white/[0.06] hover:text-white/60 transition-all"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              Refinar documento
            </button>
          </div>
        ) : (
          <form onSubmit={handleRefineSubmit} className="p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={refineInput}
                onChange={(e) => setRefineInput(e.target.value)}
                placeholder='Ej: "Expande la sección de logros", "Hazlo más formal", "Agrega más datos sobre el impacto"...'
                autoFocus
                className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white/80
                  placeholder:text-white/20 focus:outline-none focus:border-indigo-500/30 focus:bg-white/[0.05] transition-all"
              />
              <button
                type="submit"
                disabled={!refineInput.trim() || isLoading}
                className="shrink-0 px-4 py-2.5 rounded-xl text-xs font-medium bg-indigo-500/20 border border-indigo-500/30
                  text-indigo-300 hover:bg-indigo-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                Aplicar
              </button>
              <button
                type="button"
                onClick={() => setShowRefine(false)}
                className="shrink-0 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white/30 hover:text-white/60 transition-all"
              >
                ✕
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
