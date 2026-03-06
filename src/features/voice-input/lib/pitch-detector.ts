/**
 * Detecta la frecuencia fundamental (pitch) de una señal de audio
 * usando autocorrelación. Útil para determinar género de voz.
 * 
 * Hombre: 85-170Hz | Mujer: 170-300Hz
 */
export function detectPitch(buf: Float32Array, sampleRate: number): number {
  let maxCorrelation = 0
  let bestOffset = -1
  const minPeriod = Math.floor(sampleRate / 300)
  const maxPeriod = Math.floor(sampleRate / 80)
  
  for (let offset = minPeriod; offset < maxPeriod && offset < buf.length / 2; offset++) {
    let correlation = 0
    for (let i = 0; i < buf.length / 2; i++) {
      correlation += buf[i] * buf[i + offset]
    }
    if (correlation > maxCorrelation) {
      maxCorrelation = correlation
      bestOffset = offset
    }
  }
  if (bestOffset > 0 && maxCorrelation > 0.01) {
    return sampleRate / bestOffset
  }
  return 0
}
