import { SYSTEM_PROMPT } from '@/shared/config/providers'
import type { APIChatMessage } from '@/entities/message'

export async function streamOpenAI(apiKey: string, messages: APIChatMessage[], systemPrompt?: string) {
  return fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      stream: true,
      messages: [{ role: 'system', content: systemPrompt || SYSTEM_PROMPT }, ...messages],
    }),
  });
}
