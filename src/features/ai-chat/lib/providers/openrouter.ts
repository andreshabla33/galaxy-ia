import { SYSTEM_PROMPT } from '@/shared/config/providers'
import type { APIChatMessage } from '@/entities/message'

export async function streamOpenRouter(apiKey: string, messages: APIChatMessage[], systemPrompt?: string) {
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
      temperature: 0.7,
      messages: [{ role: 'system', content: systemPrompt || SYSTEM_PROMPT }, ...messages],
    }),
  });
}
