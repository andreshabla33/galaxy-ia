import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AIModelProvider } from '@/shared/config/providers'

interface AppState {
  apiKey: string
  provider: AIModelProvider
  setApiKey: (key: string) => void
  setProvider: (provider: AIModelProvider) => void
  isListening: boolean
  setIsListening: (isListening: boolean) => void
  settingsOpen: boolean
  openSettings: () => void
  closeSettings: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      apiKey: '',
      provider: 'gemini',
      setApiKey: (key) => set({ apiKey: key }),
      setProvider: (provider) => set({ provider }),
      isListening: false,
      setIsListening: (isListening) => set({ isListening }),
      settingsOpen: false,
      openSettings: () => set({ settingsOpen: true }),
      closeSettings: () => set({ settingsOpen: false }),
    }),
    {
      name: 'galaxy-ai-storage',
      partialize: (state) => ({ apiKey: state.apiKey, provider: state.provider }),
    }
  )
)
