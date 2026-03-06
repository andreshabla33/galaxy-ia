# Galaxy AI Canvas — Arquitectura FSD

## Patrón: Feature-Sliced Design (FSD)

Este proyecto usa **Feature-Sliced Design**, la metodología de arquitectura frontend
más escalable y mantenible de 2025-2026 según las mejores prácticas de la industria.

### Regla de oro

> **Una capa solo puede importar de capas INFERIORES, nunca superiores.**

```
app/         → Solo compone páginas, NO contiene lógica de negocio
  ↓
widgets/     → Bloques de UI autónomos (pueden usar features y entities)
  ↓
features/    → Acciones del usuario y lógica de negocio
  ↓
entities/    → Objetos de negocio (tipos, modelos)
  ↓
shared/      → Utilidades, config, UI reutilizable (sin dependencias de negocio)
```

---

## Estructura de carpetas

```
src/
├── app/                              # CAPA: App (Next.js App Router)
│   ├── layout.tsx                    #   Root layout + providers
│   ├── page.tsx                      #   Orquestador: compone widgets
│   ├── globals.css                   #   Estilos globales
│   └── api/chat/route.ts            #   BFF: proxy a providers de IA
│
├── entities/                         # CAPA: Entities (objetos de negocio)
│   ├── message/
│   │   ├── model/types.ts           #   ChatMessage, APIChatMessage
│   │   └── index.ts                 #   Barrel export
│   ├── artifact/
│   │   ├── model/types.ts           #   Artifact, ArtifactType
│   │   └── index.ts
│   └── user/
│       ├── model/types.ts           #   User
│       └── index.ts
│
├── features/                         # CAPA: Features (acciones del usuario)
│   ├── voice-input/
│   │   ├── hooks/useAudioVisualizer.ts  # Web Audio API + Speech Recognition
│   │   ├── lib/pitch-detector.ts        # Autocorrelación para detección de género
│   │   └── index.ts
│   ├── ai-chat/
│   │   ├── hooks/useChat.ts             # Streaming chat con abort support
│   │   ├── lib/providers/               # Strategy Pattern: 1 archivo por provider
│   │   │   ├── gemini.ts
│   │   │   ├── openai.ts
│   │   │   ├── anthropic.ts
│   │   │   ├── openrouter.ts
│   │   │   └── index.ts
│   │   ├── lib/stream-transformers.ts   # SSE → texto plano
│   │   └── index.ts
│   └── settings/
│       ├── ui/SettingsModal.tsx          # Modal de configuración
│       ├── model/appStore.ts            # Zustand store (persist)
│       └── index.ts
│
├── widgets/                          # CAPA: Widgets (bloques de UI autónomos)
│   ├── galaxy-canvas/
│   │   ├── ui/GalaxyCanvas.tsx      #   Three.js: galaxia + morph a rostro
│   │   ├── lib/face-generator.ts    #   Generador paramétrico de rostro 3D
│   │   └── index.ts
│   ├── chat-input/
│   │   ├── ui/ChatInput.tsx         #   Barra de input + mic + enviar
│   │   └── index.ts
│   └── artifacts-panel/
│       ├── ui/ArtifactsPanel.tsx    #   Panel derecho con mensajes + X close
│       └── index.ts
│
└── shared/                           # CAPA: Shared (reutilizable sin negocio)
    ├── lib/
    │   ├── supabase.ts              #   Cliente Supabase
    │   └── generate-id.ts           #   Generador de IDs únicos
    └── config/
        └── providers.ts             #   AIModelProvider type + SYSTEM_PROMPT + config
```

---

## Patrones de diseño

| Patrón | Dónde | Para qué |
|---|---|---|
| **Strategy** | `features/ai-chat/lib/providers/` | Cada provider de IA es una strategy intercambiable |
| **Observer** | `frequencyRef` (voice-input → galaxy-canvas) | Datos de audio a 60fps sin re-renders via React ref |
| **Barrel Exports** | `index.ts` en cada módulo | API pública estable, internals pueden cambiar |
| **Store (Zustand)** | `features/settings/model/appStore.ts` | Estado global persistente (apiKey, provider) |
| **BFF** | `app/api/chat/route.ts` | Proxy edge que abstrae múltiples providers |
| **Morph Animation** | `widgets/galaxy-canvas/` | Interpolación suave galaxia ↔ rostro humano |

---

## Reglas de dependencia

```
✅ PERMITIDO:
   app/page.tsx        → features/*, widgets/*
   widgets/*           → features/*, entities/*, shared/*
   features/*          → entities/*, shared/*
   entities/*          → shared/*

❌ PROHIBIDO:
   shared/*            → entities/*, features/*, widgets/*
   entities/*          → features/*, widgets/*
   features/*          → widgets/*
   widgets/*           → app/*
```

---

## Cómo agregar un nuevo feature

1. Crear carpeta en `src/features/mi-feature/`
2. Agregar `hooks/`, `lib/`, `ui/` según necesidad
3. Exportar API pública en `index.ts`
4. El feature solo puede importar de `entities/` y `shared/`
5. Los widgets que lo usen importan desde `@/features/mi-feature`

## Cómo agregar un nuevo widget

1. Crear carpeta en `src/widgets/mi-widget/`
2. Componente principal en `ui/MiWidget.tsx`
3. Lógica auxiliar en `lib/`
4. Exportar en `index.ts`
5. Importar desde `app/page.tsx` o donde se compose la página

## Cómo agregar un nuevo provider de IA

1. Crear `src/features/ai-chat/lib/providers/mi-provider.ts`
2. Exportar función `streamMiProvider(apiKey, messages)` 
3. Re-exportar en `providers/index.ts`
4. Agregar transformador SSE en `stream-transformers.ts` si el formato es nuevo
5. Agregar case en `app/api/chat/route.ts`
6. Agregar entrada en `shared/config/providers.ts`

---

## Stack tecnológico

- **Framework**: Next.js 14 (App Router)
- **Lenguaje**: TypeScript (strict mode)
- **3D**: Three.js 0.168 + React Three Fiber v8
- **Estado**: Zustand + persist middleware
- **Audio**: Web Audio API (FFT 2048) + Web Speech API
- **AI Providers**: Gemini, OpenAI, Anthropic, OpenRouter (streaming SSE)
- **DB**: Supabase (preparado para autenticación y storage)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
