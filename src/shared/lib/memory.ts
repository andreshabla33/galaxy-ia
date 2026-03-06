import { supabase } from './supabase'

/**
 * Genera un embedding para un texto usando la API de Gemini.
 */
export async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const res = await fetch('/api/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, apiKey }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data.embedding
}

/**
 * Guarda un artefacto con su embedding en la tabla artifact_embeddings.
 */
export async function saveArtifactMemory(
  artefactoId: string,
  usuarioId: string,
  contentSummary: string,
  apiKey: string,
  metadata: Record<string, unknown> = {}
) {
  try {
    const embedding = await generateEmbedding(contentSummary, apiKey)

    const { error } = await supabase.from('artifact_embeddings').insert({
      artefacto_id: artefactoId,
      usuario_id: usuarioId,
      content_summary: contentSummary,
      embedding: JSON.stringify(embedding),
      metadata,
    })

    if (error) {
      console.error('Error saving artifact memory:', error.message)
    }
  } catch {
    // Silent — embeddings are optional, don't pollute console
  }
}

/**
 * Busca artefactos similares en la memoria del usuario.
 */
export async function searchArtifactMemory(
  query: string,
  apiKey: string,
  matchCount = 3,
  matchThreshold = 0.5
): Promise<{ artefacto_id: string; content_summary: string; similarity: number; metadata: Record<string, unknown> }[]> {
  try {
    const embedding = await generateEmbedding(query, apiKey)

    const { data, error } = await supabase.rpc('match_artifacts', {
      query_embedding: JSON.stringify(embedding),
      match_threshold: matchThreshold,
      match_count: matchCount,
    })

    if (error) {
      console.error('Error searching memory:', error.message)
      return []
    }

    return data || []
  } catch (err) {
    console.error('Error searching artifact memory:', err)
    return []
  }
}

/**
 * Genera un resumen corto del artefacto para el embedding.
 */
export function buildArtifactSummary(type: string, titulo: string, contenido: Record<string, unknown>): string {
  const parts = [`[${type}] ${titulo}`]

  if (contenido.markdown) {
    const md = contenido.markdown as string
    parts.push(md.substring(0, 500))
  }
  if (contenido.slides && Array.isArray(contenido.slides)) {
    const titles = contenido.slides.map((s: Record<string, string>) => s.title).filter(Boolean).join(', ')
    parts.push(`Slides: ${titles}`)
  }
  if (contenido.prompt) {
    parts.push(`Prompt: ${contenido.prompt}`)
  }

  return parts.join(' | ').substring(0, 1000)
}
