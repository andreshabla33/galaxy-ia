import { SYSTEM_PROMPT } from '@/shared/config/providers'
import type { APIChatMessage } from '@/entities/message'

export async function streamAnthropic(apiKey: string, messages: APIChatMessage[], systemPrompt?: string) {
  const prompt = systemPrompt || SYSTEM_PROMPT
  const isPresentation = /artifact:presentacion|presentaci[oó]n|pitch deck|slides/i.test(prompt)

  return fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      temperature: isPresentation ? 1.0 : 0.7,
      stream: true,
      system: prompt,
      messages,
    }),
  });
}
