import { supabase } from './supabase'
import { ARTIFACT_PROMPTS } from '@/shared/config/artifact-prompts'

export type IntentType = 'documento' | 'presentacion' | 'codigo' | 'imagen' | null
export type IntentTypeStrict = 'documento' | 'presentacion' | 'codigo' | 'imagen' | 'general'

// Cache en memoria — los prompts no cambian frecuentemente
const promptCache = new Map<string, { prompt: string; ts: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

// Intent detection ligero — regex client-side antes de llamar al LLM
const INTENT_PATTERNS: { type: IntentType; patterns: RegExp[] }[] = [
  {
    type: 'presentacion',
    patterns: [
      /presentaci/i, /slides?/i, /diapositivas?/i,
      /pitch\s*deck/i, /keynote/i, /powerpoint/i, /pptx?/i,
    ],
  },
  {
    type: 'documento',
    patterns: [
      /\bdocumento\b/i, /\breporte\b/i, /\bgu[ií]a\b/i,
      /\bcontrato\b/i, /\bpropuesta\b/i, /\bart[ií]culo\b/i,
      /\bmanual\b/i, /\bespecificaci[oó]n\b/i, /\bPRD\b/i,
      /\bensayo\b/i, /\binvestigaci[oó]n\b/i,
      /\bresumen\b/i, /\binforme\b/i, /\banalisis\b/i, /\banálisis\b/i,
    ],
  },
  {
    type: 'imagen',
    patterns: [
      /\bimagen\b/i, /\bfoto\b/i, /\bilustraci[oó]n\b/i,
      /\b[ií]cono\b/i, /\blog[oa]\b/i, /\barte\b/i, /\bbanner\b/i,
      /\bposter\b/i, /\bmockup\b/i, /\bdise[ñn]o\s*visual\b/i,
      /\bdibujo\b/i, /\bgenera.*imagen/i, /\bcrea.*logo/i,
    ],
  },
  {
    type: 'codigo',
    patterns: [
      /\blanding\b/i, /\bp[aá]gina\s*web\b/i, /\bcomponente\b/i,
      /\bdashboard\b/i, /\bformulario\b/i, /\binterfaz\b/i,
      /\bweb\s*app\b/i, /\bHTML\b/i, /\bcrea.*app\b/i,
      /\blogin\b/i, /\breact\b/i, /\bnextjs\b/i, /\bscript\b/i,
    ],
  },
]

/**
 * Detecta el intent del usuario a partir de su mensaje.
 * Retorna el tipo de artefacto o null si es conversación general.
 */
export function detectIntent(message: string): IntentType {
  for (const { type, patterns } of INTENT_PATTERNS) {
    if (patterns.some(p => p.test(message))) return type
  }
  return null
}

/**
 * Hybrid intent detection: regex fast path → LLM fallback.
 * Si el regex no matchea, pregunta al LLM con un prompt corto (~50ms).
 */
export async function detectIntentHybrid(
  message: string,
  apiKey: string,
  provider: string
): Promise<{ intent: IntentType; source: 'regex' | 'llm' | 'fallback' }> {
  // 1. Fast path: regex
  const regexResult = detectIntent(message)
  if (regexResult) {
    return { intent: regexResult, source: 'regex' }
  }

  // 2. LLM fallback: classify via API
  try {
    const res = await fetch('/api/classify-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, apiKey, provider }),
    })
    if (res.ok) {
      const data = await res.json()
      const llmIntent = data.intent as string
      if (llmIntent && llmIntent !== 'general') {
        console.log(`[prompt-loader] LLM classified: ${llmIntent}`)
        return { intent: llmIntent as IntentType, source: 'llm' }
      }
    }
  } catch (err) {
    console.warn('[prompt-loader] LLM classification failed:', err)
  }

  // 3. Fallback: general
  return { intent: null, source: 'fallback' }
}

/**
 * Carga el prompt especifico para un tipo desde los prompts locales premium.
 */
async function loadPromptFromDB(tipo: string): Promise<string | null> {
  // Los prompts locales de artifact-prompts.ts son más avanzados que los de la BD actual.
  if (tipo !== 'base' && ARTIFACT_PROMPTS[tipo as keyof typeof ARTIFACT_PROMPTS]) {
    console.log(`[prompt-loader] Using local premium prompt for: ${tipo}`)
    return ARTIFACT_PROMPTS[tipo as keyof typeof ARTIFACT_PROMPTS]
  }

  // Fallback to Supabase for base or other types
  const cached = promptCache.get(tipo)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.prompt
  }

  try {
    const res = await supabase.from('prompt_templates').select('system_prompt').eq('tipo', tipo).eq('activo', true).single()
    if (res.data) {
      promptCache.set(tipo, { prompt: res.data.system_prompt, ts: Date.now() })
      return res.data.system_prompt
    }
  } catch (e) {
    console.warn(`[prompt-loader] DB error for ${tipo}`, e)
  }
  return null
}

/**
 * Construye el system prompt completo:
 * 1. Intenta cache (instantáneo)
 * 2. Si no hay cache, carga de Supabase con timeout 3s, fallback si falla
 */
export async function buildDynamicPrompt(
  userMessage: string,
  apiKey?: string,
  provider?: string
): Promise<string> {
  // Hybrid: regex first, then LLM if available
  let intent: IntentType
  let source: string

  if (apiKey && provider) {
    const result = await detectIntentHybrid(userMessage, apiKey, provider)
    intent = result.intent
    source = result.source
  } else {
    intent = detectIntent(userMessage)
    source = 'regex'
  }
  console.log(`[prompt-loader] Intent: ${intent || 'general'} (via ${source})`)

  // Fast path: check cache first (synchronous)
  const cachedBase = promptCache.get('base')
  const cachedType = intent ? promptCache.get(intent) : null

  if (cachedBase && Date.now() - cachedBase.ts < CACHE_TTL) {
    const base = cachedBase.prompt
    if (!intent) return base
    if (cachedType && Date.now() - cachedType.ts < CACHE_TTL) {
      console.log(`[prompt-loader] All from cache`)
      return `${base}\n\n${cachedType.prompt}`
    }
  }

  // No cache — load from Supabase (with 3s timeout per query, fallback on failure)
  console.log(`[prompt-loader] Loading from Supabase...`)
  const basePrompt = await loadPromptFromDB('base')
  const base = basePrompt || FALLBACK_BASE

  if (!intent) return base

  const typePrompt = await loadPromptFromDB(intent)
  const type = typePrompt || ARTIFACT_PROMPTS[intent as keyof typeof ARTIFACT_PROMPTS] || ''

  const combined = type ? `${base}\n\n${type}` : base
  console.log(`[prompt-loader] Prompt ready: ${combined.length} chars`)
  return combined
}

// Pre-warm cache in background — doesn't block the user
let _preWarmingInProgress = false
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _preWarmCache() {
  if (_preWarmingInProgress) return
  _preWarmingInProgress = true

  const types = ['base', 'documento', 'presentacion', 'codigo', 'imagen']
  Promise.all(types.map(tipo => loadPromptFromDB(tipo)))
    .then(() => console.log('[prompt-loader] Cache pre-warmed'))
    .catch(err => console.warn('[prompt-loader] Pre-warm failed:', err))
    .finally(() => { _preWarmingInProgress = false })
}

/**
 * Invalida el cache (útil para admin que actualiza prompts)
 */
export function invalidatePromptCache() {
  promptCache.clear()
}

// Fallback mínimo
const FALLBACK_BASE = `Eres el cerebro detrás de "Galaxy AI Canvas".
Genera contenido profesional de manera directa.
NO saludes. El JSON debe ser válido.
Si es una pregunta general, responde en Markdown limpio sin bloque artifact.`
