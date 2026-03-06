# Galaxy AI Canvas — Documentación Técnica Completa

> **Versión estable:** v1.0-stable | **Branch actual:** v2-artifact-editor-responsive
> **Última actualización:** 2026-03-06

---

## 1. Visión General

Galaxy AI Canvas es una aplicación web AI-first que permite a los usuarios generar contenido profesional (documentos, presentaciones, código, imágenes) mediante chat de texto o voz. La interfaz presenta un canvas 3D (galaxia animada) como fondo interactivo y un panel lateral para visualizar los artefactos generados.

### Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 14.2.35 (App Router) |
| UI | React 18 + Tailwind CSS 3.4 + Framer Motion |
| 3D | Three.js + @react-three/fiber + @react-three/drei |
| State | Zustand 5 |
| Auth | Supabase Auth (Magic Link + OAuth) |
| DB | Supabase PostgreSQL |
| AI Chat | OpenRouter (Gemini 2.0 Flash) — streaming SSE |
| AI Images | fal.ai Nano Banana Pro (Gemini 3 Pro Image) |
| Export | docx (Word), pptxgenjs (PowerPoint) |
| Icons | Lucide React |
| Markdown | react-markdown + remark-gfm |
| Architecture | Feature-Sliced Design (FSD) |

---

## 2. Arquitectura (Feature-Sliced Design)

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx            # Página principal (orquestador)
│   ├── layout.tsx          # Layout con AuthWrapper
│   ├── AuthWrapper.tsx     # Wrapper de autenticación
│   ├── globals.css         # Estilos globales
│   └── api/
│       ├── chat/route.ts           # Streaming AI chat (Node.js runtime)
│       ├── generate-image/route.ts # Generación de imágenes (fal.ai)
│       ├── embeddings/route.ts     # Embeddings para memoria (Gemini)
│       └── auth/callback/route.ts  # OAuth callback
│
├── entities/               # Tipos de dominio
│   ├── artifact/model/types.ts
│   ├── message/model/types.ts
│   └── user/model/types.ts
│
├── features/               # Lógica de negocio
│   ├── ai-chat/
│   │   ├── hooks/useChat.ts              # Hook principal de chat
│   │   ├── lib/stream-transformers.ts    # Parsers SSE (legacy, ahora en route)
│   │   └── lib/providers/               # Funciones fetch por proveedor
│   │       ├── openrouter.ts
│   │       ├── openai.ts
│   │       ├── gemini.ts
│   │       └── anthropic.ts
│   │
│   ├── auth/
│   │   ├── model/authStore.ts    # Zustand store para user
│   │   └── ui/
│   │       ├── AuthProvider.tsx   # Provider que escucha sesión
│   │       └── LoginScreen.tsx    # Pantalla de login
│   │
│   ├── settings/
│   │   ├── model/appStore.ts     # Zustand: apiKey, provider, isListening
│   │   └── ui/SettingsModal.tsx   # Modal de configuración
│   │
│   └── voice-input/
│       ├── hooks/useAudioVisualizer.ts  # Web Audio API + speech recognition
│       └── lib/pitch-detector.ts        # Detección de pitch para visualización
│
├── shared/                 # Utilidades compartidas
│   ├── config/
│   │   ├── providers.ts          # SYSTEM_PROMPT fallback
│   │   ├── templates.ts          # Plantillas predefinidas
│   │   ├── artifact-prompts.ts   # Prompts por tipo de artefacto
│   │   └── edit-prompts.ts       # Prompts para edición de artefactos
│   │
│   └── lib/
│       ├── artifact-parser.ts    # Parsea ```artifact:tipo del response
│       ├── prompt-loader.ts      # Carga dinámica de prompts desde Supabase
│       ├── memory.ts             # Embeddings + búsqueda de artefactos
│       ├── supabase.ts           # Cliente Supabase
│       ├── export-docx.ts        # Exportar documento a .docx
│       ├── export-pptx.ts        # Exportar presentación a .pptx
│       ├── generate-id.ts        # Generador de IDs
│       └── versioning.ts         # Versionado de artefactos
│
└── widgets/                # Componentes de UI compuestos
    ├── artifact-viewer/
    │   ├── ui/ArtifactViewer.tsx      # Router de viewers por tipo
    │   ├── ui/ArtifactEditChat.tsx    # Chat de edición de artefactos
    │   ├── ui/DocumentViewer.tsx      # Viewer de documentos
    │   ├── ui/PresentationViewer.tsx  # Viewer de presentaciones (+ batch images)
    │   ├── ui/CodeViewer.tsx          # Viewer de código (iframe)
    │   └── ui/ImageViewer.tsx         # Viewer de imágenes
    │
    ├── artifacts-panel/
    │   └── ui/ArtifactsPanel.tsx      # Panel derecho con mensajes + viewers
    │
    ├── chat-input/
    │   └── ui/ChatInput.tsx           # Input de chat + botón mic + enviar
    │
    ├── galaxy-canvas/
    │   └── ui/GalaxyCanvas.tsx        # Canvas 3D Three.js (fondo animado)
    │
    ├── template-selector/
    │   └── ui/TemplateSelector.tsx    # Selector de plantillas predefinidas
    │
    ├── thinking-indicator/
    │   └── ui/ThinkingIndicator.tsx   # Indicador de "pensando" con pasos
    │
    └── user-menu/
        └── ui/UserMenu.tsx            # Menú de usuario (avatar + dropdown)
```

---

## 3. Flujo de Datos Principal

```
Usuario escribe/habla mensaje
        ↓
   page.tsx: onSubmit()
        ↓
   useChat.append({ role: 'user', content })
        ↓
   buildDynamicPrompt(userMessage)        ← prompt-loader.ts
   ├── detectIntent() → 'presentacion'    (regex client-side)
   ├── Cache hit? → return cached prompt
   └── Cache miss? → await loadPromptFromDB('base') + loadPromptFromDB(intent)
                     ├── Supabase query con timeout 3s
                     └── Fallback hardcoded si falla
        ↓
   fetch('/api/chat', { messages, systemPrompt, apiKey, provider })
        ↓
   route.ts: POST handler
   ├── streamOpenRouter(apiKey, messages, systemPrompt)
   │   → fetch('https://openrouter.ai/api/v1/chat/completions', { stream: true })
   ├── parseSSEStream(response, parseOpenAI)   ← async generator
   │   → yield text chunks from SSE data lines
   └── iteratorToStream(generator)             ← pull-based ReadableStream
        ↓
   return new Response(stream, { 'Content-Type': 'text/plain' })
        ↓
   useChat: reader.read() loop → setMessages(fullContent)
        ↓
   ArtifactsPanel renders messages
   ├── AssistantMessage checks for ```artifact: markers
   │   ├── Contains artifact marker (streaming)? → return null (hidden)
   │   ├── Complete artifact? → ArtifactViewer
   │   └── Plain markdown? → ReactMarkdown
   └── isLoading? → ThinkingIndicator
        ↓
   PresentationViewer (if artifact type = presentacion)
   ├── Phase 1: ImagePreloader
   │   ├── Extract all image_prompt from slides
   │   ├── Generate in parallel (3 workers) via /api/generate-image
   │   │   → fal.ai Nano Banana Pro (1K resolution)
   │   └── Show progress: "Imagen 3/5 — Nano Banana Pro"
   └── Phase 2: Show presentation (all images cached)
```

---

## 4. Base de Datos (Supabase)

### Tablas Principales

| Tabla | Descripción |
|-------|------------|
| `prompt_templates` | Prompts dinámicos por tipo (base, documento, presentacion, codigo, imagen) |
| `artefactos` | Artefactos generados por usuarios |
| `artifact_embeddings` | Embeddings para memoria de contexto |
| `profiles` | Perfiles de usuario |

### prompt_templates
```sql
tipo TEXT PRIMARY KEY,  -- 'base', 'documento', 'presentacion', 'codigo', 'imagen'
system_prompt TEXT,     -- El prompt completo
activo BOOLEAN,         -- Si está activo
```

### artefactos
```sql
id UUID DEFAULT gen_random_uuid(),
tipo TEXT,              -- 'documento', 'presentacion', 'codigo', 'imagen'
titulo TEXT,
subtipo TEXT,
contenido JSONB,        -- Contenido completo del artefacto
metadata JSONB,
creado_por UUID REFERENCES auth.users(id),
created_at TIMESTAMPTZ
```

---

## 5. API Routes

### POST /api/chat
- **Runtime:** Node.js (maxDuration: 120s)
- **Patrón:** Async generator + iteratorToStream (oficial Next.js)
- **Input:** `{ messages, apiKey, provider, systemPrompt }`
- **Output:** `ReadableStream` de texto plano
- **Providers soportados:** openrouter, openai, gemini, anthropic
- **Modelo default:** `google/gemini-2.0-flash-001` vía OpenRouter

### POST /api/generate-image
- **Modelo:** Nano Banana Pro (`fal-ai/nano-banana-pro`) — mejor calidad
- **Fallback rápido:** Nano Banana 2 (`fal-ai/nano-banana-2`) con `quality: 'fast'`
- **Input:** `{ prompt, aspectRatio, quality }`
- **Output:** `{ success, image (URL), width, height }`
- **Resolución:** 1K (optimizado para web)
- **Auth:** `FAL_KEY` en env

### POST /api/embeddings
- **Modelo:** Gemini text-embedding-004
- **Input:** `{ text, apiKey }`
- **Output:** `{ embedding: number[] }`

---

## 6. Sistema de Prompts Dinámicos

### Flujo
1. `detectIntent(userMessage)` — regex client-side que detecta: documento, presentacion, codigo, imagen
2. `buildDynamicPrompt()` — combina prompt base + prompt específico por tipo
3. Cache en memoria (Map) con TTL de 5 minutos
4. Fallback hardcoded si Supabase no responde en 3 segundos

### Prompts en Supabase (prompt_templates)
- **base:** Instrucciones generales de Galaxy AI Canvas
- **presentacion:** OBLIGATORIO incluir image_prompt en 5+ slides, layouts, JSON schema
- **documento:** Formato artifact:documento con JSON
- **codigo:** Formato artifact:codigo con HTML+Tailwind
- **imagen:** Formato artifact:imagen con prompt en inglés

---

## 7. Streaming Architecture

### Patrón: Async Generator + Pull-based ReadableStream
```typescript
// 1. Generator que parsea SSE
async function* parseSSEStream(response, parser) {
  // Lee chunks de la response, parsea líneas SSE, yield texto
}

// 2. Convierte generator → ReadableStream
function iteratorToStream(iterator) {
  return new ReadableStream({
    async pull(controller) {
      const { value, done } = await iterator.next()
      done ? controller.close() : controller.enqueue(encode(value))
    }
  })
}
```

Este es el patrón oficial de Next.js, usado por v0, Vercel AI SDK internamente.

---

## 8. Generación de Imágenes

### Flujo en Presentaciones (Batch Parallel)
1. PresentationViewer extrae todos los `image_prompt` de los slides
2. `ImagePreloader` genera en paralelo con **3 workers** concurrentes
3. Muestra progress bar: "Imagen 3/5 — Nano Banana Pro"
4. Solo cuando TODAS las imágenes están listas, muestra la presentación
5. Cache global (`imageCache` Map) evita re-generación al navegar slides

### Modelos
- **Nano Banana Pro** (`fal-ai/nano-banana-pro`): Calidad studio, mejor composición, ~15-20s
- **Nano Banana 2** (`fal-ai/nano-banana-2`): Rápido, barato, ~4-8s

---

## 9. UI/UX Features

### ThinkingIndicator
- Pasos animados según tipo de artefacto (presentación, documento, código, etc.)
- Shimmer animation + progress dots
- Context-aware: analiza el mensaje del usuario para mostrar pasos relevantes

### Frases Rotativas
- **Loading:** "Creando algo increíble...", "Conectando neuronas artificiales...", etc.
- **Idle:** "¿Qué creamos hoy?", "Tu próxima gran idea empieza aquí...", etc.
- Fade in/out animation con interval configurable

### Voice Input
- Web Speech API para reconocimiento de voz
- Detección de silencio (3s) para enviar automáticamente
- Trigger phrases: "enviar", "listo", "send it"
- Audio visualizer con Three.js (frecuencia + volumen → animación galaxia)

### Panel de Artefactos
- Messages list con AssistantMessage que detecta artifacts
- Raw artifact text OCULTO durante streaming (solo ThinkingIndicator)
- ArtifactViewer renderiza según tipo
- ArtifactEditChat para editar artefactos existentes

---

## 10. Variables de Entorno

```env
NEXT_PUBLIC_SUPABASE_URL=https://xgjlvwcvzdrmzmpaixqn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
FAL_KEY=<fal.ai_api_key>
```

La API key del proveedor de chat (OpenRouter, OpenAI, etc.) se configura en el frontend via Settings modal y se envía en cada request.

---

## 11. Branches

| Branch | Descripción | Estado |
|--------|------------|--------|
| `master` (tag: `v1.0-stable`) | Versión estable con streaming, prompts dinámicos, batch images | ✅ Estable |
| `v2-artifact-editor-responsive` | Nuevas features: chat en editor, canvas responsive | 🚧 En desarrollo |

---

## 12. Known Issues / Pendientes

- **Embedding API:** Requiere API key de Gemini válida (actualmente falla silenciosamente)
- **fal.ai balance:** Se agotó el saldo; necesita recarga en fal.ai/dashboard/billing
- **Canvas responsivo:** Galaxy canvas se corta a la mitad cuando el panel derecho está abierto
- **Editor de artefactos:** Falta opción de chat/micrófono para pedir cambios personalizados
