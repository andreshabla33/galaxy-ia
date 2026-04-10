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

// Quality enhancers appended to every prompt for better image generation
const QUALITY_SUFFIX = ', high quality, professional, sharp focus, detailed, 8K UHD'
const NEGATIVE_PROMPT = 'text, watermark, logo, border, frame, signature, blurry, low quality, distorted, ugly, duplicate, morbid, mutilated'

export async function POST(req: Request) {
  try {
    const { prompt, aspectRatio = '16:9', quality = 'pro', falApiKey } = await req.json()

    const falKey = process.env.FAL_KEY || falApiKey
    if (!falKey) {
      return Response.json({ success: false, error: 'FAL API Key no configurada. Por favor, añádela en la configuración del Motor AI o en el servidor.' })
    }
    if (!prompt) {
      return Response.json({ success: false, error: 'Prompt requerido.' })
    }

    const falAspect = ASPECT_MAP[aspectRatio] || '16:9'

    // Route to Pro or Nano Banana 2 based on quality param
    // Pro: better composition/quality (10-20s). Fast: cheaper/faster (4-8s)
    const model = quality === 'fast' ? 'fal-ai/flux/schnell' : 'fal-ai/flux/dev'
    const num_inference_steps = quality === 'fast' ? 4 : 28

    // Enhance prompt with quality suffix (avoid duplicating if it already contains quality keywords)
    const hasQualityKeywords = /professional|sharp focus|8K|UHD|detailed/i.test(prompt)
    const enhancedPrompt = hasQualityKeywords ? prompt : `${prompt}${QUALITY_SUFFIX}`

    console.log(`[IMAGE] Model: ${model} | Aspect: ${falAspect}`)

    // Random seed for variety in batch image generation
    const seed = Math.floor(Math.random() * 2147483647)

    const image_size = falAspect === '16:9' ? 'landscape_16_9' : falAspect === '1:1' ? 'square_hd' : 'portrait_4_3'

    const response = await fetch(`https://fal.run/${model}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${falKey}`,
      },
      body: JSON.stringify({
        prompt: enhancedPrompt,
        image_size,
        num_inference_steps,
        seed,
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

