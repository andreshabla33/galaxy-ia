/**
 * Web search integration via Firecrawl API.
 * Detects when a user's message would benefit from web research,
 * fetches relevant results, and formats them as LLM context.
 */

// Patterns that suggest the user wants or needs web research
const RESEARCH_PATTERNS = [
  /investiga/i, /busca\s*(en\s*)?(internet|web|línea|linea)/i,
  /\btrending\b/i, /\bactual(es|izado)?\b/i, /\breciente/i,
  /\b202[4-9]\b/, /\búltim[oa]s?\b/i, /\bnoticias?\b/i,
  /\bdatos\s*(reales|actuales|recientes)\b/i,
  /\bestadísticas?\b/i, /\bstats?\b/i,
  /\binformación\s*(sobre|de|del)\b/i,
  /\bresearch\b/i, /\bsearch\b/i, /\blook\s*up\b/i,
  /\bquién\s*(es|fue)\b/i, /\bwho\s*is\b/i,
  /\bcuánto/i, /\bcuál\s*(es)?\b/i,
  /\btendencia/i, /\bmercado\b/i, /\bprecio/i,
]

export function needsWebSearch(message: string): boolean {
  return RESEARCH_PATTERNS.some(p => p.test(message))
}

interface SearchResult {
  title: string
  url: string
  content: string
}

export async function performWebSearch(query: string, limit = 5): Promise<SearchResult[]> {
  try {
    console.log('[web-search] Searching:', query)
    const response = await fetch('/api/web-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit }),
    })

    if (!response.ok) {
      console.warn('[web-search] Failed:', response.status)
      return []
    }

    const data = await response.json()
    if (!data.success || !data.results?.length) return []

    console.log(`[web-search] Got ${data.results.length} results`)
    return data.results
  } catch (err) {
    console.warn('[web-search] Error:', err)
    return []
  }
}

export function formatSearchContext(results: SearchResult[]): string {
  if (!results.length) return ''

  const sections = results.map((r, i) =>
    `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.content.slice(0, 1500)}`
  ).join('\n\n---\n\n')

  return `\n\n--- INVESTIGACIÓN WEB (datos reales de internet) ---\nUsa esta información como base para tu respuesta. Cita las fuentes cuando sea relevante.\n\n${sections}\n\n--- FIN DE INVESTIGACIÓN ---\n`
}
