# Galaxy AI Canvas — Reporte QA Integral

**Fecha:** 1 de abril de 2026  
**Versión analizada:** v2.1 Galaxy IA  
**Analista:** QA Engineer Senior + Product Analyst  
**Alcance:** Flujo completo de creación de contenido (documentos, presentaciones, código, imágenes)

---

## 1. Resumen General

**Galaxy AI Canvas** es un workspace creativo basado en IA que permite generar 4 tipos de artefactos (documentos, presentaciones, código frontend e imágenes) a partir de instrucciones en lenguaje natural. Usa Next.js 14, Three.js para visualización 3D, streaming SSE con múltiples providers de IA (Gemini, OpenAI, Anthropic, OpenRouter), y Supabase como backend.

**Veredicto general:** La aplicación tiene una base arquitectónica sólida (Feature-Sliced Design), un flujo de generación funcional con buena cobertura de tipos de contenido, y features diferenciadores como voz, edición iterativa y exportación nativa. Sin embargo, presenta **gaps significativos en la recolección de requisitos del usuario**, **features placeholder sin implementar**, y **riesgos de estabilidad** en el parsing de artefactos.

---

## 2. Flujo Actual del Sistema

### 2.1 Flujo principal (Happy Path)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. ENTRADA: El usuario escribe/dicta una instrucción            │
│    ↓                                                             │
│ 2. INTENT DETECTION: Regex + LLM fallback (hybrid)              │
│    detectIntent() → 'documento' | 'presentacion' | 'codigo'     │
│    | 'imagen' | null (general)                                   │
│    ↓                                                             │
│ 3. PROMPT BUILDING: buildDynamicPrompt()                        │
│    - Carga prompt base desde Supabase (cache 5min)               │
│    - Carga prompt específico por tipo                            │
│    - Fallback a prompts hardcoded si Supabase falla             │
│    - Web search auto si se detectan patrones de investigación    │
│    ↓                                                             │
│ 4. GENERACIÓN: POST /api/chat                                   │
│    - BFF proxy → Provider seleccionado                           │
│    - Streaming SSE → texto plano → UI reactiva                   │
│    ↓                                                             │
│ 5. PARSING: parseArtifactFromResponse()                         │
│    - PASS 0: Tags XML (<artifact type="...">)                    │
│    - PASS 0.5: Separator blocks (```artifact:tipo\n---\n)        │
│    - PASS 1: Standard JSON (```artifact:tipo\n{json}```)         │
│    - PASS 2: Fallback (cualquier bloque JSON con campos clave)   │
│    ↓                                                             │
│ 6. VISUALIZACIÓN: ArtifactViewer → viewer específico            │
│    - DocumentViewer (Tiptap editable + DOCX export)              │
│    - PresentationViewer (slides + image preloader + PPTX export) │
│    - CodeViewer (Sandpack live preview + CodeSandbox deploy)     │
│    - ImageViewer (Nano Banana Pro generation)                    │
│    ↓                                                             │
│ 7. EDICIÓN ITERATIVA: ArtifactEditChat                          │
│    - Quick actions por tipo                                      │
│    - Chat de edición con voz                                     │
│    - Regeneración completa del artefacto                         │
│    ↓                                                             │
│ 8. PERSISTENCIA: Supabase                                       │
│    - chat_sessions, chat_messages, artefactos                    │
│    - artifact_embeddings (memoria semántica)                     │
│    - artifact_versions (versionado)                              │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Flujo alternativo: Plantillas

```
Usuario → "Usar plantilla" → TemplateSelector modal
  → Selecciona tipo (Documentos | Presentaciones | Código)
  → Selecciona subtipo (PRD, Pitch Deck, Landing, etc.)
  → Ingresa tema
  → Se construye prompt completo = template.prompt + topic
  → Entra al flujo principal desde paso 2
```

### 2.3 Información que el sistema solicita al usuario

| Dato | ¿Se solicita? | ¿Cómo? |
|---|---|---|
| Tipo de contenido | **Implícito** — Se detecta por regex/LLM | No se pregunta, se infiere |
| Tema / instrucción | **Sí** — Input principal | Text input o voz |
| Número de páginas/slides | **No** | Hardcoded en prompt: "mínimo 8 slides" |
| Tono | **No** | Solo via edición posterior |
| Colores/estilo visual | **No** | Solo via edición posterior |
| Público objetivo | **No** | No existe |
| Nivel de profundidad | **No** | No existe |
| Idioma del contenido | **No** | Implícitamente español |

**Evaluación:** La recolección de requisitos es **insuficiente**. El sistema genera directamente basándose en una sola instrucción sin confirmar parámetros críticos. Esto produce outputs genéricos que requieren múltiples iteraciones de edición.

---

## 3. Funcionalidades que Funcionan Bien

### ✅ Arquitectura y código
- **Feature-Sliced Design bien implementado** — Separación clara de capas (app → widgets → features → entities → shared). Dependencias unidireccionales respetadas.
- **Strategy Pattern para providers** — Agregar un nuevo provider de IA es trivial (1 archivo + 1 case en route.ts).
- **Streaming SSE robusto** — Implementación correcta con async generators, abort support, y manejo de errores.
- **BFF proxy pattern** — API keys nunca se exponen al cliente; el route.ts actúa como proxy.

### ✅ Generación de documentos
- **Detección de intent funcional** — Regex cubre los keywords principales en español e inglés.
- **Hybrid intent detection** — Fallback a LLM cuando regex no matchea (clasificación rápida con `max_tokens: 10`).
- **DocumentViewer con Tiptap** — Editor WYSIWYG completo con toolbar de formato, editable post-generación.
- **Exportación DOCX** — Parseo de Markdown a docx funcional con headings, listas, code blocks, inline formatting.
- **BubbleMenu contextual** — Menú flotante al seleccionar texto (aunque las acciones son placeholder).

### ✅ Generación de presentaciones
- **8 layouts de slides** — Cobertura completa: title, bullets, two-column, image-left/right, stats, quote, closing.
- **Normalización de layouts legacy** — `normalizeLayout()` corrige errores comunes del LLM (ej: "image-text" → "image-right").
- **Image preloader batch** — Patrón Gamma/Beautiful.ai: genera todas las imágenes en paralelo antes de mostrar la presentación. Con safety timeout de 30s y botón "Omitir".
- **Color scheme dinámico** — Soporte de paleta personalizada via `color_scheme` en el JSON.
- **Exportación PPTX** — Exportación completa con pptxgenjs, incluyendo imágenes y todos los layouts.
- **Navegación de slides** — Keyboard arrows + click en dots + botones anterior/siguiente.

### ✅ Generación de código
- **Sandpack integration** — Preview live, code editor, consola de debugging.
- **Detección React vs Vanilla** — Lógica inteligente que detecta patrones JSX vs HTML plano.
- **React HTML wrapper** — Para código React, genera un HTML autocontenido con CDN (Tailwind, React, Babel).
- **Deploy Mágico** — Botón para abrir en CodeSandbox directamente.
- **Descarga HTML** — Exporta como archivo HTML standalone.

### ✅ Experiencia general
- **Entrada de voz** — Web Speech API con visualización de audio, detección de silencio (3s), y trigger phrases para enviar.
- **Galaxy Canvas 3D** — Visualización Three.js que reacciona al volumen y estado de la app.
- **Responsive design** — Layouts diferenciados para desktop, tablet y mobile.
- **Historial de chats** — Sidebar con agrupación temporal (Hoy, Ayer, 7 días, Anteriores), búsqueda y eliminación.
- **Persistencia de sesiones** — Mensajes y artefactos se guardan en Supabase.
- **Thinking indicator contextual** — Steps animados diferentes según el tipo de contenido detectado.
- **Plantillas predefinidas** — 14 templates organizados por tipo con UX de selección clara.
- **Web search automático** — Detección de patrones de investigación que enriquecen el prompt con datos reales.
- **Cache de prompts** — TTL 5 min para evitar queries repetitivas a Supabase.

### ✅ Edición iterativa
- **ArtifactEditChat** — Chat dedicado para editar el artefacto generado, con quick actions específicas por tipo.
- **Quick actions inteligentes** — 6 acciones rápidas relevantes por cada tipo de artefacto.
- **Voz en edición** — El chat de edición también soporta voz con auto-send por silencio.
- **"Ver original"** — Botón para revertir a la versión original del artefacto.

---

## 4. Problemas Detectados

### 🔴 IMPACTO ALTO

#### P1. No se recolectan requisitos del usuario antes de generar
- **Ubicación:** `@page.tsx` → `onSubmit()` / `handleTemplateSelect()`
- **Problema:** El usuario escribe una instrucción y el sistema genera inmediatamente sin confirmar tipo, tono, extensión, público, idioma, estilo visual, etc. Esto produce outputs genéricos que requieren múltiples rondas de edición.
- **Impacto:** Experiencia de usuario pobre; desperdicio de tokens de IA; resultados insatisfactorios en la primera iteración.

#### P2. Features placeholder en DocumentViewer (BubbleMenu)
- **Ubicación:** `@DocumentViewer.tsx:199-228`
- **Problema:** Las 4 acciones del BubbleMenu ("Resumir", "Expandir", "Simplificar", "Traducir") y el botón "AI Mágica" de la toolbar usan `alert('Próximamente...')`. Son botones visibles y clickeables que no hacen nada.
- **Impacto:** Expectativa rota; el usuario cree que la funcionalidad existe. Esto es un **bug de producto** — funcionalidad anunciada que no está implementada.

#### P3. Feature placeholder en CodeViewer ("Reparar con IA")
- **Ubicación:** `@CodeViewer.tsx:271`
- **Problema:** El botón "Reparar con IA" en la consola usa `alert('Próximamente...')`.
- **Impacto:** Mismo problema que P2.

#### P4. Inconsistencia de tipos ArtifactType entre entities y config
- **Ubicación:** `@entities/artifact/model/types.ts` define `'document' | 'image' | 'code' | 'presentation'` (inglés), pero `@shared/config/artifact-prompts.ts` define `'documento' | 'presentacion' | 'codigo' | 'imagen'` (español).
- **Problema:** Hay dos definiciones incompatibles del mismo tipo. El sistema completo usa la versión en español, haciendo que la definición en entities sea **muerta/inútil**.
- **Impacto:** Confusión para desarrolladores; potencial de bugs si alguien importa del lugar equivocado.

#### P5. Parsing de JSON fragile durante streaming
- **Ubicación:** `@artifact-parser.ts` → `tryParseJSON()` y `cleanJSON()`
- **Problema:** El parser intenta reparar JSON malformado con estrategias heurísticas (cerrar brackets, limpiar trailing commas). Aunque funcional, es inherentemente frágil. El regex de `cleanJSON()` (línea 29) puede romper JSON válido que contenga `": "` dentro de valores string.
- **Impacto:** Artefactos corruptos o no parseados en edge cases. El `recoverFromMalformedJSON()` solo cubre código y documentos, no presentaciones.

#### P6. API Key almacenada en localStorage sin cifrado
- **Ubicación:** `@appStore.ts:30-33` — `persist` middleware con `name: 'galaxy-ai-storage'`
- **Problema:** La API key del provider se guarda en texto plano en localStorage. Cualquier script XSS podría leerla.
- **Impacto:** Riesgo de seguridad. Si bien es un dato del usuario (BYOK), es una credencial sensible.

### 🟡 IMPACTO MEDIO

#### P7. Versioning existe pero no está conectado al flujo de edición
- **Ubicación:** `@versioning.ts` — `saveArtifactVersion()`, `incrementArtifactVersion()` existen pero nunca se llaman.
- **Problema:** El sistema de versionado está implementado pero **no conectado**. Las ediciones incrementan un counter local en `ArtifactsPanel` pero no persisten las versiones en Supabase.
- **Impacto:** Feature incompleta; el usuario no puede ver/restaurar versiones anteriores.

#### P8. Memoria semántica (embeddings) usa hardcoded UUID
- **Ubicación:** `@page.tsx:118` — `saveArtifactMemory('00000000-0000-0000-0000-000000000000', user.id, ...)`
- **Problema:** Se pasa un UUID de ceros como `artefacto_id` porque el ID real del artefacto guardado no se devuelve/espera del insert.
- **Impacto:** Los embeddings no están ligados al artefacto real en DB, inutilizando la búsqueda semántica por artefacto.

#### P9. Tiptap no sincroniza ediciones manuales de vuelta al Markdown
- **Ubicación:** `@DocumentViewer.tsx:154-165` — `handleDownload()` exporta desde `contenido.markdown`
- **Problema:** Si el usuario edita el documento manualmente en el editor Tiptap, esos cambios viven solo en el estado del editor. La exportación DOCX usa el `contenido.markdown` original, no el contenido editado en Tiptap.
- **Impacto:** El usuario edita el documento, descarga el DOCX, y **sus cambios no están incluidos**.

#### P10. Export PPTX no usa color_scheme personalizado
- **Ubicación:** `@export-pptx.ts:22-29` — `COLORS` es hardcoded
- **Problema:** El viewer de presentaciones respeta `color_scheme` del JSON, pero la exportación PPTX usa colores hardcoded (`COLORS` constante). Los colores personalizados no se exportan.
- **Impacto:** Discrepancia visual entre preview y archivo exportado.

#### P11. ImagePreloader marca API como "down" al primer fallo
- **Ubicación:** `@PresentationViewer.tsx:154-158`
- **Problema:** Si la primera imagen falla (por cualquier razón), `apiDown = true` y **todas las demás se saltan**. Pero la falla podría ser temporal o de un prompt específico.
- **Impacto:** Una falla aislada cancela todas las imágenes restantes. Debería haber al menos 2-3 intentos fallidos consecutivos antes de declarar API down.

#### P12. TemplateSelector: clases dinámicas de Tailwind no funcionan
- **Ubicación:** `@TemplateSelector.tsx:61-63`
- **Problema:** Usa clases dinámicas como `` `bg-${tab.color}-500/15` `` que Tailwind CSS **no puede purgar** en build. Estas clases nunca se generan y los tabs no muestran los colores correctos.
- **Impacto:** Bug visual — los tabs activos no se estilizan correctamente en producción.

#### P13. `append` en useChat tiene closure stale de `messages`
- **Ubicación:** `@useChat.ts:98-284`
- **Problema:** `append` es un `useCallback` con `messages` como dependencia. Pero dentro, `messages` puede estar stale si se llaman dos `append` rápidamente (ej: double-click en enviar). `const updatedMessages = [...messages, userMessage]` usaría mensajes desactualizados.
- **Impacto:** Race condition potencial en envíos rápidos; mensajes perdidos.

### 🟢 IMPACTO BAJO

#### P14. ThinkingIndicator duplica lógica de detección de tipo
- **Ubicación:** `@ThinkingIndicator.tsx:45-51` — `detectType()` vs `@prompt-loader.ts:11-47` — `INTENT_PATTERNS`
- **Problema:** La misma lógica de detección de tipo está duplicada con patrones ligeramente diferentes. No se reutiliza `detectIntent()` de prompt-loader.

#### P15. Exceso de eslint-disable
- **Ubicación:** Múltiples archivos (useChat.ts, page.tsx, memory.ts, versioning.ts)
- **Problema:** Uso extensivo de `// eslint-disable-next-line @typescript-eslint/no-explicit-any` para castear queries de Supabase. Indica que los tipos de la DB no están generados/configurados.

#### P16. `_withTimeout` y `_preWarmCache` son funciones muertas
- **Ubicación:** `@prompt-loader.ts:101-110, 211-222`
- **Problema:** Estas funciones están prefijadas con `_` y tienen `eslint-disable unused`. Son código muerto que añade confusión.

#### P17. Speech Recognition hardcodeado a `es-ES`
- **Ubicación:** `@ArtifactEditChat.tsx:101` — `recognition.lang = 'es-ES'`
- **Problema:** El idioma de reconocimiento de voz está hardcodeado. Usuarios no hispanohablantes no pueden usar la edición por voz.

#### P18. No hay validación de input del usuario
- **Ubicación:** `@page.tsx:234-241` — `onSubmit()`
- **Problema:** Solo se valida que haya API key y que el input no esté vacío. No hay límite de longitud, no se sanitiza, no se valida contenido malicioso.

---

## 5. Funcionalidades Faltantes

| Feature | Estado | Prioridad |
|---|---|---|
| **Wizard/formulario de requisitos** pre-generación (tono, extensión, público, idioma) | No existe | 🔴 Alta |
| **Resumir / Expandir / Simplificar / Traducir** inline en documentos | Placeholder (alert) | 🔴 Alta |
| **Reparar con IA** en CodeViewer | Placeholder (alert) | 🟡 Media |
| **Historial de versiones** visual (timeline, diff, restore) | Backend existe, UI no | 🟡 Media |
| **Regeneración parcial** (solo un slide, solo una sección) | No existe | 🟡 Media |
| **Templates de estilo visual** para presentaciones | No existe (solo color_scheme manual) | 🟡 Media |
| **Colaboración en tiempo real** | No existe | 🟢 Baja |
| **Exportación PDF** para documentos | No existe | 🟡 Media |
| **Preview de impresión** para documentos | No existe | 🟢 Baja |
| **Undo/Redo** en edición de artefactos | No existe (solo "Ver original") | 🟡 Media |
| **Feedback del usuario** sobre calidad del output | No existe | 🟢 Baja |
| **Rate limiting** en uso de API | No existe | 🟡 Media |
| **Indicador de costo/tokens** consumidos | No existe | 🟢 Baja |
| **Modo offline** / cache de artefactos locales | No existe | 🟢 Baja |
| **Templates de imagen** (estilos predefinidos) | No existe en TemplateSelector | 🟡 Media |

---

## 6. Priorización de Issues

### Tier 1 — Resolver antes de release / demo
| # | Issue | Tipo | Esfuerzo |
|---|---|---|---|
| P1 | No se recolectan requisitos del usuario | UX/Producto | Alto |
| P2 | BubbleMenu placeholder en DocumentViewer | Bug de producto | Medio |
| P3 | "Reparar con IA" placeholder en CodeViewer | Bug de producto | Medio |
| P4 | Inconsistencia ArtifactType (inglés vs español) | Bug técnico | Bajo |
| P9 | Tiptap no exporta ediciones al DOCX | Bug funcional | Medio |
| P12 | Tailwind clases dinámicas rotas en TemplateSelector | Bug visual | Bajo |

### Tier 2 — Resolver en sprint siguiente
| # | Issue | Tipo | Esfuerzo |
|---|---|---|---|
| P5 | Parser JSON frágil | Riesgo técnico | Medio |
| P7 | Versioning no conectado | Feature incompleta | Medio |
| P8 | UUID hardcoded en embeddings | Bug lógico | Bajo |
| P10 | PPTX no exporta color_scheme | Bug funcional | Bajo |
| P11 | ImagePreloader demasiado agresivo al fallar | Bug lógico | Bajo |
| P13 | Stale closure en useChat.append | Bug de race condition | Medio |

### Tier 3 — Mejora continua
| # | Issue | Tipo | Esfuerzo |
|---|---|---|---|
| P6 | API Key sin cifrar en localStorage | Seguridad | Medio |
| P14 | Lógica detectType duplicada | Deuda técnica | Bajo |
| P15 | Exceso de eslint-disable (tipos Supabase) | Deuda técnica | Medio |
| P16 | Funciones muertas en prompt-loader | Deuda técnica | Bajo |
| P17 | Speech Recognition hardcoded es-ES | Internacionalización | Bajo |
| P18 | Sin validación de longitud/contenido de input | Seguridad | Bajo |

---

## 7. Recomendaciones Finales

### 7.1 Mejorar recolección de requisitos (P1 — Mayor impacto)

**Propuesta:** Implementar un **"Smart Pre-flight"** — un step intermedio inteligente entre el input del usuario y la generación.

```
Flujo propuesto:
1. Usuario escribe: "Crea una presentación sobre blockchain"
2. Sistema detecta intent: presentacion
3. [NUEVO] Se muestra un mini-formulario contextual:
   ┌──────────────────────────────────────────┐
   │ 📊 Presentación sobre blockchain          │
   │                                           │
   │ Slides: [8] [12] [16]  ← chip select     │
   │ Tono:   [Formal] [Técnico] [Casual]       │
   │ Público: [Inversionistas] [Equipo] [...]  │
   │ Idioma:  [Español] [Inglés]               │
   │ Estilo:  [Oscuro] [Claro] [Corporativo]   │
   │                                           │
   │          [Generar →]  [Saltar]             │
   └──────────────────────────────────────────┘
4. Los parámetros se inyectan al prompt
5. Se genera con contexto completo
```

**Implementación:** Nuevo widget `@widgets/preflight-form/` que se muestra condicionalmente tras detectar el intent. El botón "Saltar" mantiene el flujo directo actual para usuarios avanzados.

### 7.2 Implementar acciones inline de IA en DocumentViewer (P2)

**Propuesta:** Conectar las acciones del BubbleMenu al endpoint `/api/chat` con prompts especializados para cada acción:
- **Resumir:** `"Resume el siguiente texto a 1/3 de su longitud: {selected_text}"`
- **Expandir:** `"Expande el siguiente texto con más detalle y ejemplos: {selected_text}"`
- **Simplificar:** `"Simplifica este texto para que sea conciso y claro: {selected_text}"`
- **Traducir:** Detectar idioma actual y ofrecer opciones.

Cada acción reemplaza `editor.commands.insertContent()` con el resultado.

### 7.3 Corregir exportación DOCX (P9)

**Propuesta:** En `handleDownload()`, obtener el contenido actual del editor Tiptap via `editor.getHTML()`, convertirlo de vuelta a Markdown (con una lib como `turndown`), y usarlo como fuente para la exportación DOCX en lugar del `contenido.markdown` original.

### 7.4 Unificar ArtifactType (P4)

**Propuesta:** Eliminar la definición en `@entities/artifact/model/types.ts` (que nadie usa) y consolidar en `@shared/config/artifact-prompts.ts` como la fuente de verdad. O bien, actualizar entities para usar los mismos valores en español.

### 7.5 Corregir clases dinámicas en TemplateSelector (P12)

**Propuesta:** Reemplazar clases dinámicas por un mapa estático que Tailwind pueda purgar:

```ts
const TAB_STYLES: Record<string, string> = {
  blue: 'bg-blue-500/15 text-blue-300 border-blue-500/25',
  purple: 'bg-purple-500/15 text-purple-300 border-purple-500/25',
  green: 'bg-green-500/15 text-green-300 border-green-500/25',
}
```

### 7.6 Conectar versioning al flujo de edición (P7)

**Propuesta:** En `ArtifactsPanel.handleSendEdit()`, tras parsear exitosamente el artefacto editado, llamar a `incrementArtifactVersion()` con el artefacto ID. Agregar un componente `VersionTimeline` que muestre las versiones y permita restaurar.

### 7.7 Hacer useChat.append resiliente a stale closures (P13)

**Propuesta:** Usar un `useRef` para mantener la referencia actual de messages, similar al patrón ya usado con `onArtifactRef`:

```ts
const messagesRef = useRef(messages)
messagesRef.current = messages
// En append:
const updatedMessages = [...messagesRef.current, userMessage]
```

### 7.8 Mejorar robustez del ImagePreloader (P11)

**Propuesta:** Cambiar la lógica de `apiDown` para requerir 2+ fallos consecutivos antes de declarar la API como no disponible. Agregar retry con backoff exponencial por imagen.

---

## 8. Métricas de Cobertura

| Dimensión | Score | Nota |
|---|---|---|
| **Cobertura de tipos de contenido** | 9/10 | 4 tipos bien cubiertos, solo falta PDF export |
| **Detección de intent** | 8/10 | Hybrid regex+LLM funciona bien; edge cases posibles |
| **Calidad de generación** | 7/10 | Prompts bien diseñados pero sin personalización del usuario |
| **Edición post-generación** | 6/10 | Quick actions funcionales, pero inline editing es placeholder |
| **Exportación** | 7/10 | DOCX y PPTX funcionan; bug en DOCX con ediciones Tiptap |
| **Persistencia** | 7/10 | Sesiones y artefactos se guardan; versioning desconectado |
| **Experiencia de usuario** | 7/10 | UI pulida; falta pre-flight y personalización |
| **Estabilidad técnica** | 7/10 | Streaming robusto; parser JSON frágil en edge cases |
| **Seguridad** | 6/10 | API key en plaintext localStorage; sin rate limiting |
| **Responsive / Mobile** | 8/10 | 3 layouts diferenciados; buena adaptación |

**Score general: 7.2 / 10**

---

*Reporte generado tras análisis estático completo del codebase. Se recomienda complementar con testing end-to-end ejecutando la aplicación en los diferentes providers de IA.*
