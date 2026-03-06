import type { ArtifactType } from '@/shared/config/artifact-prompts'

export interface ParsedArtifact {
  type: ArtifactType
  titulo: string
  subtipo: string
  contenido: Record<string, unknown>
  raw: string
}

/**
 * Extrae un artefacto del output del LLM.
 * Busca bloques ```artifact:tipo { JSON } ``` en el texto.
 */
export function parseArtifactFromResponse(text: string): ParsedArtifact | null {
  // Buscar bloque ```artifact:tipo ... ```
  const artifactRegex = /```artifact:(documento|presentacion|codigo|imagen)\s*\n([\s\S]*?)```/
  const match = text.match(artifactRegex)

  if (!match) return null

  const type = match[1] as ArtifactType
  const jsonStr = match[2].trim()

  try {
    const parsed = JSON.parse(jsonStr)

    return {
      type,
      titulo: parsed.titulo || 'Sin título',
      subtipo: parsed.subtipo || 'otro',
      contenido: buildContenido(type, parsed),
      raw: jsonStr,
    }
  } catch (e) {
    console.error('Error parsing artifact JSON:', e)
    // Intento de recuperación: si es documento, tratar el texto como markdown
    if (type === 'documento') {
      return {
        type,
        titulo: 'Documento generado',
        subtipo: 'otro',
        contenido: { markdown: jsonStr },
        raw: jsonStr,
      }
    }
    return null
  }
}

/**
 * Construye el objeto contenido JSONB según el tipo de artefacto.
 */
function buildContenido(type: ArtifactType, parsed: Record<string, unknown>): Record<string, unknown> {
  switch (type) {
    case 'documento':
      return {
        markdown: parsed.contenido || '',
        toc: extractTOC(parsed.contenido as string || ''),
        word_count: countWords(parsed.contenido as string || ''),
      }

    case 'presentacion':
      return {
        slides: parsed.slides || [],
        theme: parsed.theme || 'dark',
        total_slides: Array.isArray(parsed.slides) ? parsed.slides.length : 0,
      }

    case 'codigo':
      return {
        html: parsed.html || '',
        framework: parsed.framework || 'html-tailwind',
        dependencies: parsed.dependencies || ['tailwindcss'],
      }

    case 'imagen':
      return {
        prompt: parsed.prompt || '',
        aspectRatio: parsed.aspectRatio || '16:9',
        imageUrl: '', // Se llena después de llamar a Nano Banana
      }

    default:
      return parsed
  }
}

/**
 * Extrae tabla de contenidos de un markdown string.
 */
function extractTOC(markdown: string): string[] {
  const headingRegex = /^#{1,3}\s+(.+)$/gm
  const toc: string[] = []
  let match
  while ((match = headingRegex.exec(markdown)) !== null) {
    toc.push(match[1].trim())
  }
  return toc
}

/**
 * Cuenta palabras en un string.
 */
function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length
}

/**
 * Detecta la intención del usuario a partir de la respuesta del LLM.
 */
export function parseIntentResponse(text: string): ArtifactType | 'general' {
  const clean = text.trim().toLowerCase()
  if (clean === 'documento' || clean === 'presentacion' || clean === 'codigo' || clean === 'imagen') {
    return clean as ArtifactType
  }
  return 'general'
}
