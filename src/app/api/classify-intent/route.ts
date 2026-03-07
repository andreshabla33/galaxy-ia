import { NextResponse } from 'next/server'

const CLASSIFY_PROMPT = `Eres un clasificador de intents para una app de generación de contenido con IA.
Dado el mensaje del usuario, responde SOLO con UNA de estas palabras:
- presentacion (si pide slides, presentación, pitch deck, keynote, powerpoint)
- documento (si pide documento, reporte, guía, artículo, ensayo, análisis, tendencias, resumen, informe, investigación)
- codigo (si pide landing page, web app, componente, dashboard, formulario, interfaz, HTML)
- imagen (si pide imagen, foto, ilustración, logo, banner, poster, diseño visual)
- general (si es conversación general, pregunta, o no encaja en los anteriores)

REGLAS:
- Responde SOLO la palabra, sin explicación
- Si hay ambigüedad, prioriza el tipo de contenido más probable
- "crea un documento sobre X" → documento
- "haz una presentación de X" → presentacion
- "diseña una landing de X" → codigo
- "genera una imagen de X" → imagen`

export async function POST(req: Request) {
  try {
    const { message, apiKey, provider } = await req.json()

    if (!message || !apiKey) {
      return NextResponse.json({ intent: 'general' })
    }

    // Build provider-specific request
    const providerConfig = getProviderConfig(provider, apiKey)
    
    const response = await fetch(providerConfig.url, {
      method: 'POST',
      headers: providerConfig.headers as Record<string, string>,
      body: JSON.stringify(providerConfig.body(message)),
    })

    if (!response.ok) {
      console.warn('[classify-intent] LLM error:', response.status)
      return NextResponse.json({ intent: 'general' })
    }

    const data = await response.json()
    const rawIntent = extractContent(data, provider).trim().toLowerCase()
    
    // Validate intent is one of our known types
    const validIntents = ['presentacion', 'documento', 'codigo', 'imagen', 'general']
    const intent = validIntents.find(v => rawIntent.includes(v)) || 'general'
    
    console.log(`[classify-intent] Message: "${message.slice(0, 50)}..." → ${intent}`)
    return NextResponse.json({ intent })

  } catch (err) {
    console.error('[classify-intent] Error:', err)
    return NextResponse.json({ intent: 'general' })
  }
}

interface ProviderConfig {
  url: string
  headers: Record<string, string>
  body: (msg: string) => object
}

function getProviderConfig(provider: string, apiKey: string): ProviderConfig {
  switch (provider) {
    case 'openai':
      return {
        url: 'https://api.openai.com/v1/chat/completions',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: (msg: string) => ({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: CLASSIFY_PROMPT },
            { role: 'user', content: msg }
          ],
          max_tokens: 10,
          temperature: 0,
        }),
      }
    case 'anthropic':
      return {
        url: 'https://api.anthropic.com/v1/messages',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: (msg: string) => ({
          model: 'claude-3-haiku-20240307',
          system: CLASSIFY_PROMPT,
          messages: [{ role: 'user', content: msg }],
          max_tokens: 10,
          temperature: 0,
        }),
      }
    case 'gemini':
      return {
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        headers: { 'Content-Type': 'application/json' },
        body: (msg: string) => ({
          contents: [{ parts: [{ text: `${CLASSIFY_PROMPT}\n\nMensaje del usuario: ${msg}` }] }],
          generationConfig: { maxOutputTokens: 10, temperature: 0 },
        }),
      }
    default: // openrouter
      return {
        url: 'https://openrouter.ai/api/v1/chat/completions',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: (msg: string) => ({
          model: 'google/gemini-2.0-flash-001',
          messages: [
            { role: 'system', content: CLASSIFY_PROMPT },
            { role: 'user', content: msg }
          ],
          max_tokens: 10,
          temperature: 0,
        }),
      }
  }
}

function extractContent(data: Record<string, unknown>, provider: string): string {
  try {
    switch (provider) {
      case 'anthropic': {
        const content = data.content as Array<{ text: string }>
        return content?.[0]?.text || 'general'
      }
      case 'gemini': {
        const candidates = data.candidates as Array<{ content: { parts: Array<{ text: string }> } }>
        return candidates?.[0]?.content?.parts?.[0]?.text || 'general'
      }
      default: { // openai / openrouter
        const choices = data.choices as Array<{ message: { content: string } }>
        return choices?.[0]?.message?.content || 'general'
      }
    }
  } catch {
    return 'general'
  }
}
