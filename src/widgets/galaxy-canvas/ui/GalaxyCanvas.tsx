'use client'

import React, { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { FrequencyData } from '@/features/voice-input'
import type { ArtifactType } from '@/shared/config/artifact-prompts'

// Paletas de color por tipo de artefacto
const ARTIFACT_PALETTES: Record<string, { hot: string; active: string }> = {
  default:      { hot: '#d946ef', active: '#22d3ee' },  // Fuchsia + Cyan (original)
  documento:    { hot: '#3b82f6', active: '#60a5fa' },  // Blue tones
  presentacion: { hot: '#a855f7', active: '#c084fc' },  // Purple tones
  codigo:       { hot: '#22c55e', active: '#4ade80' },  // Green tones
  imagen:       { hot: '#f59e0b', active: '#fbbf24' },  // Amber/Gold tones
}

// Galaxia grande que llena la pantalla + polvo cósmico disperso
const GALAXY_PARTICLES = 10000
const DUST_PARTICLES = 5000
const TOTAL_PARTICLES = GALAXY_PARTICLES + DUST_PARTICLES
const BRANCHES = 5
const GALAXY_RADIUS = 5

// ============================================================
// COSMOS: Galaxia orgánica + polvo cósmico + cursor interactivo
// ============================================================
interface CosmosParticlesProps {
  isListening: boolean;
  volume: number;
  frequencyRef: React.RefObject<FrequencyData>;
  mouseRef: React.RefObject<{ x: number; y: number }>;
  artifactType?: ArtifactType | null;
}

function CosmosParticles({ isListening, volume, frequencyRef, mouseRef, artifactType }: CosmosParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null!)
  const { camera } = useThree()

  // Posición 3D del mouse proyectada al plano de la galaxia
  const mouseWorld = useRef(new THREE.Vector3())
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const mousePlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), [])
  const mouseNDC = useMemo(() => new THREE.Vector2(), [])

  const galaxyData = useMemo(() => {
    const pos = new Float32Array(TOTAL_PARTICLES * 3)
    const col = new Float32Array(TOTAL_PARTICLES * 3)
    const sizes = new Float32Array(TOTAL_PARTICLES)
    const radii = new Float32Array(TOTAL_PARTICLES)
    const angles = new Float32Array(TOTAL_PARTICLES)

    // Paleta vibrante como imagen de referencia: yellow core → cyan → blue → purple → pink
    const cCoreCenter = new THREE.Color('#fef08a') // Amarillo brillante
    const cCoreWhite = new THREE.Color('#ffffff')  // Blanco puro
    const cCyan = new THREE.Color('#22d3ee')       // Cyan brillante
    const cBlue = new THREE.Color('#3b82f6')       // Azul
    const cPurple = new THREE.Color('#8b5cf6')     // Violeta
    const cPink = new THREE.Color('#d946ef')       // Fuchsia
    const cDeepPurple = new THREE.Color('#581c87')  // Morado profundo (outer)

    // Colores para polvo cósmico
    const cDust1 = new THREE.Color('#6366f1')
    const cDust2 = new THREE.Color('#3b82f6')
    const cDust3 = new THREE.Color('#8b5cf6')
    const cDustPink = new THREE.Color('#d946ef')

    // --- GALAXIA CENTRAL ---
    for (let i = 0; i < GALAXY_PARTICLES; i++) {
      const i3 = i * 3
      const radius = Math.pow(Math.random(), 1.5) * GALAXY_RADIUS
      const branch = i % BRANCHES
      const branchAngle = (branch / BRANCHES) * Math.PI * 2
      const spin = radius * 1.8

      const scatter = (0.2 + Math.pow(Math.random(), 2) * 0.6) * (radius / GALAXY_RADIUS)
      const rx = (Math.random() - 0.5) * scatter * 2.0
      const ry = (Math.random() - 0.5) * scatter * 1.8
      const rz = (Math.random() - 0.5) * scatter * 2.0

      pos[i3] = Math.cos(branchAngle + spin) * radius + rx
      pos[i3 + 1] = ry
      pos[i3 + 2] = Math.sin(branchAngle + spin) * radius + rz

      radii[i] = radius
      angles[i] = branchAngle + spin

      // Color gradiente vibrante según distancia al centro
      const t = radius / GALAXY_RADIUS
      let mixed: THREE.Color
      if (t < 0.06) {
        // Core center: amarillo → blanco (muy brillante)
        mixed = cCoreCenter.clone().lerp(cCoreWhite, t / 0.06)
      } else if (t < 0.15) {
        // Inner: blanco → cyan
        mixed = cCoreWhite.clone().lerp(cCyan, (t - 0.06) / 0.09)
      } else if (t < 0.35) {
        // Cyan → azul brillante
        mixed = cCyan.clone().lerp(cBlue, (t - 0.15) / 0.2)
      } else if (t < 0.55) {
        // Azul → violeta
        mixed = cBlue.clone().lerp(cPurple, (t - 0.35) / 0.2)
      } else if (t < 0.75) {
        // Violeta → fuchsia
        mixed = cPurple.clone().lerp(cPink, (t - 0.55) / 0.2)
      } else {
        // Fuchsia → morado profundo
        mixed = cPink.clone().lerp(cDeepPurple, (t - 0.75) / 0.25)
      }

      // Boost de brillo aleatorio — algunas partículas brillan extra
      const brightnessBoost = Math.random() < 0.08 ? 1.5 : 1.0
      col[i3] = Math.min(mixed.r * brightnessBoost, 1)
      col[i3 + 1] = Math.min(mixed.g * brightnessBoost, 1)
      col[i3 + 2] = Math.min(mixed.b * brightnessBoost, 1)

      // Tamaño variable: grande en el core, pequeño en los bordes
      // + estrellas brillantes aleatorias
      const isBrightStar = Math.random() < 0.04
      if (t < 0.1) {
        sizes[i] = (0.08 + Math.random() * 0.12) * (isBrightStar ? 2.0 : 1.0)
      } else if (t < 0.35) {
        sizes[i] = (0.04 + Math.random() * 0.06) * (isBrightStar ? 1.8 : 1.0)
      } else if (t < 0.6) {
        sizes[i] = (0.025 + Math.random() * 0.04) * (isBrightStar ? 1.6 : 1.0)
      } else {
        sizes[i] = (0.015 + Math.random() * 0.025) * (isBrightStar ? 1.5 : 1.0)
      }
    }

    // --- POLVO CÓSMICO / ESTRELLAS DE FONDO (llenan toda la pantalla) ---
    for (let i = GALAXY_PARTICLES; i < TOTAL_PARTICLES; i++) {
      const i3 = i * 3
      // Volumen amplio para cubrir toda la vista de la cámara
      pos[i3] = (Math.random() - 0.5) * 35
      pos[i3 + 1] = (Math.random() - 0.5) * 18
      pos[i3 + 2] = (Math.random() - 0.5) * 35

      radii[i] = Math.sqrt(pos[i3] ** 2 + pos[i3 + 2] ** 2)
      angles[i] = Math.atan2(pos[i3 + 2], pos[i3])

      // Mezcla variada de colores cósmicos
      const dustColors = [cDust1, cDust2, cDust3, cDustPink, cCyan, cPurple]
      const dc = dustColors[Math.floor(Math.random() * dustColors.length)]
      const rnd = Math.random()
      const isBrightStar = rnd < 0.15
      const isMedium = rnd < 0.4
      const brightness = isBrightStar ? 0.7 + Math.random() * 0.3
        : isMedium ? 0.3 + Math.random() * 0.35
        : 0.12 + Math.random() * 0.25
      col[i3] = dc.r * brightness
      col[i3 + 1] = dc.g * brightness
      col[i3 + 2] = dc.b * brightness

      sizes[i] = isBrightStar ? 0.04 + Math.random() * 0.06
        : isMedium ? 0.015 + Math.random() * 0.03
        : 0.008 + Math.random() * 0.018
    }

    return { positions: pos, colors: col, sizes, radii, angles }
  }, [])

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(galaxyData.positions.slice(), 3))
    geo.setAttribute('color', new THREE.BufferAttribute(galaxyData.colors.slice(), 3))
    geo.setAttribute('aSize', new THREE.BufferAttribute(galaxyData.sizes.slice(), 1))
    return geo
  }, [galaxyData])

  // Custom ShaderMaterial: per-particle sizes + soft glow circles
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uSizeScale: { value: 1.0 },
      },
      vertexShader: /* glsl */`
        attribute float aSize;
        varying vec3 vColor;
        varying float vSize;
        uniform float uSizeScale;
        void main() {
          vColor = color;
          vSize = aSize;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uSizeScale * (300.0 / -mvPosition.z);
          gl_PointSize = max(gl_PointSize, 1.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */`
        varying vec3 vColor;
        varying float vSize;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          // Soft circle con glow exponencial — simula bloom sin post-processing
          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
          float glow = exp(-dist * 5.0) * 0.6;
          float core = exp(-dist * 12.0) * 0.4; // Bright white core
          vec3 finalColor = vColor * (alpha + glow) + vec3(core);
          gl_FragColor = vec4(finalColor, alpha * 0.9 + glow * 0.5);
        }
      `,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  }, [])

  const pointsObject = useMemo(() => {
    return new THREE.Points(geometry, material)
  }, [geometry, material])

  // Colores dinámicos según tipo de artefacto
  const palette = ARTIFACT_PALETTES[artifactType || 'default'] || ARTIFACT_PALETTES.default
  const hotColor = useMemo(() => new THREE.Color(palette.hot), [palette.hot])
  const activeColor = useMemo(() => new THREE.Color(palette.active), [palette.active])
  const tmpCol = useMemo(() => new THREE.Color(), [])

  // Smoothed audio para transiciones suaves
  const smoothBass = useRef(0)
  const smoothMid = useRef(0)
  const smoothTreble = useRef(0)
  const smoothVol = useRef(0)

  // Para transformar mouse de world space → local space del Points
  const inverseMatrix = useMemo(() => new THREE.Matrix4(), [])
  const mouseLocal = useMemo(() => new THREE.Vector3(), [])

  useFrame((state) => {
    if (!pointsRef.current) return
    const time = state.clock.getElapsedTime()
    const positions = geometry.attributes.position.array as Float32Array
    const colors = geometry.attributes.color.array as Float32Array

    // --- Proyectar mouse al plano Y=0 (mundo 3D) ---
    // Usamos mouseRef del window event (no R3F pointer, que el overlay bloquea)
    const mc = mouseRef.current ?? { x: 0, y: 0 }
    mouseNDC.set(mc.x, mc.y)
    raycaster.setFromCamera(mouseNDC, camera)
    const intersect = new THREE.Vector3()
    raycaster.ray.intersectPlane(mousePlane, intersect)
    if (intersect) {
      mouseWorld.current.lerp(intersect, 0.12)
    }
    // Transformar mouse position al espacio local del Points (que rota)
    inverseMatrix.copy(pointsRef.current.matrixWorld).invert()
    mouseLocal.copy(mouseWorld.current).applyMatrix4(inverseMatrix)
    const mx = mouseLocal.x
    const mz = mouseLocal.z

    const freq = frequencyRef.current
    const bass = freq?.bass ?? 0
    const mid = freq?.mid ?? 0
    const treble = freq?.treble ?? 0
    const rawBands = freq?.raw

    // Suavizar valores de audio
    smoothBass.current += (bass - smoothBass.current) * 0.18
    smoothMid.current += (mid - smoothMid.current) * 0.18
    smoothTreble.current += (treble - smoothTreble.current) * 0.15
    smoothVol.current += (volume - smoothVol.current) * 0.12
    const sb = smoothBass.current
    const sm = smoothMid.current
    const st = smoothTreble.current
    const sv = smoothVol.current

    // Rotación: suave, apenas acelera con la voz
    const rotSpeed = isListening ? 0.0015 + Math.min(sb * 0.003, 0.005) : 0.0015
    pointsRef.current.rotation.y += rotSpeed

    for (let i = 0; i < TOTAL_PARTICLES; i++) {
      const i3 = i * 3
      const isGalaxy = i < GALAXY_PARTICLES
      const baseR = galaxyData.radii[i]
      const baseAngle = galaxyData.angles[i]
      const t = isGalaxy ? baseR / GALAXY_RADIUS : 1

      const baseY = galaxyData.positions[i3 + 1]

      let px: number, py: number, pz: number

      if (isGalaxy) {
        // ======================================================
        // FÓRMULA UNIFICADA — audio orgánico con mapLinear + clamp
        // Técnica de Codrops: mapear audio a rangos controlados,
        // usar power curves para easing suave, time lento para ondas.
        // ======================================================

        // Mapear audio a rangos suaves (evita movimiento errático)
        const bassEffect = Math.min(sb * sb, 1.0) // Power curve: suaviza picos
        const midEffect = Math.min(sm * sm, 1.0)
        const trebleEffect = Math.min(st * 1.5, 1.0)

        // 1. PULSO RADIAL (bass) — latido suave como corazón
        //    Sin(time*2) da el ritmo del pulso, bass controla amplitud
        const heartbeat = Math.sin(time * 2) * 0.5 + 0.5 // 0-1 oscillation
        const bassPulse = bassEffect * 0.6 * heartbeat * (1 - t * 0.3)
        const pulseR = baseR + bassPulse

        // 2. ONDA ESPIRAL (mid) — onda lenta que recorre los brazos
        const spiralPhase = baseAngle * 2 + time * 1.5 + baseR * 1.5
        const spiralWave = Math.sin(spiralPhase) * midEffect * 0.4 * t
        const finalR = pulseR + spiralWave

        // 3. TORSIÓN ANGULAR — suave, controlada
        const twist = midEffect * 0.1 * Math.sin(time * 1.0 + t * 3)
        const finalAngle = baseAngle + twist

        // 4. ELEVACIÓN VERTICAL — onda suave tipo respiración
        //    Ondas lentas que crean efecto de "respiración" 3D
        const breathPhase = time * 1.5 + baseAngle * 1.5 + baseR * 2
        const verticalWave = Math.sin(breathPhase) * trebleEffect * 0.35 * t
        //    Latido suave vertical con bass
        const bassLift = Math.sin(time * 2 + baseR * 1.5) * bassEffect * 0.2
        //    Onda media suave
        const midLift = Math.cos(time * 1.2 + baseAngle * 2) * midEffect * 0.15 * (1 - t * 0.5)

        // 5. DEFORMACIÓN POR BANDAS — sutil y suave
        const bandIdx = rawBands ? Math.min(Math.floor(t * 8), 7) : 0
        const bandVal = rawBands ? rawBands[bandIdx] : 0
        const bandSmooth = bandVal * bandVal // Power curve
        const bandDeform = Math.sin(time * 2 + i * 0.003) * bandSmooth * 0.1

        // Posición final: polar → cartesianas + deformaciones suaves
        px = Math.cos(finalAngle) * finalR + bandDeform
        py = baseY + verticalWave + bassLift + midLift
        pz = Math.sin(finalAngle) * finalR + Math.sin(time * 1.5 + baseAngle) * bandSmooth * 0.06

        // Respiración orgánica (siempre, incluso sin voz)
        px += Math.sin(time * 0.4 + i * 0.0003) * 0.025
        py += Math.sin(time * 0.5 + i * 0.0005) * 0.015
        pz += Math.cos(time * 0.35 + i * 0.0004) * 0.025

      } else {
        // Polvo cósmico — solo respiración suave
        const baseX = galaxyData.positions[i3]
        const baseZ = galaxyData.positions[i3 + 2]
        px = baseX + Math.sin(time * 0.3 + i * 0.0003) * 0.008
        py = baseY + Math.sin(time * 0.4 + i * 0.0005) * 0.006
        pz = baseZ + Math.cos(time * 0.25 + i * 0.0004) * 0.008
      }

      // ======================================================
      // REPULSIÓN DEL CURSOR — partículas se apartan del mouse
      // (opera en local space, funciona con la rotación)
      // ======================================================
      const dx = px - mx
      const dz = pz - mz
      const distSq = dx * dx + dz * dz
      const repulsionRadius = 1.5
      const repulsionRadiusSq = repulsionRadius * repulsionRadius
      if (distSq < repulsionRadiusSq && distSq > 0.01) {
        const dist = Math.sqrt(distSq)
        const force = Math.pow(1 - dist / repulsionRadius, 2) * 0.6
        const nx = dx / dist
        const nz = dz / dist
        px += nx * force
        py += Math.abs(Math.sin(time * 3 + i * 0.1)) * force * 0.15
        pz += nz * force
      }

      positions[i3] = px
      positions[i3 + 1] = py
      positions[i3 + 2] = pz

      // ======================================================
      // COLORES DINÁMICOS
      // ======================================================
      if (isGalaxy && sv > 0.02) {
        // Con voz: colores pasan de indigo/violeta a azul/rosa
        const heat = sv * 0.7 + sb * 0.4
        const bandIdx = rawBands ? Math.min(Math.floor(t * 8), 7) : 0
        const bandVal = rawBands ? rawBands[bandIdx] : 0

        tmpCol.setRGB(galaxyData.colors[i3], galaxyData.colors[i3 + 1], galaxyData.colors[i3 + 2])
        // Core se vuelve azul brillante, bordes se ponen rosa
        if (t < 0.4) {
          tmpCol.lerp(activeColor, heat * 0.5)
        } else {
          tmpCol.lerp(hotColor, (heat + bandVal) * 0.4)
        }
        colors[i3] += (tmpCol.r - colors[i3]) * 0.08
        colors[i3 + 1] += (tmpCol.g - colors[i3 + 1]) * 0.08
        colors[i3 + 2] += (tmpCol.b - colors[i3 + 2]) * 0.08
      } else {
        // Sin voz: volver a colores base suavemente
        colors[i3] += (galaxyData.colors[i3] - colors[i3]) * 0.02
        colors[i3 + 1] += (galaxyData.colors[i3 + 1] - colors[i3 + 1]) * 0.02
        colors[i3 + 2] += (galaxyData.colors[i3 + 2] - colors[i3 + 2]) * 0.02
      }
    }

    geometry.attributes.position.needsUpdate = true
    geometry.attributes.color.needsUpdate = true

    // Escala de partículas: crecen cuando hablas fuerte (via uniform del ShaderMaterial)
    const targetScale = 1.0 + sv * 0.5 + sb * 0.4
    const currentScale = material.uniforms.uSizeScale.value
    material.uniforms.uSizeScale.value = THREE.MathUtils.lerp(currentScale, targetScale, 0.06)

    // Escala general: la galaxia "respira" con el volumen
    const s = 1 + sv * 0.12 + sb * 0.05
    pointsRef.current.scale.set(
      THREE.MathUtils.lerp(pointsRef.current.scale.x, s, 0.04),
      THREE.MathUtils.lerp(pointsRef.current.scale.y, s, 0.04),
      THREE.MathUtils.lerp(pointsRef.current.scale.z, s, 0.04)
    )
  })

  return <primitive ref={pointsRef} object={pointsObject} />
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
interface GalaxyCanvasProps {
  isListening?: boolean;
  volume?: number;
  frequencyRef?: React.RefObject<FrequencyData>;
  artifactType?: ArtifactType | null;
}

const defaultFreq: FrequencyData = {
  bass: 0, mid: 0, treble: 0, volume: 0,
  raw: new Float32Array(8),
  isMale: true,
}

export default function GalaxyCanvas({
  isListening = false,
  volume = 0,
  frequencyRef,
  artifactType,
}: GalaxyCanvasProps) {
  const fallbackRef = useRef<FrequencyData>(defaultFreq)
  const freqRef = frequencyRef ?? fallbackRef

  // Trackear mouse via window (el overlay z-10 bloquea eventos del Canvas)
  const mouseRef = useRef({ x: 0, y: 0 })
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      // Convertir a NDC (-1 a 1) para el raycaster
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1
      mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1
    }
    window.addEventListener('mousemove', handler)
    return () => window.removeEventListener('mousemove', handler)
  }, [])

  const [frameloop, setFrameloop] = useState<'always' | 'never'>('always')
  useEffect(() => {
    const handler = () => setFrameloop(document.hidden ? 'never' : 'always')
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [])

  return (
    <div className="fixed inset-0 w-screen h-screen" style={{ zIndex: 0 }}>
      <Canvas
        frameloop={frameloop}
        camera={{ position: [0, 1.2, 4.5], fov: 60 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: false,
          alpha: false,
          stencil: false,
          powerPreference: 'high-performance',
        }}
        style={{ background: '#000' }}
      >
        <CosmosParticles
          isListening={isListening}
          volume={volume}
          frequencyRef={freqRef}
          mouseRef={mouseRef}
          artifactType={artifactType}
        />
      </Canvas>
    </div>
  )
}
