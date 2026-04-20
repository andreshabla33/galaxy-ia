import { SYSTEM_PROMPT } from '@/shared/config/providers'
import type { APIChatMessage } from '@/entities/message'

export async function streamOpenRouter(apiKey: string, messages: APIChatMessage[], systemPrompt?: string) {
  const prompt = systemPrompt || SYSTEM_PROMPT
  const isPresentation = /artifact:presentacion|presentaci[oó]n|pitch deck|slides/i.test(prompt)

  return fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://galaxy-ai-canvas.app',
      'X-Title': 'Galaxy AI Canvas',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash-001',
      stream: true,
      max_tokens: 8192,
      temperature: isPresentation ? 1.0 : 0.7,
      top_p: isPresentation ? 0.95 : 0.9,
      messages: [{ role: 'system', content: prompt }, ...messages],
    }),
  });
}
