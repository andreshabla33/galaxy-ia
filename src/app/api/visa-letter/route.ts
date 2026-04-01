export const maxDuration = 120;

import {
  streamGemini,
  streamOpenAI,
  streamAnthropic,
  streamOpenRouter,
} from '@/features/ai-chat'

type SSEParser = (line: string) => string | null;

const parseOpenAI: SSEParser = (line) => {
  if (!line.startsWith('data: ')) return null;
  const data = line.slice(6).trim();
  if (data === '[DONE]') return null;
  try {
    return JSON.parse(data)?.choices?.[0]?.delta?.content || null;
  } catch { return null; }
};

const parseGemini: SSEParser = (line) => {
  if (!line.startsWith('data: ')) return null;
  const data = line.slice(6).trim();
  if (data === '[DONE]') return null;
  try {
    return JSON.parse(data)?.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch { return null; }
};

const parseAnthropic: SSEParser = (line) => {
  if (!line.startsWith('data: ')) return null;
  try {
    const parsed = JSON.parse(line.slice(6).trim());
    if (parsed.type === 'content_block_delta') return parsed.delta?.text || null;
    return null;
  } catch { return null; }
};

async function* parseSSEStream(response: Response, parser: SSEParser): AsyncGenerator<string> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        buffer += decoder.decode();
        const finalLines = buffer.split('\n').map(l => l.trim()).filter(Boolean);
        for (const line of finalLines) {
          const text = parser(line);
          if (text) yield text;
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const text = parser(line);
        if (text) yield text;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function iteratorToStream(iterator: AsyncIterator<string>): ReadableStream {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async pull(controller) {
      const { value, done } = await iterator.next();
      if (done) {
        controller.close();
      } else {
        controller.enqueue(encoder.encode(value));
      }
    },
  });
}

export async function POST(req: Request) {
  try {
    const { messages, apiKey, provider, systemPrompt } = await req.json();
    console.log('[VISA-LETTER] Provider:', provider, '| Messages:', messages?.length);

    if (!apiKey) {
      return new Response('API Key requerida.', { status: 401 });
    }

    let providerResponse: Response;
    let parser: SSEParser;

    switch (provider) {
      case 'gemini':
        providerResponse = await streamGemini(apiKey, messages, systemPrompt);
        parser = parseGemini;
        break;
      case 'openai':
        providerResponse = await streamOpenAI(apiKey, messages, systemPrompt);
        parser = parseOpenAI;
        break;
      case 'anthropic':
        providerResponse = await streamAnthropic(apiKey, messages, systemPrompt);
        parser = parseAnthropic;
        break;
      case 'openrouter':
        providerResponse = await streamOpenRouter(apiKey, messages, systemPrompt);
        parser = parseOpenAI;
        break;
      default:
        return new Response('Proveedor no válido', { status: 400 });
    }

    if (!providerResponse.ok) {
      const err = await providerResponse.text();
      console.log(`[VISA-LETTER] ${provider} ERROR:`, err);
      return new Response(`Error de ${provider}: ${err}`, { status: providerResponse.status });
    }

    const stream = iteratorToStream(parseSSEStream(providerResponse, parser));

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      },
    });

  } catch (error: unknown) {
    console.error('[VISA-LETTER] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno';
    return new Response(errorMessage, { status: 500 });
  }
}
