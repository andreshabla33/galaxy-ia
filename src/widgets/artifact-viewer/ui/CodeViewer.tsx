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
import { Terminal } from 'lucide-react'

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
  
  // Debounce para Sandpack: Evita que el visualizador se crashee 
  // o se ponga en blanco al recibir cientos de actualizaciones por segundo durante el streaming
  const [debouncedCode, setDebouncedCode] = useState(rawCode)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCode(rawCode)
    }, 1500)
    return () => clearTimeout(timer)
  }, [rawCode])

  // Detect if it's a full HTML page (always vanilla)
  const hasHtmlPageTags = rawCode.toLowerCase().includes('<!doctype') ||
    rawCode.toLowerCase().includes('<html') ||
    rawCode.toLowerCase().includes('<body')

  // Detect React/JSX patterns
  const hasReactPatterns = rawCode.includes('export default') ||
    rawCode.includes('React.useState') ||
    rawCode.includes('useState(') ||
    rawCode.includes('useEffect(') ||
    (rawCode.includes('return (') && rawCode.includes('className='))

  const frameworkIsReact = Boolean(contenido.framework?.toLowerCase().includes('react'))
  const isReact = frameworkIsReact && !hasHtmlPageTags && hasReactPatterns

  // === CODEPEN STRATEGY: wrap JSX in a self-contained HTML with CDN deps ===
  // This is exactly how CodePen, JSFiddle and Replit handle React+Tailwind in browser.
  // Advantages over Sandpack React template:
  //   - Tailwind JIT works perfectly (loaded before render)
  //   - No "React is not defined" errors (React is global via CDN)
  //   - No import/export needed (Babel transpiles script directly)
  //   - Works identically in inline preview AND Deploy Mágico (CodeSandbox)
  const buildReactHtmlWrapper = (jsxCode: string): string => {
    // Strip ES module imports/exports — Babel in browser mode doesn't need them
    const code = jsxCode
      .replace(/^import\s+React[^;]*;?\s*/gm, '')          // remove React imports
      .replace(/^import\s+\{[^}]*\}\s+from\s+['"]react['"][^;]*;?\s*/gm, '') // remove named imports
      .replace(/^export\s+default\s+App\s*;?\s*$/gm, '')   // remove export default App
      .replace(/^export\s+default\s+function\s+App/gm, 'function App') // convert export fn
      .trim()

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <!-- Tailwind CSS (play CDN - full JIT support) -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
       theme: { extend: { fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] } } }
    }
  </script>
  <!-- Google Fonts -->
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  <!-- React + ReactDOM via CDN -->
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <!-- Babel for JSX transpilation -->
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: 'Inter', sans-serif; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    const { useState, useEffect, useRef, useCallback, useMemo } = React;

${code}

    const rootEl = document.getElementById('root');
    const root = ReactDOM.createRoot(rootEl);
    root.render(React.createElement(App));
  </script>
</body>
</html>`
  }

  // Determine template and file structure
  const template = isReact ? 'react' : 'vanilla'

  const files = {
    [isReact ? '/App.js' : '/index.html']: { code: debouncedCode, active: true },
    ...(isReact ? {
      '/index.js': {
        code: `
import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const rootElement = document.getElementById("root") || document.body;
const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
        `.trim()
      },
      '/package.json': {
        code: JSON.stringify({
          name: "sandpack-project",
          main: "/index.js",
          dependencies: {
            "react": "^18.0.0",
            "react-dom": "^18.0.0",
            "react-scripts": "^5.0.0",
            "lucide-react": "0.475.0",
            "framer-motion": "latest",
            "recharts": "latest",
            "clsx": "latest",
            "tailwind-merge": "latest"
          }
        }, null, 2)
      }
    } : {}),
    ...(contenido.css ? { '/styles.css': contenido.css } : {}),
    ...(contenido.js && !isReact ? { '/script.js': contenido.js } : {})
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(rawCode)
  }

  const handleDownload = () => {
    const blob = new Blob([isReact ? buildReactHtmlWrapper(rawCode) : rawCode], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${titulo.replace(/\s+/g, '-').toLowerCase()}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  const externalResources = ["https://cdn.tailwindcss.com"]
  const customSetup = isReact ? {
    dependencies: {
      "lucide-react": "0.475.0",
      "framer-motion": "latest",
      "recharts": "latest",
      "clsx": "latest",
      "tailwind-merge": "latest"
    }
  } : undefined

  return (
    <SandpackProvider
      template={template}
      theme="dark"
      files={files}
      customSetup={customSetup}
      options={{
        externalResources,
        initMode: "immediate",
        recompileMode: "immediate",
        recompileDelay: 300
      }}
      className="h-full w-full"
    >
      <div className="flex flex-col h-full bg-zinc-950 sandpack-container">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-2 border-b border-white/10 bg-zinc-900/40 shrink-0">
          <div>
            <h2 className="text-sm font-medium text-white/90">{titulo}</h2>
            <span className="text-[10px] text-white/40">{template === 'react' ? 'React (Sandpack)' : 'HTML/Tailwind'}</span>
          </div>
          <div className="flex items-center gap-2">
            <UnstyledOpenInCodeSandboxButton
              className="text-[10px] px-2 py-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/40 transition-all flex items-center gap-1.5 hidden sm:flex font-medium"
              title="Abre y despliega esto en la web vía CodeSandbox magic link"
            >
              🚀 Deploy Mágico
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
                      <span className="text-[10px] text-amber-400/50 flex items-center gap-1 bg-amber-400/5 px-2 py-0.5 rounded cursor-default" title="Copia el error y pégalo en el chat de edición para que la IA lo corrija">
                        <Terminal className="w-3 h-3" /> Copia errores al chat →
                      </span>
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
