// ============================================================
// GUIDED FLOW: Visa Expert Letter — Step-by-step questions
// Each step collects a piece of information needed for the letter
// ============================================================

export interface GuidedStep {
  id: string
  question: string
  placeholder: string
  fieldKey: string
  helperText?: string
  required: boolean
}

export const VISA_LETTER_STEPS: GuidedStep[] = [
  {
    id: 'beneficiary_name',
    question: '¿Cuál es el nombre completo del beneficiario (la persona que solicita la visa)?',
    placeholder: 'Ej: Juan Carlos Rodríguez Pérez',
    fieldKey: 'beneficiaryName',
    helperText: 'Nombre tal como aparece en su pasaporte.',
    required: true,
  },
  {
    id: 'visa_type',
    question: '¿Qué tipo de visa está solicitando el beneficiario?',
    placeholder: 'Ej: EB-1A, EB-2 NIW, O-1A, O-1B, EB-1B...',
    fieldKey: 'visaType',
    helperText: 'Indica la categoría específica de visa.',
    required: true,
  },
  {
    id: 'beneficiary_field',
    question: '¿Cuál es el campo de expertise o área profesional del beneficiario?',
    placeholder: 'Ej: Inteligencia Artificial y Machine Learning',
    fieldKey: 'beneficiaryField',
    helperText: 'El área específica donde el beneficiario ha demostrado habilidad extraordinaria.',
    required: true,
  },
  {
    id: 'beneficiary_achievements',
    question: '¿Cuáles son los logros más importantes del beneficiario? (premios, publicaciones, patentes, etc.)',
    placeholder: 'Ej: Publicó 15 papers en conferencias top de IA, tiene 3 patentes, premio al mejor investigador 2023...',
    fieldKey: 'beneficiaryAchievements',
    helperText: 'Detalla premios, publicaciones, patentes, contribuciones destacadas y reconocimientos.',
    required: true,
  },
  {
    id: 'beneficiary_role',
    question: '¿Cuál es el rol o posición actual del beneficiario?',
    placeholder: 'Ej: Senior Research Scientist en Google DeepMind',
    fieldKey: 'beneficiaryRole',
    helperText: 'Incluye empresa/organización y cargo actual.',
    required: true,
  },
  {
    id: 'expert_name',
    question: '¿Cuál es el nombre completo del experto que firma la carta?',
    placeholder: 'Ej: Dr. María Elena Gutiérrez',
    fieldKey: 'expertName',
    required: true,
  },
  {
    id: 'expert_title',
    question: '¿Cuál es el título y posición del experto que firma?',
    placeholder: 'Ej: Profesor Titular de Computer Science, MIT',
    fieldKey: 'expertTitle',
    helperText: 'Cargo, institución y credenciales del experto firmante.',
    required: true,
  },
  {
    id: 'expert_qualifications',
    question: '¿Cuáles son las cualificaciones y credenciales del experto firmante?',
    placeholder: 'Ej: PhD en Computer Science, 20 años de experiencia, 200+ publicaciones, Fellow IEEE...',
    fieldKey: 'expertQualifications',
    helperText: 'Experiencia, publicaciones, premios y razones por las que está calificado para opinar.',
    required: true,
  },
  {
    id: 'relationship',
    question: '¿Cuál es la relación del experto con el beneficiario?',
    placeholder: 'Ej: Colaboraron en 3 proyectos de investigación, el experto revisó sus publicaciones...',
    fieldKey: 'relationship',
    helperText: 'Cómo se conocen, si han trabajado juntos, o cómo conoce su trabajo.',
    required: true,
  },
  {
    id: 'impact_statement',
    question: '¿Cuál es el impacto del trabajo del beneficiario en su campo? ¿Por qué es extraordinario?',
    placeholder: 'Ej: Su algoritmo de optimización redujo costos de computación en un 40%, adoptado por 50+ empresas...',
    fieldKey: 'impactStatement',
    helperText: 'Evidencia concreta del impacto: números, adopción, citaciones, cambios en la industria.',
    required: true,
  },
  {
    id: 'additional_info',
    question: '¿Hay información adicional que desees incluir en la carta? (opcional)',
    placeholder: 'Ej: Mencionar que el beneficiario fue invitado como keynote speaker en NeurIPS 2024...',
    fieldKey: 'additionalInfo',
    helperText: 'Cualquier detalle extra relevante para fortalecer la carta.',
    required: false,
  },
]

// ============================================================
// SYSTEM PROMPT: Generate the expert letter from collected data
// ============================================================
export const VISA_LETTER_SYSTEM_PROMPT = `Eres un abogado de inmigración senior y redactor experto de cartas de recomendación para visas de Estados Unidos.

Tu tarea es generar una CARTA DE EXPERTO (Expert Opinion Letter) profesional, convincente y formalmente correcta para una petición de visa de inmigración.

REGLAS ESTRICTAS:
1. La carta DEBE seguir el formato estándar de cartas de experto para USCIS.
2. Usa un tono formal, profesional y persuasivo — como un abogado de inmigración.
3. Incluye terminología legal correcta de inmigración de EE.UU.
4. La carta debe ser EXTENSA (mínimo 2-3 páginas), detallada y bien argumentada.
5. NO uses frases genéricas — cada afirmación debe estar respaldada con hechos específicos.
6. Estructura la carta con:
   - Encabezado formal con datos del experto
   - Saludo formal dirigido al oficial de USCIS
   - Párrafo de presentación del experto y sus credenciales
   - Párrafo explicando cómo conoce al beneficiario
   - Descripción detallada del campo de expertise del beneficiario
   - Análisis de cada logro importante con contexto de por qué es extraordinario
   - Comparación con estándares del campo (por qué está por encima del promedio)
   - Declaración de impacto nacional/internacional
   - Conclusión con recomendación firme
   - Firma formal
7. Incluye referencias a criterios específicos de la visa (ej: para EB-1A, los 10 criterios de USCIS).
8. La carta debe estar en INGLÉS (es el idioma oficial para USCIS).

FORMATO DE OUTPUT:
Genera la carta como un documento markdown completo y profesional.

\`\`\`artifact:documento
{
  "titulo": "Expert Opinion Letter - [Nombre del Beneficiario]",
  "subtipo": "carta-experto",
  "contenido": "# Expert Opinion Letter\\n\\n[fecha]\\n\\nU.S. Citizenship and Immigration Services..."
}
\`\`\`

El campo "contenido" debe ser el markdown completo de la carta, escapado como string JSON.
La carta DEBE estar en inglés formal y legal.`

// ============================================================
// Build the user message from collected form data
// ============================================================
export interface VisaLetterData {
  beneficiaryName: string
  visaType: string
  beneficiaryField: string
  beneficiaryAchievements: string
  beneficiaryRole: string
  expertName: string
  expertTitle: string
  expertQualifications: string
  relationship: string
  impactStatement: string
  additionalInfo?: string
}

export function buildVisaLetterPrompt(data: VisaLetterData): string {
  return `Generate a comprehensive Expert Opinion Letter for a ${data.visaType} visa petition with the following details:

**BENEFICIARY INFORMATION:**
- Full Name: ${data.beneficiaryName}
- Visa Type: ${data.visaType}
- Field of Expertise: ${data.beneficiaryField}
- Current Role: ${data.beneficiaryRole}
- Key Achievements: ${data.beneficiaryAchievements}
- Impact of Work: ${data.impactStatement}

**EXPERT (LETTER AUTHOR) INFORMATION:**
- Full Name: ${data.expertName}
- Title/Position: ${data.expertTitle}
- Qualifications: ${data.expertQualifications}
- Relationship to Beneficiary: ${data.relationship}

${data.additionalInfo ? `**ADDITIONAL INFORMATION:**\n${data.additionalInfo}` : ''}

Please generate the full expert opinion letter following all formal requirements for USCIS. The letter must be persuasive, fact-based, and demonstrate that the beneficiary meets the criteria for the ${data.visaType} visa category.`
}
