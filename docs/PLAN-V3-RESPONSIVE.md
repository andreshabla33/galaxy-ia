# Plan v3: Responsive Layout + Hybrid Intent Detection

**Branch**: `v3-hybrid-responsive` (desde `v2-stable`)
**Fecha**: 6 de Marzo 2026

---

## Investigación Realizada

### Fuentes Consultadas
1. **arxiv.org** — "Intent Detection in the Age of LLMs" (Oct 2024): Sistema híbrido SetFit + LLM logra ~2% diff vs LLM puro con ~50% menos latencia
2. **Multi-Agent Routing Guide** — Best practices: "Start simple → cascade approaches", regex rápido + LLM fallback
3. **Groovy Web** — UI/UX Design Trends AI Apps 2026: Dark mode default, skeleton loading, streaming text, voice-first
4. **MultitaskAI** — Chat UI Design 2025: AI Assistant Cards, Persistent Context UI, Progressive Disclosure
5. **Claude Blog** — Build Responsive Web Layouts: Content-based breakpoints, no framework lock-in
6. **v0.dev** — Mobile responsive por defecto con Tailwind + shadcn/ui

### Cómo lo Hacen las Grandes Apps

| App | Desktop (>1024px) | Tablet (768-1024px) | Mobile (<768px) |
|-----|-------------------|--------------------|-----------------| 
| **ChatGPT Canvas** | Split: chat izq + canvas der | Toggle tabs | Full-screen views + bottom nav |
| **Claude Artifacts** | Split: chat izq + artifact der | Collapsible panel | Stacked, artifact as modal |
| **v0.dev** | Split: chat izq + preview der | Toggle button | Tab switcher chat/preview |
| **Gamma (slides)** | Full canvas + side edit | Toolbar collapsa | Mobile editor simplificado |

**Patrón común**: Desktop = side-by-side → Tablet = toggle/collapsible → Mobile = full-screen con tabs

---

## Estado Actual del Layout

```
┌─────────────────────────────────┐
│ main (flex, h-screen)           │
│ ┌──────────────┬───────────────┐│
│ │ Galaxy Canvas │ ArtifactsPanel││
│ │ (Three.js BG)│ (45% width)   ││
│ │ + Chat Input │ + Edit Chat   ││
│ │ (centered)   │ (bottom)      ││
│ └──────────────┴───────────────┘│
└─────────────────────────────────┘
```

**Problemas actuales:**
- Sin breakpoints responsive
- ArtifactsPanel min-width 450px rompe en tablets
- Galaxy Canvas Three.js no se adapta
- Chat input max-w-2xl fijo
- Sin navegación móvil

---

## Plan de Implementación Responsive

### Breakpoints (Tailwind)
- `sm`: 640px (móvil grande / landscape)
- `md`: 768px (tablet portrait)
- `lg`: 1024px (tablet landscape / laptop)
- `xl`: 1280px (desktop)

### FASE 1: Layout Adaptivo por Dispositivo

#### Desktop (≥1024px) — COMO ESTÁ
```
┌──────────────────────────────────┐
│ Galaxy Canvas BG + Chat Input    │ ArtifactsPanel (45%)
│ (centrado, max-w-2xl)            │ + Edit Chat
└──────────────────────────────────┘
```
- Sin cambios. Side-by-side funciona.
- Galaxy siempre visible como background.

#### Tablet (768px - 1023px) — TOGGLE MODE
```
┌──────────────────────────┐
│ [Galaxy] [Trabajo]       │  ← Tab bar top
├──────────────────────────┤
│                          │
│  Vista activa (100%)     │
│  Galaxy+Chat O Artifacts │
│                          │
├──────────────────────────┤
│ Chat Input (siempre)     │
└──────────────────────────┘
```
- Tabs para alternar entre Galaxy+Chat y ArtifactsPanel
- Galaxy se mantiene como BG en su tab
- Chat input siempre visible abajo (persistent context)
- ArtifactsPanel ocupa 100% del ancho
- Edit Chat integrado al bottom del panel

#### Mobile (<768px) — FULL SCREEN + BOTTOM NAV
```
┌──────────────────────┐
│ Vista activa (100%)  │
│ - Galaxy + Chat      │
│ - O Artifacts        │
│ - O Edit             │
├──────────────────────┤
│ [Galaxy][Chat][Art]  │  ← Bottom nav
└──────────────────────┘
```
- Bottom navigation con tabs
- Galaxy: vista simplificada (less particles, lower res)
- Chat: input de texto + voice prominente
- Artifact: viewer full-screen
- Edit: chat de edición full-screen
- Transiciones swipe entre vistas

### FASE 2: Componentes Responsive

#### 2.1 GalaxyCanvas Adaptivo
- Mobile: reducir partículas (1000 → 300), lower resolution
- Tablet: partículas medias (1000 → 600)
- Usar `devicePixelRatio` capped a 1.5 en mobile
- Canvas se adapta al viewport

#### 2.2 ChatInput Responsive
- Desktop: max-w-2xl, botones texto + icono
- Tablet: max-w-xl, botones con iconos
- Mobile: full-width, voz prominente (botón grande), texto secundario

#### 2.3 ArtifactsPanel Responsive
- Desktop: 45% width, side panel
- Tablet: 100% width, tab view
- Mobile: 100% width, full screen, navigation bottom
- PresentationViewer: slides adaptan aspect-ratio en mobile

#### 2.4 ArtifactEditChat Responsive
- Desktop: bottom del panel, 3 líneas
- Tablet: bottom del panel, expandible
- Mobile: full screen dedicado

### FASE 3: Hybrid Intent Detection

#### Arquitectura
```
User Message
    │
    ▼
[Regex Fast Path] ──match──→ Intent (presentacion/documento/codigo/imagen)
    │ no match
    ▼
[LLM Classification] ──→ Intent (via prompt corto, ~100 tokens)
    │
    ▼
[Load Prompt] → [Build Context] → [Send to LLM]
```

#### Implementación
1. `detectIntent()` actual se mantiene como fast path
2. Si retorna `null` (general), llamar `/api/classify-intent`
3. API route nueva: envía mensaje + lista de intents al LLM
4. Prompt corto: "Clasifica: presentacion | documento | codigo | imagen | general"
5. Response: solo la palabra del intent (~50ms con cache)
6. Fallback: si LLM falla → usar "general"

### FASE 4: Optimizaciones Mobile

- **Touch gestures**: Swipe left/right entre vistas
- **Haptic feedback**: Vibración sutil en transiciones (navigator.vibrate)
- **PWA**: manifest.json + service worker para instalar como app
- **Offline**: Cache de prompts y último artefacto
- **Performance**: Lazy load Three.js en mobile, skeleton loading

---

## Prioridad de Implementación

| # | Tarea | Impacto | Esfuerzo | Prioridad |
|---|-------|---------|----------|-----------|
| 1 | Hybrid intent detection | Alto — deja de romper | Bajo | P0 |
| 2 | Breakpoints + layout adaptivo (page.tsx) | Alto — usabilidad | Medio | P0 |
| 3 | ArtifactsPanel responsive (tablet/mobile) | Alto — core feature | Medio | P0 |
| 4 | ChatInput responsive | Medio — UX | Bajo | P1 |
| 5 | GalaxyCanvas adaptivo (particles/res) | Medio — performance | Medio | P1 |
| 6 | Bottom navigation mobile | Alto — navegación | Medio | P1 |
| 7 | PresentationViewer mobile | Medio — content | Bajo | P1 |
| 8 | Touch gestures / swipe | Bajo — polish | Medio | P2 |
| 9 | PWA + offline | Bajo — nice to have | Alto | P2 |
| 10 | Haptic + animations | Bajo — polish | Bajo | P2 |

---

## Qué Se Muestra en Cada Dispositivo

### Galaxy (Three.js Canvas)
- **Desktop**: Siempre visible como background, reacciona a voz/loading
- **Tablet**: Visible en tab "Galaxy", se oculta en tab "Trabajo"
- **Mobile**: Tab dedicado, versión ligera (menos partículas)

### Chat
- **Desktop**: Input centrado sobre la galaxia, mensajes en ArtifactsPanel
- **Tablet**: Input siempre visible al bottom, mensajes en panel cuando activo
- **Mobile**: Tab dedicado con historial completo + input

### Artifact Preview
- **Desktop**: Panel derecho 45%, viewer integrado
- **Tablet**: Tab "Trabajo" 100% width
- **Mobile**: Tab dedicado full-screen

### Edición de Artefactos
- **Desktop**: Chat de edición al bottom del panel
- **Tablet**: Chat de edición al bottom del panel (100% width)
- **Mobile**: Tab dedicado "Editar" con ThinkingIndicator
