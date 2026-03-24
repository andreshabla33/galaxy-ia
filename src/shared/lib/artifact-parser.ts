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
 * Si no encuentra el wrapper correcto, intenta recuperarlo de cualquier bloque JSON.
 */
/**
 * Intenta limpiar un string JSON malformado (especialmente común con LLMs)
 */
function cleanJSON(jsonStr: string): string {
  let cleaned = jsonStr.trim()
  
  // 1. Quitar posibles bloques de Markdown dentro del JSON si están mal escapados
  // (Este caso es complejo, pero a veces el LLM pone ``` dentro del string sin escapar)
  
  // 2. Corregir saltos de línea literales dentro de comillas (muy común en 'html' o 'contenido')
  // Reemplazamos saltos de línea reales (\n) por la secuencia de escape (\n) 
  // SOLO si parecen estar dentro de un valor de string.
  // Un enfoque sencillo pero efectivo:
  cleaned = cleaned.replace(/":\s*"([\s\S]*?)"\s*[,}]/g, (match, content) => {
    const escapedContent = content.replace(/\n/g, '\\n').replace(/\r/g, '\\r')
    return match.replace(content, escapedContent)
  })

  return cleaned
}

/**
 * Intenta extraer campos específicos de un bloque de texto que se supone es JSON malformado.
 */
function recoverFromMalformedJSON(type: ArtifactType, text: string): ParsedArtifact | null {
  console.warn(`[parser] Attempting emergency recovery for ${type} from malformed JSON...`)
  
  // Extraer título - patrón común: "titulo": "..."
  const titleMatch = text.match(/"titulo":\s*"([^"]+)"/)
  const titulo = titleMatch ? titleMatch[1] : 'Fragmento recuperado'

  // Si es código, intentar extraer el campo "html" directamente
  if (type === 'codigo') {
    const htmlMatch = text.match(/"html":\s*"([\s\S]*?)"\s*[,}]?\s*$/)
    if (htmlMatch) {
       return {
         type,
         titulo,
         subtipo: 'componente',
         contenido: { html: htmlMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'), framework: 'react' },
         raw: text
       }
    }
  }

  // Si es documento, tratar todo como markdown
  if (type === 'documento') {
     return {
       type,
       titulo,
       subtipo: 'otro',
       contenido: { markdown: text.replace(/{[\s\S]*?"contenido":\s*"/, '').replace(/"\s*}$[ \t]*$/m, '') },
       raw: text
     }
  }

  return null
}

export function parseArtifactFromResponse(text: string): ParsedArtifact | null {
  console.log(`[parser] Parsing artifact from text length: ${text.length}`)
  if (text.includes('artifact:presentacion')) {
    console.log('[parser] Found presentation artifact marker in text')
  }

  // --- PASS 0: TAGS (Claude-style, most robust for code) ---
  // Formato: <artifact type="codigo" title="Login" framework="react">...code...</artifact>
  // Robustez: Maneja casos donde el LLM envuelve el tag en bloques de código markdown o olvida el tag de cierre.
  const tagStartRegex = /<artifact\s+([^>]+)>/i
  const tagStartMatch = text.match(tagStartRegex)
  
  if (tagStartMatch) {
    const attrStr = tagStartMatch[1]
    const tagFullStartMatch = tagStartMatch[0]
    const startIndex = tagStartMatch.index! + tagFullStartMatch.length
    
    // Intentar encontrar el cierre </artifact>
    const tagEndRegex = /<\/artifact>/i
    const tagEndMatch = text.match(tagEndRegex)
    
    let content = ''
    let raw = ''
    
    // Solo consideramos un cierre válido si está DESPUÉS del inicio
    if (tagEndMatch && tagEndMatch.index && tagEndMatch.index > startIndex) {
      content = text.substring(startIndex, tagEndMatch.index).trim()
      raw = text.substring(tagStartMatch.index!, tagEndMatch.index + tagEndMatch[0].length)
    } else {
      // Si no hay cierre (aún estamos en streaming o el LLM lo olvidó)
      // Tomamos todo el texto restante. NO cortamos en ``` porque el código React suele tenerlos.
      content = text.substring(startIndex).trim()
      raw = text.substring(tagStartMatch.index!)
    }

    // Limpieza de posibles backticks al principio (ej: el LLM hizo ```<artifact>)
    content = content.replace(/^```[a-z]*\n?/i, '')
    // Limpieza de posibles backticks al final si el stream cortó ahí
    content = content.replace(/\n?```$/i, '')
    
    // Extraer atributos
    // Soporta comillas simples o dobles, con o sin espacios.
    const typeMatch = attrStr.match(/type=["']?([^"'\s>]+)["']?/i)
    const titleMatch = attrStr.match(/title=["']?([^"'>]+)["']?/i)
    const frameworkMatch = attrStr.match(/framework=["']?([^"'\s>]+)["']?/i)

    const type = typeMatch ? (typeMatch[1] as ArtifactType) : null
    const titulo = titleMatch ? titleMatch[1] : 'Generando...'
    const framework = frameworkMatch ? frameworkMatch[1] : 'react'

    if (type) {
      return {
        type,
        titulo: titulo.trim(),
        subtipo: 'componente',
        contenido: buildContenido(type, { titulo, framework, html: content, contenido: content }),
        raw: raw
      }
    }
  }

  // --- PASS 0.5: SEPARATOR BLOCK (V0/Bolt-style) ---
  // Formato: ```artifact:codigo\ntitulo: Login\n---\ncode...```
  const sepRegex = /```artifact:(\w+)\s*\n([\s\S]*?)\n---\n([\s\S]*?)```/
  const sepMatch = text.match(sepRegex)
  if (sepMatch) {
    const type = sepMatch[1] as ArtifactType
    const metaStr = sepMatch[2]
    const content = sepMatch[3].trim()
    
    const titulo = (metaStr.match(/titulo:\s*(.*)/i) || [])[1]?.trim() || 'Sin título'
    const subtipo = (metaStr.match(/subtipo:\s*(.*)/i) || [])[1]?.trim() || 'otro'
    const framework = (metaStr.match(/framework:\s*(.*)/i) || [])[1]?.trim() || 'react'

    console.log(`[parser] Detected SEPARATOR artifact: ${type} - ${titulo}`)
    return {
      type,
      titulo,
      subtipo,
      contenido: buildContenido(type, { titulo, subtipo, framework, html: content, contenido: content }),
      raw: sepMatch[0]
    }
  }

  // --- PASS 1: Intento estándar JSON (no-greedy) ---
  const standardRegex = /```artifact:(documento|presentacion|codigo|imagen)\s*\n([\s\S]*?)```/
  const match = text.match(standardRegex)

  if (match) {
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
    } catch {
      console.warn(`[parser] Standard parse failed for ${type}, trying to clean JSON...`)
      
      try {
        const cleaned = cleanJSON(jsonStr)
        const parsed = JSON.parse(cleaned)
        return {
          type,
          titulo: parsed.titulo || 'Sin título',
          subtipo: parsed.subtipo || 'otro',
          contenido: buildContenido(type, parsed),
          raw: cleaned,
        }
      } catch {
        // Falló limpieza, intentar recuperación de campos vía regex
        const recovered = recoverFromMalformedJSON(type, jsonStr)
        if (recovered) return recovered
      }

      // Si es documento y todo falló, devolver el crudo filtrado
      if (type === 'documento') {
        return {
          type,
          titulo: 'Documento recuperado',
          subtipo: 'otro',
          contenido: { markdown: jsonStr },
          raw: jsonStr,
        }
      }
    }
  }

  // --- PASS 2: Fallback — detectar JSON en cualquier bloque de código (```json, ```, etc.) ---
  // Handles case where LLM forgets the artifact: wrapper
  const fallbackRegex = /```(?:json)?\s*\n(\{[\s\S]*?\})\s*```/g
  let fbMatch
  while ((fbMatch = fallbackRegex.exec(text)) !== null) {
    const jsonStr = fbMatch[1].trim()
    try {
      const parsed = JSON.parse(jsonStr)
      // Detect type from fields
      let type: ArtifactType | null = null
      if (parsed.html !== undefined && (parsed.framework || parsed.subtipo)) type = 'codigo'
      else if (parsed.slides !== undefined) type = 'presentacion'
      else if (parsed.contenido !== undefined && typeof parsed.contenido === 'string') type = 'documento'
      else if (parsed.prompt !== undefined && parsed.aspectRatio !== undefined) type = 'imagen'

      if (type && parsed.titulo) {
        console.warn(`[parser] Fallback: recovered ${type} artifact without wrapper`)
        return {
          type,
          titulo: parsed.titulo || 'Sin título',
          subtipo: parsed.subtipo || 'otro',
          contenido: buildContenido(type, parsed),
          raw: jsonStr,
        }
      }
    } catch {
      // Not valid JSON, continue
    }
  }

  return null
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
      console.log('[parser] Building presentation contenido:', JSON.stringify(parsed).substring(0, 150) + '...')
      if (!parsed.slides) {
        console.warn('[parser] Warning: No slides array found in presentation parsed JSON', Object.keys(parsed))
      } else if (!Array.isArray(parsed.slides)) {
        console.warn('[parser] Warning: slides is not an array, type is:', typeof parsed.slides)
      } else {
        console.log(`[parser] Found ${parsed.slides.length} slides`)
      }
      return {
        slides: parsed.slides || [],
        theme: parsed.theme || 'dark',
        total_slides: Array.isArray(parsed.slides) ? parsed.slides.length : 0,
        ...(parsed.color_scheme ? { color_scheme: parsed.color_scheme } : {}),
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
