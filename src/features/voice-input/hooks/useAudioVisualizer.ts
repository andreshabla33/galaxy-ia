/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { detectPitch } from '../lib/pitch-detector'

// Declaraciones de tipos para la Web Speech API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
}

// Datos de frecuencia para la galaxia (accesibles por ref, sin causar re-renders)
export interface FrequencyData {
  bass: number;       // Graves (20-250Hz) — pulsación del core
  mid: number;        // Medios (250-2kHz) — ondulación de brazos
  treble: number;     // Agudos (2k-20kHz) — chispas/brillo
  volume: number;     // Volumen general normalizado
  raw: Float32Array;  // 8 bandas normalizadas para deformación detallada
  isMale: boolean;    // Detección de género por pitch de voz
}

export interface AudioVisualizerOptions {
  onSilenceStop?: () => void;
  silenceThreshold?: number;
  silenceTimeout?: number;
}

export interface AudioVisualizerData {
  volume: number;
  frequencyRef: React.RefObject<FrequencyData>;
  startListening: () => Promise<void>;
  stopListening: () => void;
  isRecording: boolean;
  error: string | null;
  transcript: string;
}

const EMPTY_FREQ: FrequencyData = {
  bass: 0, mid: 0, treble: 0, volume: 0,
  raw: new Float32Array(8),
  isMale: true,
}

export function useAudioVisualizer(options?: AudioVisualizerOptions): AudioVisualizerData {
  const { 
    onSilenceStop, 
    silenceThreshold = 0.06, 
    silenceTimeout = 2000 
  } = options ?? {}

  const [volume, setVolume] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [transcript, setTranscript] = useState<string>('')
  
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number>(0)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  const frequencyRef = useRef<FrequencyData>(EMPTY_FREQ)

  const silenceStartRef = useRef<number>(0)
  const hasSpokeRef = useRef(false)
  const onSilenceStopRef = useRef(onSilenceStop)
  onSilenceStopRef.current = onSilenceStop

  // Speech-aware detection: solo marcar "habló" cuando SpeechRecognition
  // produce texto real, no solo cuando el volumen sube (ruido de fondo)
  const hasRealSpeechRef = useRef(false)
  const lastTranscriptRef = useRef('')

  const pitchSamplesRef = useRef<number[]>([])

  const stopListening = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect()
      sourceRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch (e) { console.error("Error deteniendo reconocimiento", e) }
    }

    frequencyRef.current = EMPTY_FREQ
    silenceStartRef.current = 0
    hasSpokeRef.current = false
    hasRealSpeechRef.current = false
    lastTranscriptRef.current = ''
    pitchSamplesRef.current = []
    setIsRecording(false)
    setVolume(0)
  }, [])

  const startListening = useCallback(async () => {
    try {
      setError(null)
      setTranscript('')
      hasSpokeRef.current = false
      pitchSamplesRef.current = []

      // === INICIO PARALELO: SpeechRecognition + Audio al mismo tiempo ===
      // SpeechRecognition conecta con servidores de Google (latencia de red),
      // así que lo iniciamos ANTES de esperar getUserMedia.
      const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognitionCtor) {
        recognitionRef.current = new SpeechRecognitionCtor()
        if (recognitionRef.current) {
          recognitionRef.current.continuous = true
          recognitionRef.current.interimResults = true
          recognitionRef.current.lang = 'es-ES'

          recognitionRef.current.onresult = (event: any) => {
            let currentTranscript = ''
            for (let i = event.resultIndex; i < event.results.length; i++) {
              currentTranscript += event.results[i][0].transcript
            }
            setTranscript(currentTranscript)
            if (currentTranscript.trim().length > 0) {
              hasRealSpeechRef.current = true
              lastTranscriptRef.current = currentTranscript
            }
          }

          recognitionRef.current.onerror = (event: any) => {
            if (event.error !== 'aborted') {
              console.error('Error de reconocimiento de voz:', event.error)
            }
          }

          recognitionRef.current.start()
        }
      }

      // Marcar como grabando INMEDIATAMENTE para dar feedback visual rápido
      setIsRecording(true)
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          noiseSuppression: true,
          echoCancellation: true,
          autoGainControl: true,
        },
        video: false,
      })
      streamRef.current = stream

      const AudioContext = window.AudioContext || (window as any).webkitAudioContext
      audioContextRef.current = new AudioContext()
      analyserRef.current = audioContextRef.current.createAnalyser()
      
      analyserRef.current.fftSize = 2048
      analyserRef.current.smoothingTimeConstant = 0.8
      const bufferLength = analyserRef.current.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      const timeDomainData = new Float32Array(analyserRef.current.fftSize)

      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream)

      // Cadena de filtrado: highpass → lowpass → compressor → analyser
      const highpass = audioContextRef.current.createBiquadFilter()
      highpass.type = 'highpass'
      highpass.frequency.value = 85
      highpass.Q.value = 0.7

      const lowpass = audioContextRef.current.createBiquadFilter()
      lowpass.type = 'lowpass'
      lowpass.frequency.value = 3000
      lowpass.Q.value = 0.7

      const compressor = audioContextRef.current.createDynamicsCompressor()
      compressor.threshold.value = -35
      compressor.knee.value = 5
      compressor.ratio.value = 12
      compressor.attack.value = 0.003
      compressor.release.value = 0.25

      sourceRef.current.connect(highpass)
      highpass.connect(lowpass)
      lowpass.connect(compressor)
      compressor.connect(analyserRef.current)

      const updateAudio = () => {
        if (!analyserRef.current || !audioContextRef.current) return

        analyserRef.current.getByteFrequencyData(dataArray)

        const freqBins = bufferLength
        const third = Math.floor(freqBins / 3)
        let bassSum = 0, midSum = 0, trebleSum = 0, totalSum = 0

        for (let i = 0; i < freqBins; i++) {
          const val = dataArray[i]
          totalSum += val
          if (i < third) bassSum += val
          else if (i < third * 2) midSum += val
          else trebleSum += val
        }

        const bass = (bassSum / third) / 255
        const mid = (midSum / third) / 255
        const treble = (trebleSum / (freqBins - third * 2)) / 255
        const vol = (totalSum / freqBins / 255) * 2

        const bandSize = Math.floor(freqBins / 8)
        const raw = new Float32Array(8)
        for (let b = 0; b < 8; b++) {
          let bandSum = 0
          for (let i = b * bandSize; i < (b + 1) * bandSize; i++) {
            bandSum += dataArray[i]
          }
          raw[b] = (bandSum / bandSize) / 255
        }

        let isMale = frequencyRef.current?.isMale ?? true
        if (vol > 0.1) {
          analyserRef.current.getFloatTimeDomainData(timeDomainData)
          const pitch = detectPitch(timeDomainData, audioContextRef.current.sampleRate)
          if (pitch > 0) {
            pitchSamplesRef.current.push(pitch)
            const recent = pitchSamplesRef.current.slice(-30)
            const avgPitch = recent.reduce((a, b) => a + b, 0) / recent.length
            isMale = avgPitch < 170
          }
        }

        frequencyRef.current = { bass, mid, treble, volume: vol, raw, isMale }
        setVolume(prev => prev + (vol - prev) * 0.2)

        const now = Date.now()
        if (vol > silenceThreshold && hasRealSpeechRef.current) {
          hasSpokeRef.current = true
          silenceStartRef.current = now
        } else if (hasSpokeRef.current && silenceStartRef.current > 0) {
          if (now - silenceStartRef.current > silenceTimeout) {
            onSilenceStopRef.current?.()
            return
          }
        }

        animationFrameRef.current = requestAnimationFrame(updateAudio)
      }

      updateAudio()

    } catch (err: any) {
      console.error('Error accediendo al micrófono:', err)
      setError('No se pudo acceder al micrófono. Por favor, revisa los permisos.')
      setIsRecording(false)
    }
  }, [silenceThreshold, silenceTimeout])

  useEffect(() => {
    return () => { stopListening() }
  }, [stopListening])

  return { volume, frequencyRef, startListening, stopListening, isRecording, error, transcript }
}
