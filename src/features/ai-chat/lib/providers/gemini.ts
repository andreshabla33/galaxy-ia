import { SYSTEM_PROMPT } from '@/shared/config/providers'
import type { APIChatMessage } from '@/entities/message'

export async function streamGemini(apiKey: string, messages: APIChatMessage[], systemPrompt?: string) {
  const geminiMessages = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt || SYSTEM_PROMPT }] },
        contents: geminiMessages,
        generationConfig: { temperature: 0.7 },
      }),
    }
  );
}
