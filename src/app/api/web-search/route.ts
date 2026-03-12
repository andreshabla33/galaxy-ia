export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { query, limit = 5 } = await req.json();

    if (!query) {
      return Response.json({ error: 'Query requerida' }, { status: 400 });
    }

    const FIRECRAWL_KEY = process.env.FIRECRAWL_KEY;
    console.log(`[WEB-SEARCH] Key present: ${!!FIRECRAWL_KEY} | Key prefix: ${FIRECRAWL_KEY?.slice(0, 5)}...`);
    if (!FIRECRAWL_KEY) {
      return Response.json({ error: 'FIRECRAWL_KEY no configurada' }, { status: 500 });
    }

    console.log(`[WEB-SEARCH] Query: "${query}" | Limit: ${limit}`);
    
    // Timeout de 10 segundos para no bloquear el chat si Firecrawl tarda demasiado
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FIRECRAWL_KEY}`,
      },
      body: JSON.stringify({
        query,
        limit,
        scrapeOptions: {
          formats: ['markdown'],
          onlyMainContent: true,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const err = await response.text();
      console.error(`[WEB-SEARCH] Firecrawl error:`, err);
      return Response.json({ error: `Firecrawl error: ${response.status}` }, { status: response.status });
    }

    const data = await response.json();
    console.log(`[WEB-SEARCH] Results: ${data.data?.length || 0}`);

    // Extract relevant info from results
    const results = (data.data || []).map((r: Record<string, string>) => ({
      title: r.title || '',
      url: r.url || '',
      content: r.markdown?.slice(0, 2000) || r.description || '',
    }));

    return Response.json({ success: true, results });

  } catch (error: unknown) {
    console.error('[WEB-SEARCH] Error:', error);
    const msg = error instanceof Error ? error.message : 'Error interno';
    return Response.json({ error: msg }, { status: 500 });
  }
}
