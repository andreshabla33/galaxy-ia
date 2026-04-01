'use client'

import React from 'react'
import { Bot, User } from 'lucide-react'
import type { ChatMsg } from '@/features/visa-letter/model/store'

interface MessageBubbleProps {
  message: ChatMsg
  isLatest?: boolean
}

// Parse inline markdown: **bold**, *italic*
function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  // Match **bold** and *italic* patterns
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    // Text before the match
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index))
    }
    if (match[2]) {
      // **bold**
      nodes.push(<strong key={match.index} className="text-white/95 font-semibold">{match[2]}</strong>)
    } else if (match[3]) {
      // *italic*
      nodes.push(<em key={match.index} className="text-white/60">{match[3]}</em>)
    }
    lastIndex = match.index + match[0].length
  }

  // Remaining text
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }

  return nodes.length > 0 ? nodes : [text]
}

export function MessageBubble({ message, isLatest }: MessageBubbleProps) {
  const isAssistant = message.role === 'assistant'

  return (
    <div
      className={`flex gap-3 ${isAssistant ? '' : 'flex-row-reverse'} ${
        isLatest ? 'animate-in fade-in slide-in-from-bottom-2 duration-300' : ''
      }`}
    >
      {/* Avatar */}
      <div
        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isAssistant
            ? 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30'
            : 'bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30'
        }`}
      >
        {isAssistant ? (
          <Bot className="w-4 h-4 text-indigo-400" />
        ) : (
          <User className="w-4 h-4 text-emerald-400" />
        )}
      </div>

      {/* Message content */}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isAssistant
            ? 'bg-white/[0.04] border border-white/[0.06] text-white/80'
            : 'bg-indigo-500/15 border border-indigo-500/20 text-white/90'
        }`}
      >
        {message.content.split('\n').map((line, i) => {
          // Italic helper text line
          if (line.startsWith('💡 *') && line.endsWith('*')) {
            return (
              <p key={i} className="text-xs text-white/40 mt-2 italic">
                💡 {line.slice(4, -1)}
              </p>
            )
          }
          if (line === '') return <br key={i} />
          return <p key={i}>{renderInline(line)}</p>
        })}
      </div>
    </div>
  )
}
