'use client'

import { useState, useEffect } from 'react'
import { signInWithGoogle, signInWithGithub } from '@/shared/lib/supabase'

export function LoginScreen() {
  const [loading, setLoading] = useState<'google' | 'github' | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const handleGoogle = async () => {
    setLoading('google')
    await signInWithGoogle()
  }

  const handleGithub = async () => {
    setLoading('github')
    await signInWithGithub()
  }

  return (
    <div className="fixed inset-0 bg-[#050508] flex items-center justify-center z-50 overflow-hidden">

      {/* === AURORA BACKGROUND — orbes de color ambient === */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Orbe cyan — superior izquierdo */}
        <div className="absolute -top-[30%] -left-[10%] w-[60vw] h-[60vw] rounded-full bg-cyan-500/[0.07] blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        {/* Orbe purple — centro derecho */}
        <div className="absolute top-[20%] -right-[15%] w-[50vw] h-[50vw] rounded-full bg-purple-600/[0.08] blur-[120px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
        {/* Orbe blue — inferior */}
        <div className="absolute -bottom-[20%] left-[20%] w-[45vw] h-[45vw] rounded-full bg-blue-600/[0.06] blur-[100px] animate-pulse" style={{ animationDuration: '12s', animationDelay: '4s' }} />
        {/* Orbe pink — acento sutil */}
        <div className="absolute top-[50%] left-[10%] w-[25vw] h-[25vw] rounded-full bg-fuchsia-500/[0.04] blur-[80px] animate-pulse" style={{ animationDuration: '9s', animationDelay: '1s' }} />
      </div>

      {/* === Noise texture overlay === */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")', backgroundRepeat: 'repeat' }} />

      {/* === GLASS CARD === */}
      <div className={`relative z-10 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="relative flex flex-col items-center gap-8 max-w-[420px] w-full px-10 py-12 rounded-3xl
          bg-white/[0.03] backdrop-blur-2xl
          border border-white/[0.08]
          shadow-[0_8px_32px_0_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.05)]
        ">
          {/* Glow sutil detrás del card */}
          <div className="absolute -inset-px rounded-3xl bg-gradient-to-b from-white/[0.08] to-transparent pointer-events-none" />

          {/* Logo animado */}
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 blur-xl opacity-40 animate-pulse" style={{ animationDuration: '3s' }} />
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20 rotate-3">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
              </svg>
            </div>
          </div>

          {/* Título */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
              Galaxy AI Canvas
            </h1>
            <p className="text-white/30 text-sm leading-relaxed max-w-[280px]">
              Crea documentos, presentaciones y código con tu voz
            </p>
          </div>

          {/* Separador sutil */}
          <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          {/* Botones de login */}
          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={handleGoogle}
              disabled={loading !== null}
              className="group relative flex items-center justify-center gap-3 w-full px-5 py-3.5 rounded-2xl
                bg-white/[0.04] backdrop-blur-sm
                border border-white/[0.08]
                hover:bg-white/[0.08] hover:border-white/[0.15] hover:shadow-lg hover:shadow-white/[0.02]
                active:scale-[0.98]
                transition-all duration-300 ease-out
                text-white/80 text-sm font-medium
                disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white/[0.04]"
            >
              {/* Hover glow */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <svg className="w-5 h-5 relative" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="relative">
                {loading === 'google' ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
                    Conectando...
                  </span>
                ) : 'Continuar con Google'}
              </span>
            </button>

            <button
              onClick={handleGithub}
              disabled={loading !== null}
              className="group relative flex items-center justify-center gap-3 w-full px-5 py-3.5 rounded-2xl
                bg-white/[0.04] backdrop-blur-sm
                border border-white/[0.08]
                hover:bg-white/[0.08] hover:border-white/[0.15] hover:shadow-lg hover:shadow-white/[0.02]
                active:scale-[0.98]
                transition-all duration-300 ease-out
                text-white/80 text-sm font-medium
                disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white/[0.04]"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-cyan-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <svg className="w-5 h-5 relative" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              <span className="relative">
                {loading === 'github' ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
                    Conectando...
                  </span>
                ) : 'Continuar con GitHub'}
              </span>
            </button>
          </div>

          <p className="text-white/15 text-xs text-center">
            Al continuar, aceptas los términos de servicio
          </p>
        </div>
      </div>
    </div>
  )
}
