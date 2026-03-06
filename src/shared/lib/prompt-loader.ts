import { supabase } from './supabase'

export type IntentType = 'documento' | 'presentacion' | 'codigo' | 'imagen' | null

// Cache en memoria — los prompts no cambian frecuentemente
const promptCache = new Map<string, { prompt: string; ts: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

// Intent detection ligero — regex client-side antes de llamar al LLM
const INTENT_PATTERNS: { type: IntentType; patterns: RegExp[] }[] = [
  {
    type: 'presentacion',
    patterns: [
      /presentaci[oó]n/i, /slides?/i, /diapositivas?/i,
      /pitch\s*deck/i, /keynote/i, /powerpoint/i, /pptx?/i,
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
      /\bapp\b/i, /\bweb\s*app\b/i, /\bHTML\b/i, /\bUI\b/i,
    ],
  },
  {
    type: 'documento',
    patterns: [
      /\bdocumento\b/i, /\breporte\b/i, /\bgu[ií]a\b/i,
      /\bcontrato\b/i, /\bpropuesta\b/i, /\bart[ií]culo\b/i,
      /\bmanual\b/i, /\bespecificaci[oó]n\b/i, /\bPRD\b/i,
      /\bensayo\b/i, /\binvestigaci[oó]n\b/i,
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
 * Timeout wrapper — nunca esperamos más de 3s por Supabase
 */
function withTimeout<T>(promise: PromiseLike<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>(resolve => setTimeout(() => {
      console.warn(`[prompt-loader] Supabase timeout after ${ms}ms, using fallback`)
      resolve(fallback)
    }, ms)),
  ])
}

/**
 * Carga el prompt específico para un tipo desde Supabase con cache.
 */
async function loadPromptFromDB(tipo: string): Promise<string | null> {
  const cached = promptCache.get(tipo)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    console.log(`[prompt-loader] Cache hit for: ${tipo}`)
    return cached.prompt
  }

  console.log(`[prompt-loader] Loading from Supabase: ${tipo}`)

  let data: { system_prompt: string } | null = null
  let error: unknown = null

  try {
    const queryPromise = supabase
      .from('prompt_templates')
      .select('system_prompt')
      .eq('tipo', tipo)
      .eq('activo', true)
      .single()

    // Race against timeout — eslint-disable for any cast needed for Postgrest types
    const res = await Promise.race([
      queryPromise.then(r => r),
      new Promise<{ data: null; error: { message: string } }>(resolve =>
        setTimeout(() => resolve({ data: null, error: { message: 'timeout' } }), 3000)
      ),
    ])
    data = (res as { data: { system_prompt: string } | null }).data
    error = (res as { error: unknown }).error
  } catch (e) {
    error = e
  }

  if (error || !data) {
    console.warn(`[prompt-loader] Failed for tipo: ${tipo}`, error)
    return FALLBACK_PROMPTS[tipo] || null
  }

  console.log(`[prompt-loader] Loaded ${tipo}: ${data.system_prompt.length} chars`)
  promptCache.set(tipo, { prompt: data.system_prompt, ts: Date.now() })
  return data.system_prompt
}

/**
 * Construye el system prompt completo:
 * 1. Intenta cache (instantáneo)
 * 2. Si no hay cache, carga de Supabase con timeout 3s, fallback si falla
 */
export async function buildDynamicPrompt(userMessage: string): Promise<string> {
  const intent = detectIntent(userMessage)
  console.log(`[prompt-loader] Intent: ${intent || 'general'}`)

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
  const type = typePrompt || FALLBACK_PROMPTS[intent] || ''

  const combined = type ? `${base}\n\n${type}` : base
  console.log(`[prompt-loader] Prompt ready: ${combined.length} chars (source: ${typePrompt ? 'supabase' : 'fallback'})`)
  return combined
}

// Pre-warm cache in background — doesn't block the user
let preWarmingInProgress = false
function preWarmCache() {
  if (preWarmingInProgress) return
  preWarmingInProgress = true

  const types = ['base', 'documento', 'presentacion', 'codigo', 'imagen']
  Promise.all(types.map(tipo => loadPromptFromDB(tipo)))
    .then(() => console.log('[prompt-loader] Cache pre-warmed'))
    .catch(err => console.warn('[prompt-loader] Pre-warm failed:', err))
    .finally(() => { preWarmingInProgress = false })
}

/**
 * Invalida el cache (útil para admin que actualiza prompts)
 */
export function invalidatePromptCache() {
  promptCache.clear()
}

// Fallback mínimo por si Supabase no responde
const FALLBACK_BASE = `Eres el cerebro detrás de "Galaxy AI Canvas".
Genera contenido profesional de manera directa.
NO saludes. El JSON debe ser válido.
Si es una pregunta general, responde en Markdown limpio sin bloque artifact.`

// Fallback prompts hardcoded por tipo — se usan SOLO si Supabase no responde
const FALLBACK_PROMPTS: Record<string, string> = {
  documento: 'TAREA: Generar un DOCUMENTO.\nGenera un bloque ```artifact:documento con JSON: { "titulo", "subtipo", "contenido" (markdown completo) }',
  presentacion: `TAREA: Generar una PRESENTACIÓN profesional con slides.
Genera un bloque \`\`\`artifact:presentacion con JSON válido:
{ "titulo": "string", "subtipo": "string", "theme": "string", "slides": [{ "layout", "title", ... }] }
LAYOUTS: "title", "bullets", "two-column", "stats", "quote", "image-left", "image-right", "closing". Mínimo 8 slides.
IMÁGENES — OBLIGATORIO:
- SIEMPRE incluye "image_prompt" en al menos 5 slides.
- image_prompt DEBE ser EN INGLÉS, descriptivo (20+ palabras) con estilo, iluminación, composición y calidad (4K, cinematic).
- Ejemplo: "Futuristic blockchain network with glowing interconnected nodes floating in dark space, neon blue and purple lighting, 4K digital art, cinematic composition"
- Para slides con imagen usa layout "image-left" o "image-right": { "layout": "image-left"|"image-right", "title", "content", "image_prompt" }
- El slide "title" también DEBE tener image_prompt.`,
  codigo: 'TAREA: Generar CÓDIGO.\nGenera un bloque ```artifact:codigo con JSON: { "titulo", "subtipo", "framework", "html" (HTML+Tailwind autocontenido) }\nIncluir CDN de Tailwind.',
  imagen: 'TAREA: Generar una IMAGEN.\nGenera un bloque ```artifact:imagen con JSON: { "titulo", "subtipo", "prompt" (EN INGLÉS, descriptivo, 4K), "aspectRatio" (16:9|1:1|4:3) }',
}
