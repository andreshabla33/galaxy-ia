'use client'

import { X, Key, Zap } from 'lucide-react'
import { useAppStore } from '../model/appStore'
import { PROVIDER_CONFIG, type AIModelProvider } from '@/shared/config/providers'

export default function SettingsModal() {
  const { apiKey, provider, setApiKey, setProvider, settingsOpen, closeSettings } = useAppStore()

  if (!settingsOpen) return null

  const providers = (Object.keys(PROVIDER_CONFIG) as AIModelProvider[]).map((id) => ({
    id,
    label: PROVIDER_CONFIG[id].label,
    sub: PROVIDER_CONFIG[id].model,
  }))

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-950 border border-zinc-800 p-8 rounded-3xl w-full max-w-md shadow-2xl relative">
        <button 
          onClick={closeSettings}
          className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-indigo-500/10 rounded-lg">
            <Zap className="w-5 h-5 text-indigo-400" />
          </div>
          <h2 className="text-xl font-light text-white">Configuración del Motor AI</h2>
        </div>

        <div className="space-y-6">
          {/* Provider Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-zinc-400">Proveedor de IA</label>
            <div className="grid grid-cols-2 gap-2">
              {providers.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setProvider(p.id)}
                  className={`py-2.5 px-3 rounded-xl text-left transition-all border ${
                    provider === p.id 
                      ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' 
                      : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
                  }`}
                >
                  <span className="text-sm font-medium block">{p.label}</span>
                  <span className="text-[10px] opacity-60">{p.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* API Key Input */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-zinc-400">API Key</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Key className="h-4 w-4 text-zinc-600" />
              </div>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={`Ingresa tu clave de ${provider.charAt(0).toUpperCase() + provider.slice(1)}...`}
                className="w-full bg-zinc-900 border border-zinc-800 text-white text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block pl-10 p-3 outline-none transition-all"
              />
            </div>
            <p className="text-xs text-zinc-600">
              La llave se guarda localmente en tu navegador. No se envía a nuestros servidores.
            </p>
          </div>
          
          <button 
            onClick={closeSettings}
            className="w-full py-3 bg-white text-black font-medium rounded-xl hover:bg-zinc-200 transition-colors"
          >
            Guardar y Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
