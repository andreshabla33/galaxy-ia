# Changelog v3.1 — Mobile UX Overhaul

**Branch**: `v3-hybrid-responsive`  
**Commit**: `f43edf0`  
**Fecha**: 6 de Marzo 2026

---

## Problemas Detectados (testing en iPhone real)

1. **Chat input muy arriba** — El contenido se apilaba en la parte superior
2. **Bottom nav "Galaxy/Trabajo" feo** — Tabs innecesarios que confundían la UX
3. **Panel no se abría automáticamente** — El usuario debía navegar manualmente
4. **Micrófono no enviaba al chat** — iOS Safari AudioContext suspendido
5. **Micrófono de edición no se activaba** — Mismo problema de AudioContext

---

## Soluciones Implementadas

### 1. Chat Centrado en Mobile
- `justify-center` en mobile (antes `justify-end`)
- Texto del heading centrado: `text-center text-xl`
- Botón "Usar plantilla" centrado
- Padding reducido: `px-4 pb-4`

### 2. Bottom Nav Eliminado
- Eliminados completamente los tabs "Galaxy" / "Trabajo"
- Eliminado el state `activeTab`
- Nuevo state: `showArtifactOverlay` (boolean)
- Galaxy canvas siempre visible como fondo

### 3. Fullscreen Artifact Overlay
- Artifacts se muestran como overlay fullscreen que se abre automáticamente
- Animación `slideUp` (CSS keyframe) de 0.3s ease-out
- Botón ✕ para cerrar el overlay
- Aplica tanto a mobile como tablet

### 4. Fix iOS Microphone (AudioContext)
- Agregado `audioContextRef.current.resume()` después de crear AudioContext
- Fallback de detección de silencio: funciona con volumen solamente después de 1.5s
- No requiere SpeechRecognition para enviar

### 5. slideUp Animation + safe-area
- Nuevo keyframe CSS para la animación del overlay
- `safe-area-bottom` utility para padding de iPhone notch

---

## Nuevo Flujo Mobile

```
[Galaxy Canvas Background]
         ↓
[Chat centrado en pantalla]
   - Heading rotativo
   - Botón "Usar plantilla"
   - Input + mic
         ↓ (usuario habla o escribe)
[LLM genera artefacto]
         ↓
[Overlay fullscreen se abre automáticamente]
   - Header: "Resultado" + ✕
   - ArtifactsPanel completo
   - Cerrar → vuelve a galaxy + chat
```

---

## Archivos Modificados
- `src/app/page.tsx` — Layout mobile/tablet rediseñado
- `src/app/globals.css` — slideUp keyframe + safe-area-bottom
- `src/features/voice-input/hooks/useAudioVisualizer.ts` — iOS AudioContext fix

## Todos los Commits v3
1. `docs: plan v3 responsive + hybrid intent detection`
2. `feat(v3): hybrid intent detection API + responsive layout + useMediaQuery hook`
3. `feat(v3-P1): ChatInput responsive, GalaxyCanvas adaptive particles, PresentationViewer mobile`
4. `fix: all ESLint errors for Vercel production build`
5. `fix(mobile): center chat, remove bottom nav, fullscreen artifact overlay, fix iOS mic`

## Deploy
- **Vercel**: `galaxy-ia.vercel.app`
- **Google OAuth**: Redirect URI configurado
- **Supabase Auth**: Site URL y Redirect URLs actualizados
