// Nano Banana Pro — studio-quality images (10-20s, $0.15/img)
// Nano Banana 2  — fast iteration (4-8s, $0.08/img)
// We use Pro for presentation slides (quality matters) and 2 for quick single images

const ASPECT_MAP: Record<string, string> = {
  '1:1': '1:1',
  '16:9': '16:9',
  '9:16': '9:16',
  '4:3': '4:3',
  '3:4': '3:4',
  '3:2': '3:2',
  '2:3': '2:3',
  '21:9': '21:9',
}

export async function POST(req: Request) {
  try {
    const { prompt, aspectRatio = '16:9', quality = 'pro' } = await req.json()

    const falKey = process.env.FAL_KEY
    if (!falKey) {
      return Response.json({ success: false, error: 'FAL_KEY no configurada en el servidor.' })
    }
    if (!prompt) {
      return Response.json({ success: false, error: 'Prompt requerido.' })
    }

    const falAspect = ASPECT_MAP[aspectRatio] || '16:9'

    // Route to Pro or Nano Banana 2 based on quality param
    // Pro: better composition/quality (10-20s). Fast: cheaper/faster (4-8s)
    const model = quality === 'fast' ? 'fal-ai/nano-banana-2' : 'fal-ai/nano-banana-pro'
    const resolution = '1K' // 1K is plenty for web display, 4K only when explicitly needed

    console.log(`[IMAGE] Model: ${model} | Aspect: ${falAspect} | Res: ${resolution}`)

    const response = await fetch(`https://fal.run/${model}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${falKey}`,
      },
      body: JSON.stringify({
        prompt,
        num_images: 1,
        aspect_ratio: falAspect,
        output_format: 'jpeg',
        resolution,
        safety_tolerance: '4',
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error(`[IMAGE] ${model} error:`, err)
      return Response.json({ success: false, error: `Image gen error (${response.status}): ${err}` })
    }

    const data = await response.json()
    const images = data.images || []
    if (images.length === 0) {
      return Response.json({
        success: false,
        error: 'No se generó imagen. ' + (data.description || 'Intenta con otro prompt.'),
      })
    }

    const img = images[0]
    console.log(`[IMAGE] Generated: ${img.width}x${img.height}`)

    return Response.json({
      success: true,
      image: img.url,
      width: img.width,
      height: img.height,
      text: data.description || '',
    })

  } catch (error: unknown) {
    console.error('[IMAGE] Error:', error)
    const msg = error instanceof Error ? error.message : 'Error interno'
    return Response.json({ success: false, error: msg })
  }
}
