'use client'

import React from 'react'
import Link from 'next/link'
import { ChevronLeft, Search } from 'lucide-react'
import { CoherenceAnalyzer } from '@/widgets/coherence-analyzer'
import { SettingsModal, useAppStore } from '@/features/settings'
import { UserMenu } from '@/widgets/user-menu'
import { useAuthStore } from '@/features/auth'
import dynamic from 'next/dynamic'

const GalaxyCanvas = dynamic(
  () => import('@/widgets/galaxy-canvas/ui/GalaxyCanvas'),
  { ssr: false, loading: () => <div className="w-full h-full absolute inset-0 bg-black -z-10" /> }
)

export default function CoherencePage() {
  const user = useAuthStore((s) => s.user)
  const { provider } = useAppStore()

  return (
    <main className="min-h-screen text-white relative overflow-x-hidden">
      <SettingsModal />
      
      {/* Background */}
      <div className="fixed inset-0 -z-10 bg-black" />
      <GalaxyCanvas isListening={false} volume={0} artifactType="documento" panelOpen={false} />
      
      {/* Navigation Header */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link 
              href="/" 
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group"
            >
              <div className="p-2 rounded-xl bg-white/5 border border-white/10 group-hover:bg-white/10 group-hover:border-white/20 transition-all">
                <ChevronLeft className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium">Volver al Canvas</span>
            </Link>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <Search className="w-4 h-4 text-indigo-400" />
              </div>
              <span className="text-sm font-bold tracking-tight">Análisis de Coherencia</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
             {user ? (
                <UserMenu user={user} />
              ) : (
                <button
                  onClick={() => useAppStore.getState().openSettings()}
                  className="p-2 w-10 h-10 rounded-full bg-zinc-900/60 backdrop-blur-xl border border-white/5 text-white/40 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all flex items-center justify-center shadow-xl shadow-black/40"
                >
                  <span className="text-lg">⚙️</span>
                </button>
              )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-24 pb-20 relative z-10">
        <CoherenceAnalyzer />
      </div>

      {/* Footer / Status bar */}
      <footer className="fixed bottom-0 inset-x-0 z-40 bg-zinc-900/40 backdrop-blur-md border-t border-white/5 px-6 py-2 flex items-center justify-center gap-6">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/60 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
          IA Lista: {provider}
        </div>
        <div className="h-3 w-px bg-white/5" />
        <div className="text-[10px] font-medium text-zinc-600">
          Soporta PDF, TXT, MD y JSON
        </div>
      </footer>
    </main>
  )
}
