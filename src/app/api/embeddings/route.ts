export const runtime = 'edge'

// Genera embeddings usando la API de Gemini (text-embedding-004)
export async function POST(req: Request) {
  try {
    const { text, apiKey, provider = 'gemini' } = await req.json()

    if (!apiKey || !text) {
      return Response.json({ error: 'apiKey y text requeridos' }, { status: 400 })
    }

    // 1. Caso Gemini
    if (provider === 'gemini') {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'models/text-embedding-004',
            content: { parts: [{ text }] },
            taskType: 'RETRIEVAL_DOCUMENT',
          }),
        }
      )

      if (!response.ok) {
        const err = await response.text()
        return Response.json({ error: `Gemini Embedding error: ${err}` }, { status: response.status })
      }

      const data = await response.json()
      const embedding = data.embedding?.values || []
      return Response.json({ embedding })
    }

    // 2. Caso OpenAI
    if (provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          input: text,
          model: 'text-embedding-3-small'
        })
      })

      if (!response.ok) {
        const err = await response.text()
        return Response.json({ error: `OpenAI Embedding error: ${err}` }, { status: response.status })
      }

      const data = await response.json()
      const embedding = data.data?.[0]?.embedding || []
      return Response.json({ embedding })
    }

    // 3. Fallback para otros proveedores (Anthropic/OpenRouter no suelen tener embeddings directos)
    return Response.json({ embedding: [] }, { status: 200 }) // Return empty instead of error to keep app running

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error interno'
    return Response.json({ error: msg }, { status: 500 })
  }
}
