'use client'

import React, { useState } from 'react'
import { Sparkles, FileText, Presentation, Code, X } from 'lucide-react'
import { TEMPLATES, type Template } from '@/shared/config/templates'
import type { ArtifactType } from '@/shared/config/artifact-prompts'

interface TemplateSelectorProps {
  onSelectTemplate: (template: Template, topic: string) => void
  onClose: () => void
}

const TYPE_TABS: { type: ArtifactType; label: string; icon: React.ReactNode; color: string }[] = [
  { type: 'documento', label: 'Documentos', icon: <FileText className="w-3.5 h-3.5" />, color: 'blue' },
  { type: 'presentacion', label: 'Presentaciones', icon: <Presentation className="w-3.5 h-3.5" />, color: 'purple' },
  { type: 'codigo', label: 'Código', icon: <Code className="w-3.5 h-3.5" />, color: 'green' },
]

export function TemplateSelector({ onSelectTemplate, onClose }: TemplateSelectorProps) {
  const [activeType, setActiveType] = useState<ArtifactType>('documento')
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [topic, setTopic] = useState('')

  const filteredTemplates = TEMPLATES.filter(t => t.type === activeType)

  const handleGenerate = () => {
    if (!selectedTemplate || !topic.trim()) return
    onSelectTemplate(selectedTemplate, topic.trim())
  }

  const activeColor = TYPE_TABS.find(t => t.type === activeType)?.color || 'indigo'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 bg-zinc-950/95 border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-medium text-white/80">Crear desde plantilla</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Type tabs */}
        <div className="flex gap-1 px-4 pt-3">
          {TYPE_TABS.map(tab => (
            <button
              key={tab.type}
              onClick={() => { setActiveType(tab.type); setSelectedTemplate(null) }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${
                activeType === tab.type
                  ? `bg-${tab.color}-500/15 text-${tab.color}-300 border border-${tab.color}-500/25`
                  : 'bg-white/[0.03] text-white/35 border border-white/[0.06] hover:bg-white/[0.06] hover:text-white/50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Template grid */}
        <div className="grid grid-cols-2 gap-2 px-4 py-3">
          {filteredTemplates.map(template => (
            <button
              key={template.id}
              onClick={() => setSelectedTemplate(template)}
              className={`flex items-start gap-2.5 p-3 rounded-xl text-left transition-all ${
                selectedTemplate?.id === template.id
                  ? 'bg-indigo-500/15 border border-indigo-500/30 ring-1 ring-indigo-500/20'
                  : 'bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.1]'
              }`}
            >
              <span className="text-lg mt-0.5">{template.icon}</span>
              <div>
                <p className={`text-xs font-medium ${selectedTemplate?.id === template.id ? 'text-indigo-300' : 'text-white/70'}`}>
                  {template.label}
                </p>
                <p className="text-[10px] text-white/30 mt-0.5">{template.description}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Topic input + generate */}
        {selectedTemplate && (
          <div className="px-4 pb-4 space-y-2">
            <div className="text-[10px] text-white/25 uppercase tracking-wider">
              ¿Sobre qué tema?
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                placeholder={`Ej: "App de delivery de comida saludable"`}
                autoFocus
                className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white/80
                  placeholder:text-white/20 focus:outline-none focus:border-indigo-500/30 focus:bg-white/[0.05] transition-all"
              />
              <button
                onClick={handleGenerate}
                disabled={!topic.trim()}
                className={`px-4 py-2 rounded-xl text-xs font-medium transition-all
                  bg-indigo-500/20 text-indigo-300 border border-indigo-500/30
                  hover:bg-indigo-500/30 disabled:opacity-30 disabled:cursor-not-allowed`}
              >
                Crear
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
