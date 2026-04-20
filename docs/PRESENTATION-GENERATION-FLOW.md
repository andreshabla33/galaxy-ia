# Generacion de Presentaciones: Flujo y Reglas de Diseno

Este documento explica como funciona hoy la creacion de presentaciones en `Galaxy IA`, incluyendo:

- Flujo end-to-end desde prompt hasta render/export.
- Motor de layouts automatico.
- Reglas de diversidad entre slides.
- Cuando se usa cada layout.
- Como funciona el laboratorio de pruebas en `/test`.

---

## 1) Flujo general (paso a paso)

### Paso 1. Deteccion de intencion

El sistema detecta si el usuario quiere una `presentacion` usando el detector de intencion en:

- `src/shared/config/artifact-prompts.ts` (`INTENT_DETECTOR_PROMPT`)

Si la intencion es `presentacion`, se usa el prompt especializado de presentaciones.

### Paso 2. Generacion del JSON de presentacion (LLM)

El LLM recibe `PRESENTATION_PROMPT` (en `src/shared/config/artifact-prompts.ts`) y debe devolver:

- Bloque `artifact:presentacion`
- `titulo`, `subtipo`, `theme`, `style_family`, `color_scheme`
- `slides[]` con layouts y campos de contenido

Reglas clave del prompt:

- Minimo 12, maximo 18 slides.
- Arco narrativo obligatorio (hook -> contexto -> problema -> solucion -> evidencia -> cierre).
- Uso de layouts clasicos, premium y experimentales.
- Regla de diferenciacion entre slides consecutivos.
- Regla anti-slides vacios (excepto separadores).

### Paso 3. Parseo y normalizacion del artefacto

El parser (`src/shared/lib/artifact-parser.ts`) extrae el JSON y construye `contenido` con:

- `slides`
- `theme`
- `style_family` (si viene)
- `color_scheme` (si viene)

Incluye estrategias de recuperacion para JSON incompleto/malformado.

### Paso 4. Motor de layout automatico

Antes de mostrar o exportar, se aplica:

- `optimizePresentationSlides(...)` en `src/shared/lib/presentation-layout-engine.ts`

Este motor:

1. Compacta contenido (titulos, bullets, items).
2. Propone layout por semantica del slide.
3. Rota layouts para evitar repeticion.
4. Mide similitud slide-a-slide y fuerza mutaciones si no cumple diversidad.
5. Evita slides vacios inyectando contenido minimo util.
6. En decks largos, inserta `section-divider` si no existe.

### Paso 5. Render visual (viewer)

Se renderiza en:

- `src/widgets/artifact-viewer/ui/PresentationViewer.tsx`

El viewer soporta layouts clasicos + premium + experimentales, incluyendo:

- `photo-quote`
- `product-mockup`
- `split-spotlight`
- `orbit-stats`

Tambien usa tema/color resuelto para mantener contraste y legibilidad.

### Paso 6. Generacion de imagenes

Si hay `image_prompt`, el viewer precarga imagenes en batch via:

- `src/app/api/generate-image/route.ts`

Con cache, timeout y fallback si la API falla.

### Paso 7. Exportacion a PPTX

La exportacion usa:

- `src/shared/lib/export-pptx.ts`

Importante: antes de exportar tambien se aplica `optimizePresentationSlides(...)` para alinear estructura con viewer.

---

## 2) Como decide el motor "que layout usar"

El motor evalua señales del slide:

- Tiene imagen (`image_prompt` o `image_url`)
- Tiene stats (`stats[]`)
- Tiene comparativa (`left/right`)
- Tiene cita (`quote`)
- Tiene coleccion (`items[]`)
- Tiene bullets
- Densidad de texto

Y con eso aplica heuristicas:

- `quote` -> `photo-quote` o `quote` o `full-image`
- `stats` -> `orbit-stats` o `chart` o `stats`
- `left/right` -> `comparison` o `two-column`
- `items[]` -> `bento-grid` o `icon-grid` o `timeline` o `split-spotlight`
- `imagen + bullets` -> `split-spotlight`/`image-left`/`image-right`/`full-image`/`product-mockup`
- Si es primer slide -> prioridad `title`
- Si es ultimo slide -> prioridad `closing`

Ademas:

- Si dos slides consecutivos se parecen demasiado, el motor fuerza un layout alterno.
- Si el slide esta "vacio", lo mueve a un layout mas rico y agrega contenido minimo.

---

## 3) Regla de diversidad (objetivo 60%)

La similitud entre slide N y N+1 se estima por:

- Layout igual o distinto
- Tipo estructural (datos, comparativa, cita, bullets, coleccion)
- Presencia de imagen
- Presencia de stats/quote
- Densidad textual

Si la similitud es alta (por encima del umbral), se reescribe el layout del slide siguiente para aumentar diferencia.

En `/test` existe medidor de diversidad:

- `analyzeSlideDiversity(...)` en `presentation-layout-engine.ts`
- Muestra diversidad por par y promedio total del deck.

---

## 4) Casos de uso: cuando aparece X diseno

Esta tabla resume "cuando sale cada layout":

- `title`: apertura de presentacion, portada.
- `section-divider`: corte narrativo entre bloques.
- `bullets`: explicacion textual cuando no hay estructura especial.
- `image-left` / `image-right`: explicacion con apoyo visual.
- `full-image`: impacto visual fuerte + frase clave.
- `photo-quote`: cita protagonista sobre imagen editorial.
- `product-mockup`: mostrar experiencia de app/dispositivo.
- `split-spotlight`: mitad visual, mitad narrativa accionable.
- `stats`: KPIs simples en tarjetas.
- `chart`: KPIs con progresion visual.
- `orbit-stats`: KPIs en composicion radial (mas "showcase").
- `two-column`: contraste de 2 bloques.
- `comparison`: "antes vs despues" / "nosotros vs ellos".
- `icon-grid`: pilares/features en grilla compacta.
- `bento-grid`: composicion asimetrica tipo Apple/Stripe.
- `timeline`: roadmap/proceso por hitos.
- `quote`: cita textual centrada (sin foto protagonista).
- `closing`: cierre y CTA.

---

## 5) Reglas concretas del laboratorio `/test`

En `src/app/test/page.tsx` hay presets de estilo:

- `dark-glass`
- `light-minimal`
- `bold-gradient`
- `corporate`
- `editorial`
- `gamma-auto`

Y presets de industria:

- `startup`
- `education`
- `agency`
- `finance`

### Como se combinan

1. Se elige un tema base (`ThemeStyle`).
2. Se elige industria (`IndustryPreset`).
3. Se aplica `optimizePresentationSlides(...)` con semilla `theme + industry + titulo`.
4. Se inyecta textura visual segun industria.
5. Se calcula diversity report y se muestra en el panel lateral.

Ejemplo:

- Si seleccionas `light-minimal` + `education`, usara la narrativa educativa con paleta clara, textura de educacion y layouts optimizados para evitar repeticion.
- Si seleccionas `gamma-auto`, el deck esta intencionalmente repetitivo de entrada para verificar que el motor lo diversifique automaticamente.

---

## 6) Como funciona la creacion de documentos (no presentaciones)

Para `documento`, el flujo es paralelo pero con artefacto markdown:

1. Intencion detectada como `documento`.
2. Se usa `DOCUMENT_PROMPT` (`src/shared/config/artifact-prompts.ts`).
3. El LLM devuelve `artifact:documento` con `contenido` markdown.
4. Parser construye:
   - `markdown`
   - `toc` (tabla de contenidos extraida)
   - `word_count`
5. Render en el viewer de documentos.

No pasa por el motor de layouts de presentaciones.

---

## 7) Limitaciones actuales

- El motor es heuristico (no un constraint solver completo como un editor de presentaciones nativo).
- Export PPTX mapea layouts experimentales a equivalentes compatibles.
- Calidad visual final depende tambien de la calidad de `image_prompt` y disponibilidad de API de imagen.

---

## 8) Checklist rapido para diagnosticar "slides parecidos"

Si un deck se ve repetitivo:

1. Revisar diversity meter en `/test`.
2. Ver si el JSON de entrada trae contenido demasiado uniforme.
3. Verificar que el prompt no este devolviendo layouts fijos repetidos.
4. Confirmar que `optimizePresentationSlides(...)` se esta aplicando antes de render/export.
5. Revisar si faltan imagenes (sin imagen, algunos layouts convergen visualmente).

