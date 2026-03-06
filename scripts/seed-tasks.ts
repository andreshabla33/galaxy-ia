// Script para insertar tareas programadas en Supabase
// Ejecutar: npx tsx scripts/seed-tasks.ts

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const TASKS = [
  {
    titulo: 'UI Dark Glassmorphism 2026 - LoginScreen',
    descripcion: 'Aurora background, glass card con blur, noise overlay, micro-interacciones, logo glow, entrada animada.',
    estado: 'completada',
    prioridad: 'alta',
    fase: 'fase-3',
  },
  {
    titulo: 'Export PPTX/DOCX/HTML real desde viewers',
    descripcion: 'PptxGenJS para PowerPoint, docx lib para Word, HTML directo. Dynamic imports, webpack node: fix.',
    estado: 'completada',
    prioridad: 'alta',
    fase: 'fase-3',
  },
  {
    titulo: 'Edición iterativa inline - Chat en panel de artefactos',
    descripcion: 'ArtifactEditChat con voz + texto, edit prompts por tipo, panel modo edición/normal, historial de ediciones.',
    estado: 'completada',
    prioridad: 'alta',
    fase: 'fase-3',
  },
  {
    titulo: 'Chips de acción rápida en editor de artefactos',
    descripcion: '6 acciones por tipo (presentacion, documento, codigo). Patrones AIUX: Inline Action, Restyle, Restructure.',
    estado: 'completada',
    prioridad: 'alta',
    fase: 'fase-3',
  },
  {
    titulo: 'Optimización voice input - SpeechRecognition paralelo',
    descripcion: 'SpeechRecognition se inicia antes de getUserMedia. setIsRecording inmediato. Reduce ~500ms latencia.',
    estado: 'completada',
    prioridad: 'alta',
    fase: 'fase-3',
  },
  {
    titulo: 'Fix guardado artefactos en Supabase',
    descripcion: 'Corregido error silencioso: insert retorna {error} en vez de throw. Logging mejorado.',
    estado: 'completada',
    prioridad: 'alta',
    fase: 'fase-2',
  },
  {
    titulo: 'Templates y subtipos predefinidos',
    descripcion: 'Plantillas predefinidas por tipo de artefacto para acelerar la generación inicial.',
    estado: 'pendiente',
    prioridad: 'media',
    fase: 'fase-4',
  },
  {
    titulo: 'Galaxy colores reactivos por tipo de artefacto',
    descripcion: 'La galaxia cambia de colores según el tipo de artefacto generado (doc=blue, pres=purple, code=green).',
    estado: 'pendiente',
    prioridad: 'media',
    fase: 'fase-4',
  },
]

async function seed() {
  console.log('Insertando tareas programadas...')
  
  for (const task of TASKS) {
    const { error } = await supabase.from('tareas_programadas').insert(task)
    if (error) {
      console.error(`Error insertando "${task.titulo}":`, error.message)
    } else {
      console.log(`✓ ${task.titulo}`)
    }
  }
  
  console.log('Done.')
}

seed()
