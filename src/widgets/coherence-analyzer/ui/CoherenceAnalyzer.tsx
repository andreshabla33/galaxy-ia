'use client'

import React, { useState, useRef } from 'react'
import { Upload, CheckCircle2, AlertCircle, Loader2, Sparkles, Send, Trash2, ArrowRight } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { extractTextFromFile } from '@/shared/lib/text-extractor'
import { useAppStore } from '@/features/settings/model/appStore'

interface FileState {
  file: File | null
  text: string
  name: string
  loading: boolean
  error: string | null
}

const INITIAL_FILE_STATE: FileState = {
  file: null,
  text: '',
  name: '',
  loading: false,
  error: null
}

export default function CoherenceAnalyzer() {
  const { apiKey, provider } = useAppStore()
  const [doc1, setDoc1] = useState<FileState>(INITIAL_FILE_STATE)
  const [doc2, setDoc2] = useState<FileState>(INITIAL_FILE_STATE)
  const [analysisRequest, setAnalysisRequest] = useState('')
  const [result, setResult] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  const handleFileUpload = async (file: File, setDoc: React.Dispatch<React.SetStateAction<FileState>>) => {
    setDoc(prev => ({ ...prev, file, name: file.name, loading: true, error: null }))
    try {
      const text = await extractTextFromFile(file)
      setDoc(prev => ({ ...prev, text, loading: false }))
    } catch (err) {
      setDoc(prev => ({ ...prev, loading: false, error: err instanceof Error ? err.message : 'Error al leer archivo' }))
    }
  }

  const runAnalysis = async () => {
    if (!doc1.text || !doc2.text || !analysisRequest.trim()) return
    if (!apiKey) {
      setAnalysisError('Configura tu API Key en ajustes ⚙️ primero.')
      return
    }

    setIsAnalyzing(true)
    setResult('')
    setAnalysisError(null)

    try {
      const response = await fetch('/api/coherence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doc1Text: doc1.text,
          doc2Text: doc2.text,
          doc1Name: doc1.name,
          doc2Name: doc2.name,
          analysisRequest,
          apiKey,
          provider
        })
      })

      if (!response.ok) {
        throw new Error(await response.text())
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      
      if (!reader) throw new Error('No se pudo iniciar el stream de respuesta')

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        setResult(prev => prev + chunk)
      }
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Error en el análisis')
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto w-full px-4 py-12 space-y-12">
      {/* Header section */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          Análisis Cross-Document
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent italic">
          Coherencia entre Documentos
        </h1>
        <p className="text-zinc-400 max-w-2xl mx-auto">
          Sube dos archivos y pide a la IA que verifique contradicciones, omisiones o si están perfectamente alineados.
        </p>
      </div>

      {/* Upload area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DocumentDropZone 
          index={1} 
          state={doc1} 
          onUpload={(f) => handleFileUpload(f, setDoc1)} 
          onClear={() => setDoc1(INITIAL_FILE_STATE)} 
        />
        <DocumentDropZone 
          index={2} 
          state={doc2} 
          onUpload={(f) => handleFileUpload(f, setDoc2)} 
          onClear={() => setDoc2(INITIAL_FILE_STATE)} 
        />
      </div>

      {/* Request and Action area */}
      <div className="relative group animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
        <div className={`absolute -inset-1 bg-gradient-to-r from-indigo-500/30 to-fuchsia-500/30 rounded-3xl blur-xl transition-all duration-1000 ${isAnalyzing ? 'opacity-100 animate-pulse' : 'opacity-20 group-hover:opacity-40'}`}></div>
        <div className="relative bg-zinc-900/60 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-indigo-400/80">Petición de Análisis</label>
            <textarea
              value={analysisRequest}
              onChange={(e) => setAnalysisRequest(e.target.value)}
              placeholder="Ej: 'Verificar si el cronograma del Proyecto A contradice los hitos del Proyecto B' o '¿La propuesta de valor es consistente?'"
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/40 transition-all min-h-[120px] resize-none"
            />
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-wrap gap-3">
              <AnalysisSnippet 
                label="Cronogramas" 
                onClick={() => setAnalysisRequest('¿Hay contradicciones entre las fechas o hitos clave en ambos documentos?')}
              />
              <AnalysisSnippet 
                label="Propuesta de Valor" 
                onClick={() => setAnalysisRequest('¿Cómo se alinean las propuestas de valor?')}
              />
              <AnalysisSnippet 
                label="Presupuesto" 
                onClick={() => setAnalysisRequest('Verifica si los montos totales y desglosados coinciden.')}
              />
            </div>

            <button
              onClick={runAnalysis}
              disabled={isAnalyzing || !doc1.text || !doc2.text || !analysisRequest.trim()}
              className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-bold transition-all ${
                isAnalyzing || !doc1.text || !doc2.text || !analysisRequest.trim()
                  ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:translate-y-px translate-all'
              }`}
            >
              {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              {isAnalyzing ? 'Analizando...' : 'Iniciar Análisis IA'}
            </button>
          </div>
        </div>
      </div>

      {/* Results Panel */}
      {(result || isAnalyzing || analysisError) && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-1000">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-white/[0.08]" />
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Resultado del Análisis</h3>
            <div className="h-px flex-1 bg-white/[0.08]" />
          </div>

          {analysisError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 flex items-start gap-4 text-red-400">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <div className="space-y-1">
                <p className="font-bold">Error en la IA</p>
                <p className="text-sm opacity-80">{analysisError}</p>
              </div>
            </div>
          )}

          <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/[0.05] rounded-3xl p-8 md:p-12 shadow-inner">
            <div className="prose prose-invert prose-indigo max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {result || 'Esperando sabiduría artificial...'}
              </ReactMarkdown>
            </div>
            {isAnalyzing && (
              <div className="flex items-center gap-2 mt-8 text-indigo-400 text-sm italic font-medium">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                La IA está razonando a través de los documentos...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function DocumentDropZone({ 
  index, 
  state, 
  onUpload, 
  onClear 
}: { 
  index: number; 
  state: FileState; 
  onUpload: (f: File) => void; 
  onClear: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) onUpload(file)
  }

  return (
    <div 
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={`relative h-56 rounded-3xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center p-6 text-center ${
        state.file 
          ? 'bg-zinc-900/60 border-indigo-500/40' 
          : isDragOver 
            ? 'bg-indigo-500/10 border-indigo-400 scale-[1.02]' 
            : 'bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.04] hover:border-white/20'
      }`}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
        accept=".txt,.pdf,.md,.json"
      />

      {state.loading ? (
        <div className="space-y-3">
          <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mx-auto" />
          <p className="text-sm font-medium text-zinc-400">Extrayendo texto...</p>
        </div>
      ) : state.file ? (
        <div className="space-y-4 w-full">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/10">
            <CheckCircle2 className="w-6 h-6 text-indigo-400" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-400/60">Documento {index}</p>
            <p className="text-sm font-semibold text-zinc-100 truncate max-w-[200px] mx-auto">{state.name}</p>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); onClear() }}
            className="text-[10px] font-bold uppercase tracking-widest text-red-400/60 hover:text-red-400 transition-colors flex items-center gap-1.5 mx-auto"
          >
            <Trash2 className="w-3.5 h-3.5" /> Eliminar
          </button>
        </div>
      ) : (
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="space-y-4 group cursor-pointer"
        >
          <div className="w-14 h-14 rounded-2xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center mx-auto transition-all group-hover:scale-110 group-hover:border-indigo-400/50 group-hover:bg-indigo-500/10">
            <Upload className="w-6 h-6 text-zinc-400 group-hover:text-indigo-400 transition-colors" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-zinc-200">Sube el Documento {index}</p>
            <p className="text-xs text-zinc-500">Haz clic o arrastra un PDF, TXT o MD</p>
          </div>
        </button>
      )}

      {state.error && (
        <div className="absolute inset-x-0 -bottom-10 flex items-center justify-center gap-2 text-red-400 text-[10px] font-bold uppercase tracking-widest">
          <AlertCircle className="w-3 h-3" /> {state.error}
        </div>
      )}
    </div>
  )
}

function AnalysisSnippet({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:bg-white/[0.06] hover:text-indigo-300 hover:border-indigo-500/30 transition-all flex items-center gap-2"
    >
      <ArrowRight className="w-3 h-3" />
      {label}
    </button>
  )
}
