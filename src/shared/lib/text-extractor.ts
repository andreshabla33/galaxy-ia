/**
 * Utility to extract text from various file formats.
 * Supports: .txt, .md, .json by default.
 * Supports: .pdf via pdfjs-dist.
 */

export async function extractTextFromFile(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'txt':
    case 'md':
      return await file.text();
    
    case 'json':
      try {
        const text = await file.text();
        const json = JSON.parse(text);
        return JSON.stringify(json, null, 2);
      } catch {
        throw new Error('Formato JSON inválido');
      }

    case 'pdf':
      return await extractTextFromPdf(file);

    default:
      // Intentar leer como texto si no se reconoce la extensión pero parece texto
      if (file.type.startsWith('text/')) {
        return await file.text();
      }
      throw new Error(`Extensión .${extension} no soportada para análisis directo.`);
  }
}

async function extractTextFromPdf(file: File): Promise<string> {
  try {
    // Usar la versión 3.x que es la más estable para Next.js 14 y evita errores de ESM/Object.defineProperty
    const pdfjsLib = await import('pdfjs-dist/build/pdf');
    
    // Configurar el worker usando la versión 3.x
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ 
      data: arrayBuffer,
      // Support for special characters (accents, etc.) via CDN cmaps
      cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
      cMapPacked: true,
    });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n\n';
    }
    
    return fullText.trim();
  } catch (err) {
    console.error('Error al extraer texto del PDF:', err);
    const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
    if (errorMessage.includes('PasswordException')) {
      throw new Error('El PDF está protegido por contraseña y no se puede analizar.');
    }
    throw new Error(`Error al leer el PDF: ${errorMessage}. Intenta con otro archivo o conviértelo a TXT.`);
  }
}
