'use client'

import React, { useState } from 'react'
import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview,
  SandpackConsole,
  UnstyledOpenInCodeSandboxButton
} from "@codesandbox/sandpack-react"
import { Terminal, Rocket } from 'lucide-react'

interface CodeViewerProps {
  contenido: {
    html?: string
    css?: string
    js?: string
    framework?: string
    dependencies?: string[]
  }
  titulo: string
}

export function CodeViewer({ contenido, titulo }: CodeViewerProps) {
  const [showCode, setShowCode] = useState(false)
  const [showConsole, setShowConsole] = useState(false)

  const rawCode = contenido.html || ''

  // Determina el template y archivo principal en base al framework
  const isReact = contenido.framework?.toLowerCase().includes('react')
  const template = isReact ? 'react' : 'vanilla'
  const mainFile = isReact ? '/App.js' : '/index.html'

  // Si es React, pero manda HTML plano, a veces el LLM se equivoca. 
  // Lo forzamos en el index o App dependiendo del contenido, pero sandpack es flexible.
  const files = {
    [mainFile]: { code: rawCode, active: true },
    ...(contenido.css ? { '/styles.css': contenido.css } : {}),
    ...(contenido.js && !isReact ? { '/script.js': contenido.js } : {})
  }

  // Inject dependencies if existing
  const customSetup = contenido.dependencies && contenido.dependencies.length > 0
    ? {
      dependencies: contenido.dependencies.reduce((acc, dep) => {
        // just a mock map since sandpack auto-fetches from npm
        acc[dep] = 'latest'
        return acc
      }, {} as Record<string, string>)
    }
    : undefined

  const handleCopy = () => {
    navigator.clipboard.writeText(rawCode)
  }

  const handleDownload = () => {
    const ext = isReact ? 'js' : 'html'
    const blob = new Blob([rawCode], { type: isReact ? 'text/javascript' : 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${titulo.replace(/\s+/g, '-').toLowerCase()}.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <SandpackProvider
      template={template}
      theme="dark"
      files={files}
      customSetup={customSetup}
      className="h-full w-full"
    >
      <div className="flex flex-col h-full bg-zinc-950 sandpack-container">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 bg-zinc-900/40">
          <div>
            <h2 className="text-lg font-medium text-white/90">{titulo}</h2>
            <span className="text-xs text-white/40">{contenido.framework || 'HTML Vanilla'} (Sandpack v2)</span>
          </div>
          <div className="flex items-center gap-2">

            <UnstyledOpenInCodeSandboxButton
              className="text-xs px-2.5 py-1.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/40 transition-all flex items-center gap-1.5 hidden sm:flex font-medium"
              title="Abre y despliega esto en la web vía CodeSandbox magic link"
            >
              <Rocket className="w-3.5 h-3.5" /> Deploy Mágico
            </UnstyledOpenInCodeSandboxButton>

            {!showCode && (
              <button
                onClick={() => setShowConsole(!showConsole)}
                className={`text-xs px-2 py-1 rounded border transition-all flex items-center gap-1.5 ${showConsole
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10'
                  }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                Consola
              </button>
            )}
            <button
              onClick={() => setShowCode(!showCode)}
              className={`text-xs px-2 py-1 rounded border transition-all ${showCode
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10'
                }`}
            >
              {showCode ? 'Ver Preview' : 'Ver Editor de Código'}
            </button>
            <button
              onClick={handleCopy}
              className="text-xs px-2 py-1 rounded bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 transition-all hidden sm:block"
            >
              Copiar
            </button>
            <button
              onClick={handleDownload}
              className="text-xs px-2 py-1 rounded bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 transition-all hidden sm:block"
            >
              Descargar
            </button>
            <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Código v2
            </span>
          </div>
        </div>

        {/* Content powered by Sandpack */}
        <div className="flex-1 overflow-hidden relative">
          <SandpackLayout style={{ height: '100%', borderRadius: 0, border: 'none', background: 'transparent' }}>
            {showCode ? (
              <SandpackCodeEditor
                showLineNumbers
                showTabs
                closableTabs={false}
                style={{ height: '100%', width: '100%' }}
              />
            ) : (
              <div className="w-full h-full flex flex-col relative">
                <SandpackPreview
                  showNavigator={true}
                  showRefreshButton={true}
                  showOpenInCodeSandbox={false}
                  style={{ height: showConsole ? '70%' : '100%', width: '100%', borderRadius: 0 }}
                />

                {/* Consola para AI Debugging (WebContainers log) */}
                {showConsole && (
                  <div className="h-[30%] border-t border-white/10 bg-[#151515]">
                    <div className="flex items-center justify-between px-3 py-1 border-b border-white/5 bg-[#1a1a1a]">
                      <span className="text-[10px] text-white/40 uppercase tracking-wider">Terminal Output</span>
                      <button onClick={() => alert('Próximamente: "Auto-reparar". Se inyectará este error en el prompt de la IA.')} className="text-[10px] text-amber-400/80 hover:text-amber-400 flex items-center gap-1 bg-amber-400/10 px-2 py-0.5 rounded">
                        <Terminal className="w-3 h-3" /> Reparar con IA
                      </button>
                    </div>
                    <div className="h-full overflow-hidden">
                      <SandpackConsole resetOnPreviewRestart={true} standalone className="sandpack-console-custom" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </SandpackLayout>
        </div>
      </div>

      {/* Basic styles to override Sandpack's defaults if needed */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .sandpack-container .sp-layout {
          height: 100% !important;
          background: transparent !important;
        }
        .sandpack-console-custom {
          height: 100% !important;
          background: transparent !important;
        }
      `}} />
    </SandpackProvider>
  )
}
