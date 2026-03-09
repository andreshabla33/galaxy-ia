import { mergeAttributes, Node } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import mermaid from 'mermaid'
import React, { useEffect, useState, useRef } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'

// Renderizador React para los bloques de código detectados como Mermaid
function MermaidNodeView({ node }: { node: any }) {
    const code = node.attrs.code || ''
    const [svg, setSvg] = useState<string>('')
    const [error, setError] = useState<string>('')
    const [expanded, setExpanded] = useState(false)
    const renderId = useRef(`mermaid-${Math.floor(Math.random() * 100000)}`)

    useEffect(() => {
        mermaid.initialize({
            startOnLoad: false,
            theme: 'dark',
            themeVariables: {
                background: 'transparent',
                primaryColor: '#1e1e2e',
                primaryTextColor: '#cdd6f4',
                primaryBorderColor: '#313244',
                lineColor: '#89b4fa',
                secondaryColor: '#313244',
                tertiaryColor: '#1e1e2e'
            }
        })

        const renderChart = async () => {
            if (!code.trim()) return
            try {
                setError('')
                const { svg } = await mermaid.render(renderId.current, code)
                setSvg(svg)
            } catch (e: any) {
                setError(e.message || 'Error invalid syntax mermaid')
            }
        }

        renderChart()
    }, [code])

    return (
        <NodeViewWrapper className="mermaid-graph my-6 bg-zinc-900/50 rounded-xl border border-white/5 relative overflow-hidden group">
            <div className="flex justify-between items-center px-4 py-2 border-b border-white/5 bg-zinc-900">
                <span className="text-xs font-medium text-white/50">Diagrama Arquitectónico (Mermaid)</span>
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-white/40 hover:text-white transition"
                    title={expanded ? "Minimizar" : "Maximizar"}
                >
                    {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
            </div>

            <div className={`flex justify-center flex-col items-center p-6 ${expanded ? '' : 'max-h-[500px] overflow-auto'}`}>
                {error ? (
                    <div className="bg-red-500/10 text-red-500 p-4 rounded-lg text-xs font-mono whitespace-pre-wrap w-full">
                        {error}
                        <div className="mt-4 text-[10px] opacity-60">Código fuente detectado:\n{code}</div>
                    </div>
                ) : svg ? (
                    <div
                        dangerouslySetInnerHTML={{ __html: svg }}
                        className="w-full flex justify-center [&>svg]:max-w-full [&>svg]:h-auto"
                    />
                ) : (
                    <div className="text-white/30 text-sm animate-pulse">Generando arquitectura visual...</div>
                )}
            </div>
        </NodeViewWrapper>
    )
}

// Extensión Root de Tiptap
export const MermaidExtension = Node.create({
    name: 'mermaidBlock',
    group: 'block',
    content: 'text*',
    marks: '',
    defining: true,

    addAttributes() {
        return {
            code: {
                default: '',
                parseHTML: (element) => element.textContent,
            },
            language: {
                default: 'mermaid',
            }
        }
    },

    parseHTML() {
        return [
            {
                tag: 'pre',
                priority: 100, // Alto para sobreescribir el CodeBlock de StarterKit
                getAttrs: (node) => {
                    if (node instanceof HTMLElement) {
                        const codeEl = node.querySelector('code')
                        if (codeEl && codeEl.className.includes('language-mermaid')) {
                            return { code: codeEl.textContent, language: 'mermaid' }
                        }
                    }
                    return false
                }
            },
            {
                tag: 'div',
                priority: 100,
                getAttrs: (node) => {
                    if (node instanceof HTMLElement && node.className.includes('mermaid')) {
                        return { code: node.textContent, language: 'mermaid' }
                    }
                    return false
                }
            }
        ]
    },

    renderHTML({ node, HTMLAttributes }) {
        // Si queremos que se renderice al hacer SSR clásico o descargar
        return ['pre', { class: 'language-mermaid p-4 rounded-lg bg-black/30 w-full overflow-x-auto text-cyan-500 text-xs font-mono' }, ['code', mergeAttributes(HTMLAttributes), node.attrs.code]]
    },

    addNodeView() {
        return ReactNodeViewRenderer(MermaidNodeView)
    },
})
