'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useEditor, EditorContent, Editor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import { MermaidExtension } from './MermaidExtension'
import { marked } from 'marked'
import { exportToDocx } from '@/shared/lib/export-docx'
import { useAppStore } from '@/features/settings/model/appStore'
import {
  Bold, Italic, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Code, Sparkles,
  TextSelect, Eraser, Languages, Loader2
} from 'lucide-react'

interface DocumentViewerProps {
  contenido: {
    markdown?: string
    toc?: string[]
    word_count?: number
  }
  titulo: string
}

const MenuBar = ({ editor, onAiAction, aiLoading }: { editor: Editor | null; onAiAction: (action: string) => void; aiLoading: boolean }) => {
  if (!editor) {
    return null
  }

  const toggleBtnClass = "p-1.5 rounded-md hover:bg-white/10 transition-colors text-white/60 hover:text-white"
  const activeBtnClass = "bg-white/20 text-white"

  const hasSelection = () => {
    const { from, to } = editor.state.selection
    return from !== to
  }

  return (
    <div className="flex items-center gap-1 px-4 py-2 bg-zinc-900/50 border-b border-white/10 overflow-x-auto shrink-0 backdrop-blur-sm">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={`${toggleBtnClass} ${editor.isActive('bold') ? activeBtnClass : ''}`}
        title="Negrita"
      >
        <Bold className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={`${toggleBtnClass} ${editor.isActive('italic') ? activeBtnClass : ''}`}
        title="Cursiva"
      >
        <Italic className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        disabled={!editor.can().chain().focus().toggleStrike().run()}
        className={`${toggleBtnClass} ${editor.isActive('strike') ? activeBtnClass : ''}`}
        title="Tachado"
      >
        <Strikethrough className="w-4 h-4" />
      </button>

      <div className="w-px h-4 bg-white/10 mx-1" />

      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`${toggleBtnClass} ${editor.isActive('heading', { level: 1 }) ? activeBtnClass : ''}`}
        title="Título 1"
      >
        <Heading1 className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`${toggleBtnClass} ${editor.isActive('heading', { level: 2 }) ? activeBtnClass : ''}`}
        title="Título 2"
      >
        <Heading2 className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={`${toggleBtnClass} ${editor.isActive('heading', { level: 3 }) ? activeBtnClass : ''}`}
        title="Título 3"
      >
        <Heading3 className="w-4 h-4" />
      </button>

      <div className="w-px h-4 bg-white/10 mx-1" />

      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`${toggleBtnClass} ${editor.isActive('bulletList') ? activeBtnClass : ''}`}
        title="Lista"
      >
        <List className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`${toggleBtnClass} ${editor.isActive('orderedList') ? activeBtnClass : ''}`}
        title="Lista numerada"
      >
        <ListOrdered className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={`${toggleBtnClass} ${editor.isActive('codeBlock') ? activeBtnClass : ''}`}
        title="Bloque de código"
      >
        <Code className="w-4 h-4" />
      </button>

      <div className="flex-1" />

      <button
        onClick={() => onAiAction('mejorar')}
        disabled={aiLoading || !hasSelection()}
        className="text-xs flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 transition-colors shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
        title={hasSelection() ? 'Mejorar texto seleccionado con IA' : 'Selecciona texto primero'}
      >
        {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
        <span className="hidden sm:inline">AI Mágica</span>
      </button>
    </div>
  )
}

// Convert simple HTML back to Markdown for DOCX export
function htmlToMarkdown(html: string): string {
  let md = html
  // Headings
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
  // Bold & italic
  md = md.replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
  md = md.replace(/<em>(.*?)<\/em>/gi, '*$1*')
  md = md.replace(/<s>(.*?)<\/s>/gi, '~~$1~~')
  // Code
  md = md.replace(/<code>(.*?)<\/code>/gi, '`$1`')
  md = md.replace(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '```\n$1\n```\n\n')
  // Lists
  md = md.replace(/<li><p>(.*?)<\/p><\/li>/gi, '- $1\n')
  md = md.replace(/<li>(.*?)<\/li>/gi, '- $1\n')
  md = md.replace(/<\/?[uo]l[^>]*>/gi, '\n')
  // Blockquote
  md = md.replace(/<blockquote><p>(.*?)<\/p><\/blockquote>/gi, '> $1\n\n')
  // Paragraphs & breaks
  md = md.replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
  md = md.replace(/<br\s*\/?>/gi, '\n')
  md = md.replace(/<hr\s*\/?>/gi, '---\n\n')
  // Strip remaining tags
  md = md.replace(/<[^>]+>/g, '')
  // Decode HTML entities
  md = md.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  // Clean up excess newlines
  md = md.replace(/\n{3,}/g, '\n\n').trim()
  return md
}

const AI_ACTION_PROMPTS: Record<string, string> = {
  resumir: 'Resume el siguiente texto de forma concisa manteniendo los puntos clave. Devuelve SOLO el texto resumido, sin explicaciones ni prefijos:',
  expandir: 'Expande el siguiente texto con más detalle, ejemplos y contexto. Mantén el mismo tono y estilo. Devuelve SOLO el texto expandido, sin explicaciones ni prefijos:',
  simplificar: 'Simplifica el siguiente texto para que sea claro, directo y fácil de entender. Elimina jerga innecesaria. Devuelve SOLO el texto simplificado, sin explicaciones ni prefijos:',
  traducir: 'Si el texto está en español, tradúcelo al inglés. Si está en otro idioma, tradúcelo al español. Devuelve SOLO la traducción, sin explicaciones ni prefijos:',
  mejorar: 'Mejora la redacción del siguiente texto: hazlo más profesional, claro y fluido. Mantén el significado original. Devuelve SOLO el texto mejorado, sin explicaciones ni prefijos:',
}

export function DocumentViewer({ contenido, titulo }: DocumentViewerProps) {
  const markdown = contenido.markdown || ''
  const [exporting, setExporting] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const { apiKey, provider } = useAppStore()
  const editorRef = useRef<Editor | null>(null)

  // Configure Tiptap editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      MermaidExtension
    ],
    content: '',
    editable: true,
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-sm max-w-none min-h-[500px] focus:outline-none prose-headings:text-white/90 prose-headings:font-medium prose-h1:text-2xl prose-h1:border-b prose-h1:border-white/10 prose-h1:pb-3 prose-h2:text-xl prose-h2:mt-8 prose-h3:text-lg prose-p:text-white/70 prose-p:leading-relaxed prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:underline prose-strong:text-white/90 prose-code:text-cyan-300 prose-code:bg-white/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/10 prose-table:border-collapse prose-th:bg-white/5 prose-th:border prose-th:border-white/10 prose-th:px-3 prose-th:py-2 prose-th:text-left prose-td:border prose-td:border-white/10 prose-td:px-3 prose-td:py-2 prose-li:text-white/70 prose-blockquote:border-l-cyan-400/50 prose-blockquote:text-white/60 prose-hr:border-white/10',
      },
    },
  })
  editorRef.current = editor

  // Sync Markdown payload into Tiptap (if streaming from generation or init)
  useEffect(() => {
    if (editor && markdown) {
      if (!editor.isFocused) {
        const html = marked.parse(markdown) as string
        editor.commands.setContent(html)
      }
    }
  }, [markdown, editor])

  // AI inline action — sends selected text to AI and replaces it with the result
  const handleAiAction = useCallback(async (action: string) => {
    const ed = editorRef.current
    if (!ed || !apiKey) return

    const { from, to } = ed.state.selection
    if (from === to) return

    const selectedText = ed.state.doc.textBetween(from, to, ' ')
    if (!selectedText.trim()) return

    const systemPrompt = AI_ACTION_PROMPTS[action] || AI_ACTION_PROMPTS.mejorar

    setAiLoading(true)
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: selectedText }
          ],
          apiKey,
          provider,
        }),
      })

      if (!response.ok || !response.body) throw new Error('AI request failed')

      // Read streaming response
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let result = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        result += decoder.decode(value, { stream: true })
      }

      // Clean up potential artifact wrappers or markdown code fences from the response
      result = result.replace(/^```[\s\S]*?\n/, '').replace(/\n```$/, '').trim()

      if (result) {
        // Replace the selected text in the editor
        ed.chain().focus().deleteRange({ from, to }).insertContentAt(from, result).run()
      }
    } catch (err) {
      console.error(`[DocumentViewer] AI ${action} error:`, err)
    } finally {
      setAiLoading(false)
    }
  }, [apiKey, provider])

  // P9 Fix: Export uses Tiptap's live content, not the original markdown
  const handleDownload = async () => {
    setExporting(true)
    try {
      const ed = editorRef.current
      let exportData = contenido

      // If the editor has content, convert its HTML back to markdown for export
      if (ed) {
        const currentHtml = ed.getHTML()
        const currentMarkdown = htmlToMarkdown(currentHtml)
        exportData = { ...contenido, markdown: currentMarkdown }
      }

      await exportToDocx(exportData, titulo)
    } catch (err) {
      console.error('Error exporting DOCX:', err)
    } finally {
      setExporting(false)
    }
  }

  const bubbleDisabled = aiLoading || !apiKey
  const bubbleBtnClass = `px-3 py-1.5 flex items-center gap-1.5 text-xs text-white/80 hover:bg-white/10 hover:text-white transition-colors ${bubbleDisabled ? 'opacity-40 cursor-not-allowed' : ''}`

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 bg-zinc-900/40">
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
            className="text-xs px-2 py-1 rounded bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 transition-all disabled:opacity-40 flex items-center gap-1"
          >
            {exporting ? 'Generando...' : 'Descargar .docx'}
          </button>
          <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
            Docs v2
          </span>
        </div>
      </div>

      {/* Editor Tiptap container */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <MenuBar editor={editor} onAiAction={handleAiAction} aiLoading={aiLoading} />

        {/* AI loading overlay */}
        {aiLoading && (
          <div className="absolute top-12 right-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/30 backdrop-blur-sm">
            <Loader2 className="w-3.5 h-3.5 text-indigo-300 animate-spin" />
            <span className="text-xs text-indigo-300 font-medium">IA procesando...</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-8 md:px-12">
          <div className="max-w-3xl mx-auto h-full">
            {editor && (
              <BubbleMenu editor={editor} className="flex bg-zinc-800/95 border border-white/10 rounded-lg shadow-xl overflow-hidden backdrop-blur-md">
                <button
                  onClick={() => handleAiAction('resumir')}
                  disabled={bubbleDisabled}
                  className={bubbleBtnClass}
                >
                  <TextSelect className="w-3.5 h-3.5" />
                  Resumir
                </button>
                <div className="w-px bg-white/10" />
                <button
                  onClick={() => handleAiAction('expandir')}
                  disabled={bubbleDisabled}
                  className={bubbleBtnClass}
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  Expandir
                </button>
                <div className="w-px bg-white/10" />
                <button
                  onClick={() => handleAiAction('simplificar')}
                  disabled={bubbleDisabled}
                  className={bubbleBtnClass}
                >
                  <Eraser className="w-3.5 h-3.5" />
                  Simplificar
                </button>
                <div className="w-px bg-white/10" />
                <button
                  onClick={() => handleAiAction('traducir')}
                  disabled={bubbleDisabled}
                  className={bubbleBtnClass}
                >
                  <Languages className="w-3.5 h-3.5 text-cyan-400" />
                  Traducir
                </button>
              </BubbleMenu>
            )}
            <EditorContent editor={editor} className="h-full" />
          </div>
        </div>
      </div>
    </div>
  )
}
