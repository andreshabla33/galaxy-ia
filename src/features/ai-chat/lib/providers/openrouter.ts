import { SYSTEM_PROMPT } from '@/shared/config/providers'
import type { APIChatMessage } from '@/entities/message'

const PRIMARY_MODEL = 'google/gemini-2.0-flash-001'
const FALLBACK_MODELS = [
  'google/gemini-2.0-flash-lite-001',
  'google/gemini-flash-1.5-8b',
  'meta-llama/llama-3.3-70b-instruct',
]

async function callOpenRouter(apiKey: string, model: string, body: Record<string, unknown>): Promise<Response> {
  return fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://galaxy-ai-canvas.app',
      'X-Title': 'Galaxy AI Canvas',
    },
    body: JSON.stringify({ ...body, model }),
  })
}

export async function streamOpenRouter(apiKey: string, messages: APIChatMessage[], systemPrompt?: string) {
  const prompt = systemPrompt || SYSTEM_PROMPT
  const isPresentation = /artifact:presentacion|presentaci[oó]n|pitch deck|slides/i.test(prompt)

  const body = {
    stream: true,
    max_tokens: 8192,
    temperature: isPresentation ? 1.0 : 0.7,
    top_p: isPresentation ? 0.95 : 0.9,
    messages: [{ role: 'system', content: prompt }, ...messages],
  }

  let response = await callOpenRouter(apiKey, PRIMARY_MODEL, body)

  // Auto-fallback on rate limit (429) or upstream provider errors (502/503)
  if (!response.ok && (response.status === 429 || response.status >= 502)) {
    for (const fallback of FALLBACK_MODELS) {
      console.warn(`[OpenRouter] ${PRIMARY_MODEL} unavailable (${response.status}), trying ${fallback}...`)
      response = await callOpenRouter(apiKey, fallback, body)
      if (response.ok || (response.status !== 429 && response.status < 502)) break
    }
  }

  return response
}
