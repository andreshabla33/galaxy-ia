import type { ArtifactType } from './artifact-prompts'

export interface Template {
  id: string
  type: ArtifactType
  subtipo: string
  label: string
  description: string
  icon: string
  prompt: string
  guided?: boolean
}

export const TEMPLATES: Template[] = [
  // === DOCUMENTOS ===
  {
    id: 'doc-prd',
    type: 'documento',
    subtipo: 'prd',
    label: 'PRD',
    description: 'Product Requirements Document',
    icon: '📋',
    prompt: 'Crea un PRD (Product Requirements Document) profesional para: ',
  },
  {
    id: 'doc-propuesta',
    type: 'documento',
    subtipo: 'propuesta',
    label: 'Propuesta',
    description: 'Propuesta comercial o de proyecto',
    icon: '📑',
    prompt: 'Crea una propuesta profesional detallada para: ',
  },
  {
    id: 'doc-reporte',
    type: 'documento',
    subtipo: 'reporte',
    label: 'Reporte',
    description: 'Reporte ejecutivo o de análisis',
    icon: '📊',
    prompt: 'Crea un reporte ejecutivo detallado sobre: ',
  },
  {
    id: 'doc-guia',
    type: 'documento',
    subtipo: 'guia',
    label: 'Guía',
    description: 'Guía técnica o tutorial',
    icon: '📖',
    prompt: 'Crea una guía paso a paso completa sobre: ',
  },
  {
    id: 'doc-contrato',
    type: 'documento',
    subtipo: 'contrato',
    label: 'Contrato',
    description: 'Contrato o acuerdo legal',
    icon: '📝',
    prompt: 'Crea un contrato profesional para: ',
  },
  {
    id: 'doc-visa-expert-letter',
    type: 'documento',
    subtipo: 'carta-experto',
    label: 'Prueba Visas Carta de Experto',
    description: 'Carta de experto para prueba de visas de inmigración',
    icon: '🏛️',
    prompt: '__GUIDED_FLOW__visa-letter',
    guided: true,
  },
  // === PRESENTACIONES ===
  {
    id: 'pres-pitch',
    type: 'presentacion',
    subtipo: 'pitch-deck',
    label: 'Pitch Deck',
    description: 'Presentación para inversionistas',
    icon: '🚀',
    prompt: 'Crea un pitch deck para inversionistas sobre: ',
  },
  {
    id: 'pres-educativo',
    type: 'presentacion',
    subtipo: 'educativo',
    label: 'Educativo',
    description: 'Presentación educativa o clase',
    icon: '🎓',
    prompt: 'Crea una presentación educativa sobre: ',
  },
  {
    id: 'pres-reporte',
    type: 'presentacion',
    subtipo: 'reporte',
    label: 'Reporte',
    description: 'Reporte visual de resultados',
    icon: '📈',
    prompt: 'Crea una presentación de reporte de resultados sobre: ',
  },
  {
    id: 'pres-propuesta',
    type: 'presentacion',
    subtipo: 'propuesta',
    label: 'Propuesta',
    description: 'Propuesta visual de proyecto',
    icon: '💼',
    prompt: 'Crea una presentación de propuesta de proyecto sobre: ',
  },
  // === CÓDIGO ===
  {
    id: 'code-landing',
    type: 'codigo',
    subtipo: 'landing',
    label: 'Landing Page',
    description: 'Página de aterrizaje moderna',
    icon: '🌐',
    prompt: 'Crea una landing page moderna y profesional para: ',
  },
  {
    id: 'code-dashboard',
    type: 'codigo',
    subtipo: 'dashboard',
    label: 'Dashboard',
    description: 'Panel de control con métricas',
    icon: '📊',
    prompt: 'Crea un dashboard con métricas y gráficos para: ',
  },
  {
    id: 'code-form',
    type: 'codigo',
    subtipo: 'formulario',
    label: 'Formulario',
    description: 'Formulario con validación',
    icon: '📝',
    prompt: 'Crea un formulario completo con validación para: ',
  },
  {
    id: 'code-componente',
    type: 'codigo',
    subtipo: 'componente',
    label: 'Componente UI',
    description: 'Componente reutilizable',
    icon: '🧩',
    prompt: 'Crea un componente UI reutilizable de: ',
  },
]

export function getTemplatesByType(type: ArtifactType): Template[] {
  return TEMPLATES.filter(t => t.type === type)
}

export function getTemplateById(id: string): Template | undefined {
  return TEMPLATES.find(t => t.id === id)
}
