export type AIModelProvider = 'gemini' | 'openai' | 'anthropic' | 'openrouter'

export const PROVIDER_CONFIG: Record<AIModelProvider, { label: string; model: string }> = {
  gemini: { label: 'Gemini', model: 'gemini-2.0-flash' },
  openai: { label: 'OpenAI', model: 'gpt-4o' },
  anthropic: { label: 'Anthropic', model: 'claude-3.5-sonnet' },
  openrouter: { label: 'OpenRouter', model: 'multi-modelo' },
}

// Fallback mínimo — los prompts reales se cargan dinámicamente desde Supabase
// via buildDynamicPrompt() en prompt-loader.ts
export const SYSTEM_PROMPT = `Eres el cerebro detrás de "Galaxy AI Canvas", un espacio de trabajo creativo e iterativo.
Tu objetivo es generar contenido profesional de manera directa.

REGLAS GENERALES:
- NO saludes, NO te despidas, ve directo al contenido.
- El JSON dentro del bloque artifact debe ser válido.
- Sé extenso y profesional en el contenido generado.
- Si es una PREGUNTA GENERAL o conversación, responde en Markdown limpio sin bloque artifact.`
