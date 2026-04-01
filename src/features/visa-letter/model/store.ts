import { create } from 'zustand'
import type { VisaLetterData } from '@/shared/config/visa-letter-prompts'
import { VISA_LETTER_STEPS } from '@/shared/config/visa-letter-prompts'

export type FlowPhase = 'questions' | 'generating' | 'document' | 'refining'

export interface ChatMsg {
  id: string
  role: 'assistant' | 'user'
  content: string
  timestamp: number
}

interface VisaLetterStore {
  // Flow state
  phase: FlowPhase
  currentStep: number
  totalSteps: number

  // Chat messages for the guided conversation
  messages: ChatMsg[]

  // Collected user data (key-value from each step)
  collectedData: Partial<VisaLetterData>

  // Generated document
  generatedDocument: string
  documentTitle: string
  isLoading: boolean

  // Actions
  setPhase: (phase: FlowPhase) => void
  addMessage: (msg: Omit<ChatMsg, 'id' | 'timestamp'>) => void
  answerStep: (value: string) => void
  skipStep: () => void
  goBack: () => void
  setGeneratedDocument: (doc: string, title: string) => void
  setIsLoading: (loading: boolean) => void
  reset: () => void
  setMessages: (messages: ChatMsg[]) => void
}

let msgCounter = 0
function generateMsgId() {
  return `msg-${Date.now()}-${++msgCounter}`
}

const initialState = {
  phase: 'questions' as FlowPhase,
  currentStep: 0,
  totalSteps: VISA_LETTER_STEPS.length,
  messages: [] as ChatMsg[],
  collectedData: {} as Partial<VisaLetterData>,
  generatedDocument: '',
  documentTitle: '',
  isLoading: false,
}

export const useVisaLetterStore = create<VisaLetterStore>((set, get) => ({
  ...initialState,

  setPhase: (phase) => set({ phase }),

  addMessage: (msg) => set((state) => ({
    messages: [...state.messages, {
      ...msg,
      id: generateMsgId(),
      timestamp: Date.now(),
    }],
  })),

  answerStep: (value) => {
    const { currentStep, collectedData, messages } = get()
    const step = VISA_LETTER_STEPS[currentStep]
    if (!step) return

    // Store the answer
    const updatedData = { ...collectedData, [step.fieldKey]: value }

    // Add user message
    const userMsg: ChatMsg = {
      id: generateMsgId(),
      role: 'user',
      content: value,
      timestamp: Date.now(),
    }

    const newMessages = [...messages, userMsg]
    const nextStep = currentStep + 1

    // Check if we have more steps
    if (nextStep < VISA_LETTER_STEPS.length) {
      // Add next question
      const nextQuestion = VISA_LETTER_STEPS[nextStep]
      const assistantMsg: ChatMsg = {
        id: generateMsgId(),
        role: 'assistant',
        content: nextQuestion.question + (nextQuestion.helperText ? `\n\n💡 *${nextQuestion.helperText}*` : ''),
        timestamp: Date.now(),
      }
      set({
        collectedData: updatedData,
        currentStep: nextStep,
        messages: [...newMessages, assistantMsg],
      })
    } else {
      // All questions answered — ready to generate
      const completeMsg: ChatMsg = {
        id: generateMsgId(),
        role: 'assistant',
        content: '✅ ¡Tengo toda la información necesaria! Voy a generar tu Carta de Experto profesional. Esto puede tomar unos segundos...',
        timestamp: Date.now(),
      }
      set({
        collectedData: updatedData,
        currentStep: nextStep,
        messages: [...newMessages, completeMsg],
        phase: 'generating',
      })
    }
  },

  skipStep: () => {
    const { currentStep, messages } = get()
    const nextStep = currentStep + 1

    if (nextStep < VISA_LETTER_STEPS.length) {
      const nextQuestion = VISA_LETTER_STEPS[nextStep]
      const skipMsg: ChatMsg = {
        id: generateMsgId(),
        role: 'user',
        content: '(omitido)',
        timestamp: Date.now(),
      }
      const assistantMsg: ChatMsg = {
        id: generateMsgId(),
        role: 'assistant',
        content: nextQuestion.question + (nextQuestion.helperText ? `\n\n💡 *${nextQuestion.helperText}*` : ''),
        timestamp: Date.now(),
      }
      set({
        currentStep: nextStep,
        messages: [...messages, skipMsg, assistantMsg],
      })
    } else {
      const completeMsg: ChatMsg = {
        id: generateMsgId(),
        role: 'assistant',
        content: '✅ ¡Tengo la información! Generando tu Carta de Experto...',
        timestamp: Date.now(),
      }
      set({
        currentStep: nextStep,
        messages: [...messages, completeMsg],
        phase: 'generating',
      })
    }
  },

  goBack: () => {
    const { currentStep } = get()
    if (currentStep <= 0) return
    // Go back by removing last 2 messages (user answer + assistant question)
    set((state) => ({
      currentStep: currentStep - 1,
      messages: state.messages.slice(0, -2),
    }))
  },

  setGeneratedDocument: (doc, title) => set({
    generatedDocument: doc,
    documentTitle: title,
    phase: 'document',
    isLoading: false,
  }),

  setIsLoading: (loading) => set({ isLoading: loading }),

  setMessages: (messages) => set({ messages }),

  reset: () => set({ ...initialState, messages: [] }),
}))
