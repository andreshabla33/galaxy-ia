-- Ejecutar en Supabase SQL Editor (Dashboard > SQL Editor)
-- Inserta tareas programadas del desarrollo de Galaxy AI Canvas

INSERT INTO public.tareas_programadas (titulo, descripcion, status, prioridad, fase) VALUES
('UI Dark Glassmorphism 2026 - LoginScreen',
 'Aurora background, glass card con blur, noise overlay, micro-interacciones, logo glow, entrada animada.',
 'completada', 'alta', 'fase-3'),
('Export PPTX/DOCX/HTML real desde viewers',
 'PptxGenJS para PowerPoint, docx lib para Word, HTML directo. Dynamic imports, webpack node: fix.',
 'completada', 'alta', 'fase-3'),
('Edición iterativa inline - Chat en panel de artefactos',
 'ArtifactEditChat con voz + texto, edit prompts por tipo, panel modo edición/normal, historial de ediciones.',
 'completada', 'alta', 'fase-3'),
('Chips de acción rápida en editor de artefactos',
 '6 acciones por tipo (presentacion, documento, codigo). Patrones AIUX: Inline Action, Restyle, Restructure.',
 'completada', 'alta', 'fase-3'),
('Optimización voice input - SpeechRecognition paralelo',
 'SpeechRecognition se inicia antes de getUserMedia. setIsRecording inmediato. Reduce ~500ms latencia.',
 'completada', 'alta', 'fase-3'),
('Fix guardado artefactos en Supabase',
 'Corregido error silencioso: insert retorna {error} en vez de throw. Logging mejorado.',
 'completada', 'alta', 'fase-2'),
('Templates y subtipos predefinidos',
 'Plantillas predefinidas por tipo de artefacto para acelerar la generación inicial.',
 'pendiente', 'media', 'fase-4'),
('Galaxy colores reactivos por tipo de artefacto',
 'La galaxia cambia de colores según el tipo generado (doc=blue, pres=purple, code=green).',
 'pendiente', 'media', 'fase-4');
