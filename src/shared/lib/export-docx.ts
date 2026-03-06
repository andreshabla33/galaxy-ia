interface DocumentData {
  markdown?: string
  toc?: string[]
  word_count?: number
}

export async function exportToDocx(data: DocumentData, titulo: string) {
  // Dynamic imports — evita node:fs error en webpack
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } = await import('docx')
  const { saveAs } = await import('file-saver')

  const markdown = data.markdown || ''

  // --- Inline formatting parser ---
  function parseInline(text: string) {
    const runs: InstanceType<typeof TextRun>[] = []
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
    for (const part of parts) {
      if (part.startsWith('**') && part.endsWith('**')) {
        runs.push(new TextRun({ text: part.slice(2, -2), bold: true, size: 20, font: 'Arial' }))
      } else if (part.startsWith('*') && part.endsWith('*')) {
        runs.push(new TextRun({ text: part.slice(1, -1), italics: true, size: 20, font: 'Arial' }))
      } else if (part.startsWith('`') && part.endsWith('`')) {
        runs.push(new TextRun({ text: part.slice(1, -1), font: 'Consolas', size: 18, color: '6366F1' }))
      } else if (part) {
        runs.push(new TextRun({ text: part, size: 20, font: 'Arial', color: '374151' }))
      }
    }
    return runs.length > 0 ? runs : [new TextRun({ text, size: 20, font: 'Arial' })]
  }

  // --- Markdown → Paragraphs ---
  const lines = markdown.split('\n')
  const paragraphs: InstanceType<typeof Paragraph>[] = []
  let inCodeBlock = false
  let codeBuffer: string[] = []

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: codeBuffer.join('\n'), font: 'Consolas', size: 18, color: '374151' })],
          spacing: { before: 100, after: 100 },
          shading: { fill: 'F9FAFB' },
        }))
        codeBuffer = []
        inCodeBlock = false
      } else {
        inCodeBlock = true
      }
      continue
    }
    if (inCodeBlock) { codeBuffer.push(line); continue }
    if (line.trim() === '') { paragraphs.push(new Paragraph({ spacing: { before: 60, after: 60 } })); continue }

    if (line.startsWith('# ')) {
      paragraphs.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: line.replace(/^# /, ''), bold: true, size: 32, color: '111827' })], spacing: { before: 240, after: 120 } }))
      continue
    }
    if (line.startsWith('## ')) {
      paragraphs.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: line.replace(/^## /, ''), bold: true, size: 26, color: '1F2937' })], spacing: { before: 200, after: 100 } }))
      continue
    }
    if (line.startsWith('### ')) {
      paragraphs.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text: line.replace(/^### /, ''), bold: true, size: 22, color: '374151' })], spacing: { before: 160, after: 80 } }))
      continue
    }
    if (line.trim() === '---' || line.trim() === '***') {
      paragraphs.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' } }, spacing: { before: 120, after: 120 } }))
      continue
    }
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      paragraphs.push(new Paragraph({ bullet: { level: 0 }, children: parseInline(line.trim().replace(/^[-*] /, '')), spacing: { before: 40, after: 40 } }))
      continue
    }
    if (line.trim().startsWith('> ')) {
      paragraphs.push(new Paragraph({ children: [new TextRun({ text: line.trim().replace(/^> /, ''), italics: true, color: '6B7280', size: 20 })], indent: { left: 720 }, spacing: { before: 80, after: 80 } }))
      continue
    }
    paragraphs.push(new Paragraph({ children: parseInline(line), spacing: { before: 60, after: 60 } }))
  }

  // --- Build document ---
  const doc = new Document({
    creator: 'Galaxy AI Canvas',
    title: titulo,
    sections: [{
      properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
      children: [
        new Paragraph({ spacing: { before: 2000 } }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: titulo, bold: true, size: 48, color: '111827', font: 'Arial' })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Generado por Galaxy AI Canvas', size: 20, color: '9CA3AF', font: 'Arial' })], spacing: { before: 200 } }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }), size: 18, color: '9CA3AF', font: 'Arial' })], spacing: { before: 100 } }),
        new Paragraph({ spacing: { before: 600 } }),
        new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: '6366F1' } }, spacing: { after: 200 } }),
        ...paragraphs,
      ],
    }],
  })

  const blob = await Packer.toBlob(doc)
  const filename = titulo.replace(/\s+/g, '-').toLowerCase()
  saveAs(blob, `${filename}.docx`)
}
