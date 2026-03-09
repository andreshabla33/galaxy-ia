# Evolución del MVP: Tendencias 2026 para Generación de Código y Documentos

**Fecha:** 9 de Marzo de 2026
**Proyecto:** Galaxy AI Canvas

Este documento recoge el análisis estratégico basado en las tendencias globales de 2026 para plataformas de generación "AI-first" (al estilo de Cursor v0, Claude Artifacts y V0 de Vercel) y mapea las tareas estratégicas que se integrarán en las siguientes fases del MVP de Galaxy AI Canvas.

---

## 1. El Estado Actual del MVP

Nuestra implementación actual sentó una arquitectura altamente competitiva:
* **Ecosistema de Código (`CodeViewer.tsx`):** Un renderizador eficiente de artefactos mediante `iframes` asegurados (sandbox) que procesa componentes Single-File HTML / Tailwind.
* **Ecosistema de Documentos (`DocumentViewer.tsx`):** Un visor de lectura hermosa basado en `react-markdown` / GFM que extrae metadata del JSONB y permite la exportación a archivos `.docx`.
* **Motor Base (`Artifacts` & Parser):** El panel inteligente de historia de artefactos y recuperación conversacional, soportado por la base de datos Supabase usando datos de formato `JSONB`.

---

## 2. Tendencias de la Industria 2026 (Cursor, Anthropic, Vercel)

La generación estática ya no es el estándar. Las herramientas líderes han transformado el desarrollo desde "generación de código" hacia el **"Orchestration & Vibe Coding"** y el **Feedback Multimodal**:

1. **Containers nativos en el navegador:** Plataformas como V0 o Claude cambiaron los `iframes` estáticos por WebContainers (o Sandpack), que pueden correr React, dependencias de NPM (como Framer Motion o Lucide) en tiempo de ejecución, permitiendo aplicaciones complejas enteras en vez de componentes puros HTML.
2. **"Self-Healing Code" y Depuración en Tiempo Real:** El artefacto captura errores de consola e interrumpe el flujo, pasándole automáticamente la consola roja de JS/React de regreso a la IA para auto-repararse.
3. **Editor de Bloques Interactivo (Documentos):** El documento final dejó de ser solo de "lectura". Herramientas similares a Notion AI o el nuevo "Canvas" de ChatGPT renderizan un editor WYSIWYG completo. Esto habilita que si el usuario quiere modificar "solo un párrafo", pueda interactuar en crudo (inline) sub-cargando la IA sin regenerar el artefacto global.
4. **Agent-Friendliness y Multimodalidad:** Plataformas como Cursor v0 permiten subir "screenshots de la previsualización" e indicarle a la IA qué boton está mal centrado visualmente para perfeccionarlo automáticamente.

---

## 3. Hoja de Ruta e Implementaciones Registradas

Hemos programado y encolado en la tabla `tareas_programadas` de Supabase las siguientes iniciativas para ejecutar en las iteraciones futuras, cerrando la brecha con las plataformas "state-of-the-art" de este año:

### 🚀 Ecosistema Código v2
* **Migrar a Sandpack:** Reconstruir `CodeViewer` inyectando un Sandbox avanzado que habilite la renderización de React, Vue, y manejo de paquetes de NPM.
* **Terminal Visual y Debugging AI:** Añadir auto-reparación inyectando logs rotos del WebContainer directamente a la memoria de la IA para que emita parches rápidos (`diffs`).
* **Botón de Deploy Mágico:** Dotar a la aplicación de un conector con la API de Vercel/Netlify para hacer públicos y accesibles por URL los prototipos directamente desde la UI de Galaxy Canvas.

### 📝 Ecosistema Documentos v2
* **Editor Block-styled Interactivo:** Remplazar el visualizador actual por librerías como Novel.sh (basado en Tiptap), permitiendo que el documento sea totalmente editable de mutuo acuerdo (Usuario/IA).
* **AI Inline Actions:** Habilitar un tooltip flotante ("Magia") al subrayar cualquier párrafo de texto para solicitarle a la IA expansiones, correcciones de gramática o traducciones localizadas.
* **Auto-Generación de Diagramas:** Interpretar bloques tipo `mermaid` para la inyección nativa de diagramas de arquitectura visual en el medio de los contenidos sin tener que utilizar exportadores externos.
