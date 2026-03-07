'use client'

import React from 'react'
import { Mic, Send, StopCircle, Loader2 } from 'lucide-react'

interface ChatInputProps {
  input: string;
  isListening: boolean;
  isLoading: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onToggleRecording: () => void;
  onSendVoice?: () => void;
}

export default function ChatInput({
  input,
  isListening,
  isLoading,
  onInputChange,
  onSubmit,
  onToggleRecording,
  onSendVoice,
}: ChatInputProps) {
  return (
    <form onSubmit={onSubmit} className="relative group">
      <div className={`absolute -inset-1 bg-gradient-to-r from-indigo-500 to-fuchsia-500 rounded-2xl blur transition-all duration-1000 ${isListening || isLoading ? 'opacity-70 animate-pulse' : 'opacity-25 group-hover:opacity-50'}`}></div>
      <div className="relative flex items-center bg-zinc-900/80 border border-zinc-800 rounded-2xl p-2 shadow-2xl backdrop-blur-xl">
        <button 
          type="button"
          onClick={onToggleRecording}
          className={`p-3 md:p-3 rounded-xl transition-colors shrink-0 ${
            isListening 
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
              : 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20'
          }`}
          title={isListening ? 'Detener grabación' : 'Iniciar grabación'}
        >
          {isListening ? <StopCircle className="w-6 h-6 md:w-6 md:h-6 animate-pulse" /> : <Mic className="w-6 h-6 md:w-6 md:h-6" />}
        </button>
        <input 
          type="text" 
          value={input}
          onChange={onInputChange}
          placeholder={isListening ? 'Habla ahora... di "listo"' : "Describe lo que quieres crear..."}
          disabled={isListening || isLoading}
          className="flex-1 min-w-0 bg-transparent border-none outline-none px-3 md:px-4 text-sm md:text-base text-zinc-200 placeholder-zinc-500 disabled:opacity-50"
        />
        {isListening ? (
          <button 
            type="button"
            onClick={onSendVoice}
            disabled={!input.trim()}
            className={`p-3 rounded-xl transition-all shrink-0 ${
              input.trim() 
                ? 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 hover:text-white' 
                : 'text-zinc-600 opacity-30'
            }`}
            title="Enviar mensaje de voz"
          >
            <Send className="w-5 h-5" />
          </button>
        ) : (
          <button 
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-3 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-colors disabled:opacity-30 disabled:hover:bg-transparent shrink-0"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        )}
      </div>
    </form>
  )
}
