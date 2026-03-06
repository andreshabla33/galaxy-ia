'use client'

import { useState, useRef, useEffect } from 'react'
import { LogOut, Settings, User } from 'lucide-react'
import { signOut } from '@/shared/lib/supabase'
import { useAppStore } from '@/features/settings'
import type { User as AuthUser } from '@supabase/supabase-js'

interface UserMenuProps {
  user: AuthUser
}

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }
  return (email || 'U').slice(0, 2).toUpperCase()
}

export function UserMenu({ user }: UserMenuProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { openSettings } = useAppStore()

  const displayName = user.user_metadata?.full_name || user.email || 'Usuario'
  const initials = getInitials(user.user_metadata?.full_name, user.email)

  // Close on click outside
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  return (
    <div ref={menuRef} className="relative">
      {/* Avatar button */}
      <button
        onClick={() => setOpen(!open)}
        className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/40 to-fuchsia-500/40 border border-white/[0.12] flex items-center justify-center text-[11px] font-semibold text-white/80 hover:border-white/25 hover:from-indigo-500/50 hover:to-fuchsia-500/50 transition-all duration-200 shadow-lg shadow-black/20"
        title={displayName}
      >
        {initials}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-10 right-0 w-56 rounded-xl border border-white/[0.08] bg-zinc-900/90 backdrop-blur-2xl shadow-2xl shadow-black/40 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-[60]">
          {/* User info */}
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500/30 to-fuchsia-500/30 border border-white/[0.1] flex items-center justify-center text-xs font-semibold text-white/70 shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm text-white/80 font-medium truncate">{user.user_metadata?.full_name || 'Usuario'}</p>
                <p className="text-[11px] text-white/30 truncate">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-1.5">
            <button
              onClick={() => { setOpen(false); openSettings() }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/50 hover:bg-white/[0.06] hover:text-white/80 transition-all"
            >
              <Settings className="w-3.5 h-3.5" />
              Ajustes
            </button>
            <button
              onClick={() => { setOpen(false); signOut() }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-400/60 hover:bg-red-500/[0.08] hover:text-red-400/90 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
