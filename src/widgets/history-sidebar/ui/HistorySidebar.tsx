'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, MessageSquare, Clock, Trash2, ChevronLeft, Calendar } from 'lucide-react'
import { supabase } from '@/shared/lib/supabase'
import { useAuthStore } from '@/features/auth'
import { isToday, isYesterday, subDays } from 'date-fns'

interface ChatSession {
  id: string
  title: string
  created_at: string
  updated_at: string
}

interface HistorySidebarProps {
  isOpen: boolean
  onClose: () => void
  currentSessionId: string | null
  onSelectSession: (id: string) => void
  onNewChat: () => void
}

export function HistorySidebar({ isOpen, onClose, currentSessionId, onSelectSession, onNewChat }: HistorySidebarProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const user = useAuthStore((s) => s.user)

  const loadSessions = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('[HistorySidebar] Error loading sessions:', error)
    } else {
      setSessions(data || [])
    }
    setIsLoading(false)
  }, [user])

  useEffect(() => {
    if (isOpen) loadSessions()
  }, [isOpen, loadSessions, currentSessionId])

  const deleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const { error } = await supabase.from('chat_sessions').delete().eq('id', id)
    if (error) {
      console.error('[HistorySidebar] Error deleting session:', error)
    } else {
      setSessions(sessions.filter(s => s.id !== id))
      if (currentSessionId === id) onNewChat()
    }
  }

  const filteredSessions = sessions.filter(s => 
    s.title.toLowerCase().includes(search.toLowerCase())
  )

  const groupSessions = (items: ChatSession[]) => {
    const groups: { [key: string]: ChatSession[] } = {
      'Hoy': [],
      'Ayer': [],
      'Últimos 7 días': [],
      'Anteriores': []
    }

    items.forEach(session => {
      const date = new Date(session.created_at)
      if (isToday(date)) groups['Hoy'].push(session)
      else if (isYesterday(date)) groups['Ayer'].push(session)
      else if (date > subDays(new Date(), 7)) groups['Últimos 7 días'].push(session)
      else groups['Anteriores'].push(session)
    })

    return Object.entries(groups).filter(([, items]) => items.length > 0)
  }

  const groupedSessions = groupSessions(filteredSessions)

  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70] md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-80 bg-neutral-900/30 backdrop-blur-2xl border-r border-white/10 z-[80] transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] transform shadow-[8px_0_32px_rgba(0,0,0,0.5)] ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* Shine effect atop glass */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

        <div className="flex flex-col h-full relative z-10">
          {/* Header */}
          <div className="p-6 border-b border-white/[0.05] space-y-5 bg-white/[0.02]">
            <div className="flex items-center justify-between">
              <h2 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-indigo-400" /> Historial
              </h2>
              <button 
                onClick={onClose}
                className="p-1.5 hover:bg-white/10 rounded-full text-white/30 hover:text-white transition-all hover:rotate-90 duration-300"
                title="Cerrar lateral"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            <button 
              onClick={() => { onNewChat(); onClose(); }}
              className="group relative w-full overflow-hidden flex items-center justify-center gap-3 px-4 py-3 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-100 hover:text-white transition-all shadow-lg hover:shadow-indigo-500/20"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-fuchsia-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" /> 
              <span className="relative z-10 text-sm font-semibold">Nueva Conversación</span>
            </button>

            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-indigo-400 transition-colors" />
              <input 
                type="text"
                placeholder="Buscar en el universo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-black/30 hover:bg-black/40 border border-white/10 focus:border-indigo-500/50 rounded-2xl py-2.5 pl-10 pr-4 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-all duration-300"
              />
            </div>
          </div>

          {/* List content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar px-3 py-4 space-y-6">
            {isLoading && sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-4">
                <div className="relative">
                  <div className="w-8 h-8 border-2 border-indigo-500/20 rounded-full" />
                  <div className="absolute top-0 w-8 h-8 border-t-2 border-indigo-400 rounded-full animate-spin" />
                </div>
                <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Sincronizando...</span>
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="p-8 text-center animate-pulse">
                <MessageSquare className="w-12 h-12 text-white/5 mx-auto mb-4 stroke-[1px]" />
                <p className="text-sm text-white/20 font-light tracking-wide">El vacío te observa</p>
              </div>
            ) : (
              groupedSessions.map(([groupName, groupItems]) => (
                <div key={groupName} className="space-y-2">
                  <h3 className="px-3 text-[9px] font-black text-white/10 uppercase tracking-[0.3em] flex items-center gap-2 mb-3">
                    <Calendar className="w-3 h-3 text-indigo-500/40" /> {groupName}
                  </h3>
                  <div className="space-y-1.5">
                    {groupItems.map((session) => (
                      <div 
                        key={session.id}
                        onClick={() => { onSelectSession(session.id); onClose(); }}
                        className={`group relative flex items-center justify-between p-3.5 rounded-2xl cursor-pointer transition-all duration-300 border ${
                          currentSessionId === session.id 
                            ? 'bg-white/[0.08] border-white/10 shadow-2xl shadow-indigo-500/5' 
                            : 'hover:bg-white/[0.03] border-transparent hover:border-white/[0.05]'
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0 z-10">
                          <div className={`p-2 rounded-xl transition-colors ${currentSessionId === session.id ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white/5 text-white/20 group-hover:text-white/40'}`}>
                            <MessageSquare className="w-4 h-4" />
                          </div>
                          <span className={`text-sm truncate transition-colors ${currentSessionId === session.id ? 'text-white font-medium' : 'text-white/40 group-hover:text-white/70'}`}>
                            {session.title}
                          </span>
                        </div>
                        
                        <button 
                          onClick={(e) => deleteSession(e, session.id)}
                          className={`relative z-20 p-2 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-white/20 hover:text-red-400 transition-all transform hover:scale-110 active:scale-90 ${currentSessionId === session.id ? 'opacity-40 hover:opacity-100' : ''}`}
                          title="Eliminar del tiempo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Hover refractive light */}
                        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer stats */}
          <div className="p-5 border-t border-white/5 bg-white/[0.01]">
             <div className="flex items-center justify-between text-[9px] text-white/15 uppercase tracking-[0.2em] font-black">
                <span className="flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-green-500/60" /> Online</span>
                <span className="px-2 py-0.5 rounded-full bg-white/[0.03] border border-white/5">v2.1 Galaxy Ia</span>
             </div>
          </div>
        </div>
      </aside>
    </>
  )
}
