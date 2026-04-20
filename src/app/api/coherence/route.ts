import {
  streamGemini,
  streamOpenAI,
  streamAnthropic,
  streamOpenRouter,
} from '@/features/ai-chat'
import type { APIChatMessage } from '@/entities/message'

export const maxDuration = 120;

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

const COHERENCE_SYSTEM_PROMPT = `Eres un experto analista de documentos. Tu tarea es analizar la COHERENCIA y CONSISTENCIA entre dos documentos proporcionados por el usuario.

REGLAS DE ANÁLISIS:
1. Identifica contradicciones directas (ej: fechas diferentes para el mismo evento).
2. Encuentra omisiones críticas en un documento que el otro menciona como fundamentales.
3. Evalúa si el tono y los objetivos están alineados.
4. Responde con un formato Markdown estructurado y elegante.
5. Utiliza emojis para resaltar puntos clave (⚠️ Inconsistencia, ✅ Alineación, 🧠 Observación).
6. Sé específico, cita brevemente partes de los documentos si es necesario.

DOCUMENTO 1:
{doc1Name}
---
{doc1Text}

DOCUMENTO 2:
{doc2Name}
---
{doc2Text}

PETICIÓN ESPECÍFICA DEL USUARIO:
"{analysisRequest}"`;

export async function POST(req: Request) {
  try {
    const { doc1Text, doc2Text, doc1Name, doc2Name, analysisRequest, apiKey, provider } = await req.json();

    if (!apiKey) {
      return new Response('API Key requerida.', { status: 401 });
    }

    const systemPrompt = COHERENCE_SYSTEM_PROMPT
      .replace('{doc1Name}', doc1Name)
      .replace('{doc1Text}', doc1Text)
      .replace('{doc2Name}', doc2Name)
      .replace('{doc2Text}', doc2Text)
      .replace('{analysisRequest}', analysisRequest);

    // En el análisis de coherencia, usamos un mensaje de usuario simple para disparar la respuesta
    const messages: APIChatMessage[] = [{ role: 'user', content: 'Inicia el análisis detallado de coherencia entre estos dos documentos siguiendo mis instrucciones.' }];

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
    console.error('[COHERENCE ERROR]:', error);
    return new Response(error instanceof Error ? error.message : 'Error interno', { status: 500 });
  }
}
