# INFORME COMPLETO: Galaxy AI Canvas — MVP Content Creator

**Fecha**: 6 de marzo de 2026  
**Proyecto**: Galaxy AI Canvas  
**Supabase Project**: `mvp galaxy agent` (ID: `xgjlvwcvzdrmzmpaixqn`)

---

## PARTE 1: DOCUMENTACIÓN DE CAMBIOS REALIZADOS

### 1.1 Galaxy Canvas — Visual & Performance

| Cambio | Antes | Después |
|--------|-------|---------|
| **Partículas galaxy** | 6,000 | 10,000 |
| **Polvo cósmico** | 3,000 | 5,000 |
| **Total partículas** | 9,000 | 15,000 |
| **Material** | `PointsMaterial` (tamaño fijo) | `ShaderMaterial` custom (per-particle size + glow) |
| **Colores** | Indigo/violeta/rosa | Yellow core → Cyan → Blue → Purple → Pink (vibrante) |
| **Glow** | Ninguno | Fragment shader: `exp(-dist*5) + exp(-dist*12)` white core |
| **Scatter vertical** | `× 0.6` (plana) | `× 1.8` (gruesa, 3D) |
| **Cámara** | `(0, 4, 9)` → `(0, 2, 6.5)` | `(0, 1.2, 4.5)` FOV 60° |
| **Renderer** | Default | `antialias: false, stencil: false, powerPreference: 'high-performance'` |
| **DPR** | Default | `[1, 1.5]` (limitado) |

### 1.2 Audio Reactivity

| Cambio | Antes | Después |
|--------|-------|---------|
| **Técnica** | Multiplicación directa (`sb * 0.8`) | Power curves (`sb²`) + `clamp` + heartbeat sine (Codrops technique) |
| **Pulso bass** | Directo | `sin(time*2) × bassEffect` — heartbeat natural |
| **Ondas espiral** | `time × 4` (rápido, errático) | `time × 1.5` (lento, orgánico) |
| **Elevación vertical** | `time × 6` | `time × 1.5` — respiración suave |
| **Transición voz→reposo** | Salto condicional (`if sv > 0.01`) | Fórmula unificada — audio decay natural a 0 |
| **Rotación** | `0.002 + sb*0.008` (sin límite) | `0.0015 + min(sb*0.003, 0.005)` (clamped) |

### 1.3 Cursor Interaction

| Cambio | Detalle |
|--------|---------|
| **Problema** | UI overlay `z-10` bloqueaba eventos del Canvas |
| **Solución** | `window.addEventListener('mousemove')` + NDC manual |
| **Espacio** | Mouse transformado a local space del Points (que rota) via `matrixWorld.invert()` |
| **Repulsión** | Radio: 1.5, Fuerza: `pow(1-dist/radius, 2) × 0.6` |

### 1.4 Micrófono & Detección de Voz

| Cambio | Antes | Después |
|--------|-------|---------|
| **getUserMedia** | `{ audio: true }` | `{ noiseSuppression, echoCancellation, autoGainControl }` |
| **Filtro audio** | Ninguno | Highpass 85Hz → Lowpass 3kHz → Compressor (noise gate -35dB) |
| **Silencio threshold** | `0.06` | `0.1` |
| **Silencio timeout** | `2s` | `3s` |
| **Detección** | Solo volumen | Speech-aware: requiere `SpeechRecognition` transcript real |
| **Envío manual** | No existía | Botón Send visible mientras graba |
| **Comandos de voz** | No existía | "enviar", "listo", "eso es todo", "send" → auto-envía |

### 1.5 Archivos Modificados

- `src/widgets/galaxy-canvas/ui/GalaxyCanvas.tsx` — Visual completo, ShaderMaterial, audio orgánico
- `src/features/voice-input/hooks/useAudioVisualizer.ts` — Audio filtering, speech-aware VAD
- `src/widgets/chat-input/ui/ChatInput.tsx` — Botón Send + voice commands hint
- `src/app/page.tsx` — Voice command detection, manual send, increased timeout

---

## PARTE 2: ESTADO ACTUAL DE LA BASE DE DATOS

**Proyecto Supabase**: `mvp galaxy agent` — `xgjlvwcvzdrmzmpaixqn` (us-east-1, ACTIVE)

### Tablas existentes:

| Tabla | Filas | Columnas clave | RLS |
|-------|-------|----------------|-----|
| `usuarios` | 0 | `id` (FK → auth.users), `nombre`, `created_at` | ❌ |
| `tareas_programadas` | 9 | `id`, `titulo`, `descripcion`, `estatus`, `creado_por` | ❌ |
| `documentacion` | 4 | `id`, `titulo`, `contenido`, `estado`, `creado_por` | ❌ |
| **`artefactos`** | **0** | `id`, `tipo` (text), `contenido` (**JSONB**), `creado_por` | ❌ |

> ✅ **Sí, la tabla `artefactos` ya existe** con formato JSONB para flexibilidad.  
> ⚠️ **RLS está deshabilitado** en todas las tablas — hay que activarlo antes de producción.  
> ⚠️ La tabla `artefactos` necesita más campos para el MVP (ver Parte 5).

---

## PARTE 3: ANÁLISIS DE COMPETIDORES

### 3.1 Generadores de Presentaciones AI

| Herramienta | Precio | Fortaleza | Debilidad |
|-------------|--------|-----------|-----------|
| **Gamma AI** | Freemium | Rápido, web-first, layouts inteligentes | Limitado en personalización |
| **Beautiful.ai** | Free + Pro/Team | Diseño automático profesional, animaciones | Costoso para equipos |
| **Canva Magic Design** | $12.99/mes Pro | Biblioteca masiva de assets, fácil de usar | AI básica vs competidores |
| **Microsoft Copilot (PPT)** | $20/mes | Integración Office, branding corporativo | Solo PowerPoint |
| **Tome** | $16/mes | Storytelling narrativo, web-native | Enfoque limitado |
| **Prezi AI** | Freemium | Canvas no-lineal, memorable | Curva de aprendizaje |

### 3.2 Generadores de Código/Apps AI

| Herramienta | Genera | Precio | Fortaleza | Debilidad |
|-------------|--------|--------|-----------|-----------|
| **V0 (Vercel)** | UI/Frontend only | Free + $20/mes | Código limpio React/Next.js, Figma→Code | Solo frontend, sin BD |
| **Bolt.new** | Full-stack | $20/mes | App completa con BD, deploy rápido | Calidad variable |
| **Lovable** | Full-stack visual | $20/mes | Visual builder, Supabase integrado | Menos control de código |
| **Replit Agent** | Full-stack | $25/mes | IDE completo, hosting incluido | Vendor lock-in |

### 3.3 Generadores de Documentos AI

| Herramienta | Tipo | Fortaleza |
|-------------|------|-----------|
| **Notion AI** | Docs/Wiki | Integrado en workspace, templates |
| **Jasper AI** | Marketing copy | Tono de marca, templates marketing |
| **Google Docs (Gemini)** | Documentos | Integración Google Workspace |
| **ChatGPT + Canvas** | General | Flexible, edición inline |

### 3.4 🔑 Oportunidad de Diferenciación

**Ningún competidor hace las 3 cosas juntas (documentos + presentaciones + código) desde una interfaz de voz con experiencia inmersiva 3D.**

| Lo que hacen todos | Lo que NADIE hace |
|-------------------|-------------------|
| Texto → Output | **Voz → Output** con galaxia inmersiva |
| Un tipo de output | **Multi-output**: docs + slides + código |
| UI estándar | **Experiencia 3D** que reacciona a tu voz |
| Single LLM call | **Multi-agente** especializado por tipo |

---

## PARTE 4: QUÉ ES LO QUE MÁS BUSCA LA GENTE CREAR

### Estadísticas 2025 (HatchWorks, Nielsen Norman, GitHub):

| Tipo de contenido | Impacto medido | Demanda |
|-------------------|----------------|---------|
| **📄 Documentos de negocio** | +59% docs/hora con AI | 🔥🔥🔥 **ALTÍSIMA** |
| **💻 Código** | +126% proyectos/semana, 55% más rápido | 🔥🔥🔥 **ALTÍSIMA** |
| **📊 Presentaciones** | +30-50% productividad | 🔥🔥 **ALTA** |
| **📧 Emails/Copy** | Automatización top en empresas | 🔥🔥 **ALTA** |
| **🖼️ Imágenes** | AI gen adoption masiva | 🔥🔥 **ALTA** |

### Top 5 cosas que la gente quiere crear con AI:

1. **Documentos estructurados** — PRDs, propuestas, reportes, contratos
2. **Código frontend** — Landing pages, componentes UI, apps web
3. **Presentaciones** — Pitch decks, reportes, educación
4. **Emails/Marketing** — Campañas, copy, newsletters
5. **Imágenes/Diagramas** — Infografías, mockups, diagramas de flujo

---

## PARTE 5: ARQUITECTURA MULTI-AGENTE RECOMENDADA

### 5.1 Frameworks investigados

| Framework | Arquitectura | Mejor para | Producción-ready |
|-----------|-------------|------------|------------------|
| **LangGraph** | Grafos (nodos/edges) | Workflows complejos, estado persistente | ✅ Sí |
| **CrewAI** | Agentes con roles | Equipos de agentes, 700+ integraciones | ✅ Sí |
| **AutoGen** | Conversaciones multi-agente | Colaboración entre agentes | ⚠️ Parcial |
| **OpenAI Swarm** | Handoff ligero | Prototipado, educación | ❌ Experimental |

### 5.2 Arquitectura recomendada para el MVP

```
                    ┌─────────────────────┐
                    │   USUARIO (Voz/Texto) │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   AGENTE ORQUESTADOR  │
                    │   (Router/Planner)    │
                    │   Detecta intención   │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
    ┌─────────▼──────┐ ┌──────▼───────┐ ┌──────▼───────┐
    │ AGENTE DOCS    │ │ AGENTE SLIDES│ │ AGENTE CODE  │
    │                │ │              │ │              │
    │ • Markdown     │ │ • JSON slides│ │ • React/HTML │
    │ • Estructura   │ │ • Layout auto│ │ • Tailwind   │
    │ • Formato PRD  │ │ • Diseño     │ │ • Preview    │
    │ • Contratos    │ │ • Animaciones│ │ • Exportar   │
    └────────┬───────┘ └──────┬───────┘ └──────┬───────┘
             │                │                │
             └────────────────┼────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   ARTEFACTOS (BD)   │
                    │   Supabase JSONB    │
                    └─────────────────────┘
```

### 5.3 ¿Necesitamos multi-agente para el MVP?

**Para el MVP: NO.** Un solo LLM call con prompts especializados es suficiente.

**Razón**: Multi-agente agrega complejidad (orquestación, estado, debugging) sin beneficio real hasta que los workflows sean complejos. Para el MVP:

```
Prompt especializado por tipo → LLM → Output estructurado → Render en UI
```

**Para V2 (post-MVP)**: Sí, usar **LangGraph** porque:
- Estado persistente (conversaciones largas)
- Streaming nativo
- Grafos permiten workflows condicionales (ej: "crea una landing y su pitch deck")

---

## PARTE 6: PLAN MVP — CONTENT CREATOR

### 6.1 Tipos de artefactos MVP

| Tipo | Output | Render en UI |
|------|--------|-------------|
| **Documento** | Markdown estructurado | Editor visual markdown |
| **Presentación** | JSON (slides array) | Visor de slides con navegación |
| **Código Frontend** | HTML/React + Tailwind | Preview en iframe sandbox |

### 6.2 Schema de BD propuesto (evolución de `artefactos`)

```sql
ALTER TABLE artefactos
ADD COLUMN titulo TEXT NOT NULL DEFAULT '',
ADD COLUMN subtipo TEXT, -- 'prd', 'contrato', 'pitch-deck', 'landing', etc.
ADD COLUMN metadata JSONB DEFAULT '{}', -- slides count, language, etc.
ADD COLUMN version INTEGER DEFAULT 1,
ADD COLUMN updated_at TIMESTAMPTZ DEFAULT timezone('utc', now());

-- Índices para búsqueda
CREATE INDEX idx_artefactos_tipo ON artefactos(tipo);
CREATE INDEX idx_artefactos_creado_por ON artefactos(creado_por);
```

**Estructura JSONB por tipo:**

```jsonc
// tipo: "documento"
{
  "markdown": "# Título\n## Sección...",
  "toc": ["Introducción", "Alcance", "..."],
  "word_count": 1500
}

// tipo: "presentacion"
{
  "slides": [
    { "title": "...", "content": "...", "layout": "title-slide", "notes": "..." },
    { "title": "...", "bullets": ["..."], "layout": "bullets", "image_prompt": "..." }
  ],
  "theme": "dark",
  "total_slides": 10
}

// tipo: "codigo"
{
  "html": "<!DOCTYPE html>...",
  "css": "...",
  "js": "...",
  "framework": "react",
  "dependencies": ["tailwindcss"]
}
```

### 6.3 Prompts especializados (no multi-agente)

```
DOCUMENTO → System prompt: "Eres un experto en documentación técnica..."
PRESENTACIÓN → System prompt: "Eres un diseñador de presentaciones. Output: JSON de slides..."
CÓDIGO → System prompt: "Eres un desarrollador frontend senior. Genera código completo..."
```

### 6.4 Cómo mejorar vs competidores

| Competidor | Su debilidad | Nuestra ventaja |
|------------|-------------|-----------------|
| Gamma (slides) | Solo presentaciones | Docs + Slides + Code en un solo lugar |
| V0 (code) | Solo UI components | App completa + documentación |
| Notion AI (docs) | Solo documentos | Presentaciones + código también |
| Todos | Interfaz texto estándar | **Voz + Galaxia 3D inmersiva** |
| Todos | Single output | **Multi-tipo desde un prompt** |

### 6.5 Roadmap MVP

#### Fase 1: Core (Semana 1-2)
- [ ] Migrar schema de artefactos (agregar campos)
- [ ] Activar RLS en todas las tablas
- [ ] Auth con Supabase (Google/GitHub login)
- [ ] Prompt engine: 3 prompts especializados (doc, slides, code)
- [ ] Parser de output: detectar tipo y extraer estructura

#### Fase 2: Render (Semana 2-3)
- [ ] Visor de documentos (markdown → HTML styled)
- [ ] Visor de presentaciones (JSON → slides navegables)
- [ ] Preview de código (iframe sandbox seguro)
- [ ] Panel de artefactos con historial

#### Fase 3: Polish (Semana 3-4)
- [ ] Exportar: PDF (docs), PPTX (slides), ZIP (código)
- [ ] Edición inline post-generación
- [ ] Templates/subtipos predefinidos
- [ ] Galaxia reacciona al tipo de artefacto generado (colores por tipo)

#### Fase 4: Multi-agente V2 (Futuro)
- [ ] Migrar a LangGraph para workflows complejos
- [ ] Agente orquestador que detecta intención
- [ ] Generación encadenada ("haz la landing Y el pitch deck")
- [ ] Memoria conversacional persistente

---

## PARTE 7: RESUMEN EJECUTIVO

### ¿Qué es Galaxy AI Canvas?
Un **AI content creator inmersivo** donde el usuario habla o escribe lo que necesita crear y obtiene documentos, presentaciones o código frontend — todo desde una interfaz con una galaxia 3D que reacciona orgánicamente a su voz.

### ¿Por qué es diferente?
1. **Voice-first** — hablas, no escribes
2. **Multi-output** — docs + slides + code desde un prompt
3. **Experiencia inmersiva** — galaxia 3D reactiva (no un chatbot aburrido)
4. **Todo en uno** — reemplaza Gamma + V0 + Notion AI

### ¿Qué sigue ahora?
1. Migrar el schema de BD para soportar los 3 tipos de artefactos
2. Implementar los 3 prompts especializados
3. Construir los 3 viewers (markdown, slides, code preview)
4. Auth + RLS

---

*Documento generado el 6 de marzo de 2026 — Galaxy AI Canvas MVP*
