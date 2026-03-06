# CHANGELOG — Galaxy AI Canvas

## [2026-03-06] Fase 4: Personalización, Imágenes, Memoria, Versionado

### 4.1 Templates Predefinidos
- **13 plantillas** organizadas por tipo: 5 documentos (PRD, Propuesta, Reporte, Guía, Contrato), 4 presentaciones (Pitch Deck, Educativo, Reporte, Propuesta), 4 código (Landing, Dashboard, Formulario, Componente UI)
- **TemplateSelector modal** con tabs por tipo, selección visual con íconos, input de tema, y generación directa
- **Botón "Usar plantilla"** en la pantalla principal — elimina el síndrome del lienzo en blanco (patrón AIUX: Suggestions/Templates de ShapeOf.ai)
- Archivos: `src/shared/config/templates.ts`, `src/widgets/template-selector/`

### 4.2 Galaxy Colores Reactivos por Tipo
- **4 paletas de color** dinámicas según tipo de artefacto generado:
  - Documento → Blue (`#3b82f6` + `#60a5fa`)
  - Presentación → Purple (`#a855f7` + `#c084fc`)
  - Código → Green (`#22c55e` + `#4ade80`)
  - Imagen → Amber/Gold (`#f59e0b` + `#fbbf24`)
  - Default → Fuchsia + Cyan (original)
- **Transición suave** — colores se interpolan gradualmente al generar artefacto
- Prop `artifactType` conectado desde `page.tsx` → `GalaxyCanvas` → `CosmosParticles`

### 4.3 Generación de Imágenes — Nano Banana Pro
- **API route** `/api/generate-image` usando Gemini 2.0 Flash (`responseModalities: ['TEXT', 'IMAGE']`)
- **ImageViewer** con zoom in/out, descarga PNG, info de prompt
- **ImageArtifactWrapper** — genera imagen automáticamente al detectar artefacto tipo `imagen`
- **IMAGE_PROMPT** — director de arte que optimiza prompts del usuario (inglés, 4K, descriptores)
- **Intent detector** actualizado para reconocer: imagen, foto, ilustración, ícono, logo, arte, mockup
- **Parser** actualizado con `artifact:imagen` regex + `buildContenido` para tipo imagen
- **Edit prompts** para imágenes + 6 chips rápidos (Más detalle, Anime, Fotorrealista, Colores, Vertical, Minimalista)
- Archivos: `src/app/api/generate-image/route.ts`, `src/widgets/artifact-viewer/ui/ImageViewer.tsx`

### 4.4 Memoria de Contexto — pgvector
- **Extension `vector` (pgvector 0.8.0)** habilitada en Supabase
- **Tabla `artifact_embeddings`** con columna `embedding vector(768)` + índice HNSW (`vector_cosine_ops`)
- **Función `match_artifacts()`** — búsqueda semántica por similitud coseno con threshold configurable
- **API route** `/api/embeddings` usando Gemini `text-embedding-004` (768 dims, taskType: RETRIEVAL_DOCUMENT)
- **Lib `memory.ts`** — `saveArtifactMemory()`, `searchArtifactMemory()`, `buildArtifactSummary()`
- **Integrado en `handleArtifact`** — guarda embedding automáticamente al generar artefacto (async, no bloquea)
- **RLS policies** — usuarios solo ven/insertan sus propios embeddings

### 4.5 Versionado de Artefactos
- **Tabla `artifact_versions`** con FK a `artefactos`, unique constraint `(artefacto_id, version)`
- **Índice** por artefacto + versión descendente para consultas rápidas
- **Lib `versioning.ts`** — `saveArtifactVersion()`, `getArtifactVersions()`, `incrementArtifactVersion()`
- **RLS policies** — acceso basado en propiedad del artefacto padre
- La tabla `artefactos` ya tenía columna `version` (default 1) — ahora se usa activamente

### Archivos Creados/Modificados (Fase 4)
| Archivo | Descripción |
|---------|-------------|
| `src/shared/config/templates.ts` | 13 templates por tipo con prompts predefinidos |
| `src/widgets/template-selector/` | Modal selector con tabs, grid visual, input de tema |
| `src/shared/config/artifact-prompts.ts` | IMAGE_PROMPT + intent detector + tipo `imagen` |
| `src/shared/config/edit-prompts.ts` | EDIT_IMAGE_PROMPT + chips rápidos para imágenes |
| `src/app/api/generate-image/route.ts` | API Nano Banana Pro (Gemini 2.0 Flash) |
| `src/app/api/embeddings/route.ts` | API embeddings (text-embedding-004) |
| `src/widgets/artifact-viewer/ui/ImageViewer.tsx` | Viewer de imágenes con zoom + download |
| `src/widgets/artifact-viewer/ui/ArtifactViewer.tsx` | +ImageArtifactWrapper auto-genera imagen |
| `src/shared/lib/memory.ts` | Save/search embeddings para contexto |
| `src/shared/lib/versioning.ts` | CRUD de versiones de artefactos |
| `src/widgets/galaxy-canvas/ui/GalaxyCanvas.tsx` | Paletas reactivas por artifactType |
| `src/app/page.tsx` | +TemplateSelector, +memory save, +artifactType→Galaxy |

### Migraciones SQL Aplicadas
1. `enable_pgvector_and_create_embeddings` — extension vector + tabla + HNSW index + RLS + función match
2. `create_artifact_versions_table` — tabla versiones + índice + RLS policies

---

## [2026-03-06] Fase 3: Edición Iterativa, Export Real, UI 2026

### UI Dark Glassmorphism 2026 — LoginScreen
- **Aurora background** con 4 orbes de color (cyan, purple, blue, pink) animados con `blur-[120px]` y `animate-pulse` a diferentes velocidades
- **Glass card** con `bg-white/[0.03]`, `backdrop-blur-2xl`, borde `border-white/[0.08]`, sombra `inset`
- **Noise texture overlay** SVG fractal al 3% opacidad
- **Entrada animada** fade-in + slide-up de 1s al montar
- **Logo con glow** — blur pulsante, esquinas redondeadas, rotación 3°
- **Micro-interacciones** — hover gradient glow por botón, `active:scale-[0.98]`, spinners individuales

### Export Real de Archivos (PPTX/DOCX/HTML)
- **PptxGenJS** para PowerPoint real (.pptx) — 6 layouts (title, bullets, two-column, stats, quote, closing), dark theme, wide 16:9
- **docx** lib para Word real (.docx) — markdown parsing completo (H1-H3, bullets, code blocks, bold/italic), portada con título + fecha
- **Dynamic imports** en ambas librerías para evitar bundling en chunk principal (lazy load al hacer clic en "Descargar")
- **Webpack config** en `next.config.mjs` — plugin custom para ignorar `node:` scheme URIs
- **Puerto fijo** 3001 en `package.json` para compatibilidad con Google OAuth redirect URI

### Edición Iterativa Inline (Fase 3A)
- **`ArtifactEditChat`** — componente chat con input texto + micrófono + botón enviar
- **Edit prompts** especializados por tipo (`edit-prompts.ts`) — documento, presentación, código
- **`buildEditSystemPrompt()`** — inyecta artefacto actual como contexto al AI
- **Panel rediseñado** con modo edición/normal — botón "Editar" toggle en header
- **Historial de ediciones** visible arriba del input
- **Streaming response** — lectura completa de la respuesta del AI antes de parsear

### Chips de Acción Rápida (Fase 3B)
- **6 acciones por tipo** de artefacto, basadas en patrones AIUX de ShapeOf.ai:
  - Presentaciones: Más slides, Colores cálidos, Más visual, Más conciso, Stats, Tono formal
  - Documentos: Más corto, Más detallado, Tabla, Tono casual, Conclusión, Formato ejecutivo
  - Código: Modo oscuro, Más colorido, Responsive, Animaciones, Agregar sección, Minimalista
- **UI glassmorphism** con hover states y `active:scale-[0.97]`
- Se ocultan después de la primera edición (dan paso al historial)

### Optimización Voice Input
- **SpeechRecognition en paralelo** — se inicia ANTES de getUserMedia (reduce ~500ms de latencia)
- **`setIsRecording(true)` inmediato** — feedback visual instantáneo al presionar micrófono
- Silencio de errores `aborted` cuando el usuario cancela rápido

### Fix: Guardado de Artefactos en Supabase
- Supabase `from().insert()` retorna `{ error }` en vez de lanzar excepciones — corregido el handling
- Logging mejorado: `console.log('Artifact saved:')` o `console.error()` con detalles del error

### Archivos Creados/Modificados
| Archivo | Descripción |
|---------|-------------|
| `src/shared/lib/export-pptx.ts` | Generación PPTX real con PptxGenJS |
| `src/shared/lib/export-docx.ts` | Generación DOCX real con docx lib |
| `src/shared/config/edit-prompts.ts` | Prompts de edición por tipo + `buildEditSystemPrompt()` |
| `src/widgets/artifact-viewer/ui/ArtifactEditChat.tsx` | Chat inline con voz + texto + chips |
| `src/widgets/artifacts-panel/ui/ArtifactsPanel.tsx` | Panel con modo edición/normal |
| `src/features/auth/ui/LoginScreen.tsx` | UI Dark Glassmorphism 2026 |
| `next.config.mjs` | Webpack plugin para node: scheme |
| `package.json` | Puerto fijo 3001 + dependencias pptxgenjs, docx, file-saver |

---

## [2026-03-06] Galaxy Canvas Optimization & Voice UX

### Galaxy Visual Overhaul
- **ShaderMaterial custom** con per-particle sizes (`aSize` attribute) y soft glow fragment shader
- **Paleta vibrante**: Yellow core → Cyan → Blue → Purple → Pink → Deep Purple
- **Fragment shader glow**: `exp(-dist*5)` halo + `exp(-dist*12)` white core center
- **Additive blending** para efecto nebulosa (brillo acumulativo)
- **15,000 partículas** total (10K galaxy + 5K cosmic dust)
- **Scatter vertical** × 1.8 (galaxia gruesa, 3D visible)
- **Cámara** (0, 1.2, 4.5) FOV 60° — llena pantalla

### Audio Reactivity (Codrops Technique)
- **Power curves** (`valor²`) en vez de multiplicación directa — suaviza picos
- **Heartbeat sine** (`sin(time*2)`) modula el pulso bass — ritmo natural
- **Time lento** (`×1.5`) para ondas espiral y vertical — respiración orgánica
- **Clamp** en rotación y efectos — previene movimiento errático
- **Fórmula unificada** — sin salto condicional voz↔reposo, transición natural

### Voice Input & Mic
- **Browser audio processing**: `noiseSuppression`, `echoCancellation`, `autoGainControl`
- **Audio filter chain**: Highpass 85Hz → Lowpass 3kHz → Compressor noise gate (-35dB)
- **Speech-aware VAD**: solo auto-envía cuando SpeechRecognition detecta palabras reales
- **Silence threshold**: 0.1 (subido de 0.06), timeout 3s (subido de 2s)
- **Botón Send manual** mientras graba
- **Voice commands**: "enviar", "listo", "eso es todo", "send" → auto-envía y limpia trigger phrase

### Cursor Interaction
- **Mouse tracking via window event** (bypass overlay z-10)
- **Local space transform** via `matrixWorld.invert()` (funciona con rotación)
- **Repulsion**: radio 1.5, fuerza cuadrática `pow(1-d/r, 2) × 0.6`

### Performance
- `antialias: false`, `stencil: false`, `powerPreference: 'high-performance'`
- `dpr: [1, 1.5]` (limitado)
- `frameloop: 'never'` cuando tab no visible
- Frequency data via refs (sin re-renders React)

---

## [2026-03-06] Fase 0: Seguridad & Schema

### RLS Activado
- Row Level Security habilitado en 4 tablas: `usuarios`, `tareas_programadas`, `documentacion`, `artefactos`
- Políticas CRUD per-user: `auth.uid() = id` (usuarios) y `auth.uid() = creado_por` (resto)
- 0 security lints post-migración

### Schema Artefactos Evolucionado
- Nuevos campos: `titulo`, `subtipo`, `metadata` (JSONB), `version`, `updated_at`
- Check constraint: `tipo IN ('documento', 'presentacion', 'codigo')`
- Trigger `set_artefactos_updated_at` auto-actualiza `updated_at`
- Índices: `tipo`, `subtipo`, `creado_por`, `created_at DESC`

### Tareas Programadas
- 18 tareas insertadas cubriendo 4 fases del roadmap MVP
- Tareas de Fase 0 marcadas como completadas

---

## [2026-03-06] Fase 1: Core

### Auth (Supabase OAuth)
- **Providers**: Google + GitHub OAuth via `supabase.auth.signInWithOAuth`
- **AuthProvider**: `src/features/auth/ui/AuthProvider.tsx` — escucha `onAuthStateChange`
- **AuthWrapper**: `src/app/AuthWrapper.tsx` — gate que muestra LoginScreen si no hay sesión
- **LoginScreen**: UI con botones Google/GitHub, gradiente oscuro, spinner de carga
- **Auto-create profile**: Trigger `on_auth_user_created` en `auth.users` → inserta en `public.usuarios`
- **OAuth callback**: `src/app/auth/callback/route.ts` — intercambia code por sesión
- **User menu**: Nombre + botón "Salir" en top-right de la app

### Prompt Engine
- **3 prompts especializados**: `artifact-prompts.ts` con `DOCUMENT_PROMPT`, `PRESENTATION_PROMPT`, `CODE_PROMPT`
- **Intent detector prompt**: Clasifica input como documento/presentacion/codigo/general
- **SYSTEM_PROMPT actualizado**: Auto-detecta tipo de artefacto y genera formato correcto
- **Formato output**: ` ```artifact:tipo { JSON } ``` ` — parseble por regex

### Parser & Detection
- **`artifact-parser.ts`**: Extrae artefactos de respuesta LLM con regex `artifact:(tipo)`
- **`parseArtifactFromResponse()`**: Parsea JSON, extrae titulo/subtipo/contenido, fallback para errores
- **`buildContenido()`**: Estructura JSONB diferente por tipo (markdown/slides/html)
- **Helper functions**: `extractTOC()`, `countWords()`, `parseIntentResponse()`

### Providers Updated
- 4 providers (`gemini`, `openai`, `anthropic`, `openrouter`) aceptan `systemPrompt?` opcional
- API route `/api/chat` pasa `systemPrompt` a todos los providers

### useChat Enhanced
- `systemPrompt` param para override del prompt por defecto
- `onArtifact` callback disparado cuando se detecta artefacto en respuesta
- `lastArtifact` state expuesto
- `overrideSystemPrompt` param en `append()` para prompts por-mensaje

### page.tsx Integration
- `handleArtifact` callback guarda artefactos en Supabase con `creado_por: user.id`
- Metadata auto-calculada por tipo (word_count, total_slides, framework)
- User menu con sign out

---

## [2026-03-06] Fase 2: Render/Viewers

### DocumentViewer
- `react-markdown` + `remark-gfm` con prose styling completo
- Headers, tablas, código, blockquotes, listas — todo styled para dark theme
- Word count en header, badge "Documento"

### PresentationViewer
- 6 layouts: `title`, `bullets`, `two-column`, `stats`, `quote`, `closing`
- Navegación: prev/next buttons + dot indicators clickables
- Aspect ratio 16:9 por slide, gradiente dark background
- Stats con gradiente cyan-blue, quotes con comillas decorativas

### CodeViewer
- iframe sandbox (`allow-scripts allow-same-origin`) para preview en vivo
- Toggle código/preview
- Botón copiar al clipboard
- HTML renderizado directamente con Tailwind CDN

### ArtifactViewer Router
- `ArtifactViewer` component detecta tipo y renderiza viewer correcto
- `ArtifactsPanel` upgraded: auto-detect artifacts en mensajes del asistente
- Si el mensaje contiene `artifact:tipo`, renderiza viewer; si no, renderiza markdown normal
