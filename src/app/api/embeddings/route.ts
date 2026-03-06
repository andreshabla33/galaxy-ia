export const runtime = 'edge'

// Genera embeddings usando la API de Gemini (text-embedding-004)
export async function POST(req: Request) {
  try {
    const { text, apiKey } = await req.json()

    if (!apiKey || !text) {
      return Response.json({ error: 'apiKey y text requeridos' }, { status: 400 })
    }

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
      return Response.json({ error: `Embedding error: ${err}` }, { status: response.status })
    }

    const data = await response.json()
    const embedding = data.embedding?.values || []

    return Response.json({ embedding })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error interno'
    return Response.json({ error: msg }, { status: 500 })
  }
}
