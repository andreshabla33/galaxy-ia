'use client'

import React, { useState, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import { MermaidExtension } from './MermaidExtension'
import { marked } from 'marked'
import { exportToDocx } from '@/shared/lib/export-docx'
import {
  Bold, Italic, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Code, Sparkles,
  TextSelect, Eraser, Languages
} from 'lucide-react'

interface DocumentViewerProps {
  contenido: {
    markdown?: string
    toc?: string[]
    word_count?: number
  }
  titulo: string
}

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) {
    return null
  }

  const toggleBtnClass = "p-1.5 rounded-md hover:bg-white/10 transition-colors text-white/60 hover:text-white"
  const activeBtnClass = "bg-white/20 text-white"

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
        onClick={() => alert('Próximamente: Selecciona texto y usa este botón para que la IA lo reescriba o mejore inline.')}
        className="text-xs flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 transition-colors shrink-0"
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">AI Mágica</span>
      </button>
    </div>
  )
}

export function DocumentViewer({ contenido, titulo }: DocumentViewerProps) {
  const markdown = contenido.markdown || ''
  const [exporting, setExporting] = useState(false)

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
        class: `prose prose-invert prose-sm max-w-none min-h-[500px] focus:outline-none
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
        `,
      },
    },
  })

  // Sync Markdown payload into Tiptap (if streaming from generation or init)
  useEffect(() => {
    if (editor && markdown) {
      if (!editor.isFocused) {
        // Convert Markdown to HTML for the editor
        const html = marked.parse(markdown) as string

        // Prevent unnecessary jumpy updates if it's the same content structurally
        editor.commands.setContent(html)
      }
    }
  }, [markdown, editor])

  const handleDownload = async () => {
    setExporting(true)
    try {
      // NOTE: For export currently relying on local Markdown model. 
      // If user heavily edited the Tiptap, a converter from tiptap-HTML -> Markdown would be utilized here.
      await exportToDocx(contenido, titulo)
    } catch (err) {
      console.error('Error exporting DOCX:', err)
    } finally {
      setExporting(false)
    }
  }

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
        <MenuBar editor={editor} />
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-8 md:px-12">
          <div className="max-w-3xl mx-auto h-full">
            {editor && (
              <BubbleMenu editor={editor} className="flex bg-zinc-800 border border-white/10 rounded-lg shadow-xl overflow-hidden backdrop-blur-md">
                <button
                  onClick={() => alert('Próximamente: La IA resumirá este texto.')}
                  className="px-3 py-1.5 flex items-center gap-1.5 text-xs text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <TextSelect className="w-3.5 h-3.5" />
                  Resumir
                </button>
                <div className="w-px bg-white/10" />
                <button
                  onClick={() => alert('Próximamente: La IA expandirá y mejorará este texto.')}
                  className="px-3 py-1.5 flex items-center gap-1.5 text-xs text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  Expandir
                </button>
                <div className="w-px bg-white/10" />
                <button
                  onClick={() => alert('Próximamente: La IA hará este texto conciso.')}
                  className="px-3 py-1.5 flex items-center gap-1.5 text-xs text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <Eraser className="w-3.5 h-3.5" />
                  Simplificar
                </button>
                <div className="w-px bg-white/10" />
                <button
                  onClick={() => alert('Próximamente: Traducir texto inline.')}
                  className="px-3 py-1.5 flex items-center gap-1.5 text-xs text-white/80 hover:bg-white/10 hover:text-white transition-colors"
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
