/**
 * Transformadores de Server-Sent Events (SSE) a texto plano.
 * Cada provider de IA envía streaming en formato SSE diferente.
 * Estos transformadores normalizan la salida a un ReadableStream de texto.
 */

export function transformGeminiStream(response: Response): ReadableStream {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  return new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) { controller.close(); return; }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') { controller.close(); return; }
          try {
            const parsed = JSON.parse(data);
            const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) controller.enqueue(new TextEncoder().encode(text));
          } catch { /* skip malformed JSON */ }
        }
      }
    },
  });
}

export function transformOpenAIStream(response: Response): ReadableStream {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  // Process OpenRouter SSE in background — writes to the transform stream
  (async () => {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let chunkNum = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('[StreamTransform] Done. Total chunks:', chunkNum);
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              console.log('[StreamTransform] [DONE] after', chunkNum, 'chunks');
              await writer.close();
              return;
            }
            try {
              const parsed = JSON.parse(data);
              const text = parsed?.choices?.[0]?.delta?.content;
              if (text) {
                chunkNum++;
                if (chunkNum <= 3) console.log(`[StreamTransform] Chunk #${chunkNum}: "${text.slice(0, 50)}"`);
                await writer.write(encoder.encode(text));
              }
            } catch {
              if (chunkNum === 0) console.log('[StreamTransform] Parse error, raw:', data.slice(0, 120));
            }
          }
        }
      }
    } catch (err) {
      console.error('[StreamTransform] Error:', err);
      await writer.abort(err instanceof Error ? err : new Error(String(err)));
      return;
    }

    await writer.close();
  })();

  return readable;
}

export function transformAnthropicStream(response: Response): ReadableStream {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  return new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) { controller.close(); return; }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'content_block_delta') {
              const text = parsed.delta?.text;
              if (text) controller.enqueue(new TextEncoder().encode(text));
            }
            if (parsed.type === 'message_stop') { controller.close(); return; }
          } catch { /* skip */ }
        }
      }
    },
  });
}
