import { createNoise2D, createNoise3D, createNoise4D } from 'simplex-noise'
import { Grid, type GridConfig } from './grid'
import { Cell, type CellConfig } from './cell'
import { Color, type ColorInput } from './color'

// Vector class for 2D/3D operations
export class Vec {
  x: number
  y: number
  z: number
  m: number // Magnitude

  constructor(x: number, y: number, z: number = 0) {
    this.x = x
    this.y = y
    this.z = z
    this.m = Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2)
  }

  norm(): Vec {
    const xn = this.x / this.m
    const yn = this.y / this.m
    const zn = this.z / this.m
    return new Vec(xn, yn, zn)
  }

  add(ov: Vec): Vec {
    const xn = this.x + ov.x
    const yn = this.y + ov.y
    const zn = this.z + ov.z
    return new Vec(xn, yn, zn)
  }

  sub(ov: Vec): Vec {
    const xn = this.x - ov.x
    const yn = this.y - ov.y
    const zn = this.z - ov.z
    return new Vec(xn, yn, zn)
  }

  cross(ov: Vec): Vec {
    const xn = this.y * ov.z - this.z * ov.y
    const yn = this.z * ov.x - this.x * ov.z
    const zn = this.x * ov.y - this.y * ov.x
    return new Vec(xn, yn, zn)
  }

  dot(ov: Vec): number {
    return this.x * ov.x + this.y * ov.y + this.z * ov.z
  }

  ang(ov: Vec): number {
    return Math.acos(this.norm().dot(ov.norm()) / (this.norm().m * ov.norm().m))
  }

  lerp(ov: Vec, t: number): Vec {
    const xn = (1 - t) * this.x + ov.x * t
    const yn = (1 - t) * this.y + ov.y * t
    const zn = (1 - t) * this.z + ov.z * t
    return new Vec(xn, yn, zn)
  }

  mid(ov: Vec): Vec {
    const xn = (this.x + ov.x) / 2
    const yn = (this.y + ov.y) / 2
    const zn = (this.z + ov.z) / 2
    return new Vec(xn, yn, zn)
  }

  /** 2D left-perpendicular: rotates this vector 90° CCW. Useful for normals, offsets, arrow heads. */
  perp(): Vec {
    return new Vec(-this.y, this.x)
  }

  /** Rotates this vector by `angle` radians CCW around the origin. For the common 90° case prefer `perp()`. */
  rot(angle: number): Vec {
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    return new Vec(this.x * cos - this.y * sin, this.x * sin + this.y * cos)
  }
}

// ---------------------------------------------------------------------------
// Bezier math — pure functions, Vec only, no seed/noise dependency
// ---------------------------------------------------------------------------

/**
 * Control point for a quadratic bezier segment.
 * Places a handle perpendicular to the midpoint of the segment a→b,
 * offset by tension `t` (sign controls side) and pivot position `d` along the segment.
 */
export function quadBezControlPoint(a: Vec, b: Vec, t = 0.5, d = 0.5): Vec {
  const delta = b.sub(a)
  const pivot = a.lerp(b, d)
  const perp = delta.norm().perp()
  const amp = t * (delta.m / 2)
  return new Vec(pivot.x + amp * perp.x, pivot.y + amp * perp.y)
}

/**
 * Control-point pair for the cubic spline segment arriving at p1, given its neighbors p0 and p2.
 * Returns [cpIn, cpOut] — the incoming and outgoing handles for p1.
 * Algorithm: Scaled Innovation (http://scaledinnovation.com/analytics/splines/aboutSplines.html)
 */
export function splineControlPoints(p0: Vec, p1: Vec, p2: Vec, t: number): [Vec, Vec] {
  const d01 = Math.sqrt((p1.x - p0.x) ** 2 + (p1.y - p0.y) ** 2)
  const d12 = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2)
  const denom = d01 + d12
  if (denom <= 1e-9) return [new Vec(p1.x, p1.y), new Vec(p1.x, p1.y)]
  const fa = (t * d01) / denom
  const fb = (t * d12) / denom
  return [
    new Vec(p1.x - fa * (p2.x - p0.x), p1.y - fa * (p2.y - p0.y)),
    new Vec(p1.x + fb * (p2.x - p0.x), p1.y + fb * (p2.y - p0.y)),
  ]
}

/**
 * Debug geometry for a quadratic bezier path — returns one handle record per segment.
 * Each record carries the two anchor points and the control point between them,
 * mirroring exactly what Path.buildQuadBez() passes to the SVG S command.
 */
export function quadBezHandles(
  pts: Vec[],
  t: number,
  d: number
): Array<{ a: Vec; cp: Vec; b: Vec }> {
  const out: Array<{ a: Vec; cp: Vec; b: Vec }> = []
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!
    const b = pts[i]!
    out.push({ a, cp: quadBezControlPoint(a, b, t, d), b })
  }
  return out
}

/**
 * Debug geometry for a cubic spline path — returns one handle record per anchor point,
 * including the incoming (cpIn) and outgoing (cpOut) control point handles.
 * Mirrors exactly what Path.buildSpline() uses for its C commands.
 */
export function splineHandles(
  pts: Vec[],
  t: number
): Array<{ pt: Vec; cpIn: Vec; cpOut: Vec }> {
  return pts.map((pt, i) => {
    const prev = pts[(i - 1 + pts.length) % pts.length]!
    const next = pts[(i + 1) % pts.length]!
    const [cpIn, cpOut] = splineControlPoints(prev, pt, next, t)
    return { pt, cpIn, cpOut }
  })
}

// ---------------------------------------------------------------------------

export type DivLengthMode =
  | 'uniform'
  | 'randomGaps'
  | 'randomSorted'
  | 'gapAscending'
  | 'gapDescending'
  | 'curve'
  | 'fibonacci'

export interface DivLengthCurveOptions {
  kind: 'pow' | 'log' | 'exp'
  strength?: number
  invert?: boolean
}

export interface DivLengthOptions {
  includeEndpoints?: boolean
  mode?: DivLengthMode
  rng?: () => number
  curve?: DivLengthCurveOptions
  minSegmentRatio?: number
  minSegmentLength?: number
}

type DivLengthArg = boolean | DivLengthOptions

// Generative art utilities available to all projects
export interface GenerativeUtils {
  seed: {
    current: string
    set: (seed: string) => void
    reset: () => void
    random: () => number
    randomRange: (min: number, max: number) => number
    randomInt: (min: number, max: number) => number
    coinToss: (chance?: number) => boolean
  }
  noise: {
    simplex2D: (x: number, y: number) => number
    simplex3D: (x: number, y: number, z: number) => number
    simplex4D: (x: number, y: number, z: number, w: number) => number
    perlin2D: (x: number, y: number) => number
    perlin3D: (x: number, y: number, z: number) => number
    // Deterministic float in [0, 1) for an arbitrary key tuple.
    // Seed-dependent and order-independent — safe for toggleable sketches.
    cell: (...keys: number[]) => number
  }
  math: {
    map: (value: number, start1: number, stop1: number, start2: number, stop2: number) => number
    lerp: (start: number, stop: number, amt: number) => number
    constrain: (n: number, low: number, high: number) => number
    clamp: (n: number, low: number, high: number) => number
    norm: (value: number, start: number, stop: number) => number
    dist: (x1: number, y1: number, x2: number, y2: number) => number
    dist3D: (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number) => number
    rad: (deg: number) => number
    deg: (rad: number) => number
    divLength: {
      (a: Vec, b: Vec, nSeg: number, incStartEnd?: boolean): Vec[]
      (a: Vec, b: Vec, nSeg: number, options?: DivLengthOptions): Vec[]
    }
  }
  vec: {
    create: (x: number, y: number, z?: number) => Vec
    dist: (a: Vec, b: Vec) => number
    lerp: (a: Vec, b: Vec, t: number) => Vec
    mid: (a: Vec, b: Vec) => Vec
    dot: (a: Vec, b: Vec) => number
    ang: (a: Vec, b: Vec) => number
  }
  array: {
    shuffle: <T>(array: T[]) => T[]
      // Legacy alias: prefer utils.math.divLength
    divLength: {
      (a: Vec, b: Vec, nSeg: number, incStartEnd?: boolean): Vec[]
      (a: Vec, b: Vec, nSeg: number, options?: DivLengthOptions): Vec[]
    }
  }
  grid: {
    create: (config: Omit<GridConfig, 'utils'>) => Grid
  }
  cell: {
    create: (config: CellConfig) => Cell
  }
  color: {
    parse: (input: ColorInput) => Color | null
    isValid: (input: ColorInput | null | undefined) => boolean
    fromHex: (hex: string) => Color | null
    fromRgb: (r: number, g: number, b: number, a?: number) => Color
    fromHsl: (h: number, s: number, l: number, a?: number) => Color
  }
}

// Hash class for seeded random number generation (using sfc32 algorithm)
// Based on fxhash.xyz standard for generative art
class Hash {
  private alphabet = '123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ'
  hash: string
  private rnd: () => number

  constructor(seedString?: string) {
    if (seedString) {
      this.hash = seedString
    } else {
      this.hash = this.generateNew()
    }

    // Parse hash into numbers for sfc32
    const hashTrunc = this.hash.slice(2)
    const regex = new RegExp('.{' + ((hashTrunc.length / 4) | 0) + '}', 'g')
    const hashes = hashTrunc.match(regex)!.map((h) => this.b58dec(h))
    this.rnd = this.sfc32(...hashes)
  }

  private generateNew(): string {
    return (
      'oo' +
      Array(49)
        .fill(0)
        .map(() => this.alphabet[(Math.random() * this.alphabet.length) | 0])
        .join('')
    )
  }

  private b58dec(str: string): number {
    return [...str].reduce(
      (p, c) => (p * this.alphabet.length + this.alphabet.indexOf(c)) | 0,
      0
    )
  }

  private sfc32(...args: number[]): () => number {
    let a = args[0] || 0
    let b = args[1] || 0
    let c = args[2] || 0
    let d = args[3] || 0
    
    return () => {
      a |= 0
      b |= 0
      c |= 0
      d |= 0
      const t = (((a + b) | 0) + d) | 0
      d = (d + 1) | 0
      a = b ^ (b >>> 9)
      b = (c + (c << 3)) | 0
      c = (c << 21) | (c >>> 11)
      c = (c + t) | 0
      return (t >>> 0) / 4294967296
    }
  }

  random(): number {
    return this.rnd()
  }

  randomRange(min: number, max: number): number {
    return min + this.random() * (max - min)
  }

  randomInt(min: number, max: number): number {
    return Math.floor(this.randomRange(min, max + 1))
  }
}

// Global state
let currentHash: Hash | null = null
let noise2D = createNoise2D()
let noise3D = createNoise3D()
let noise4D = createNoise4D()

// Perlin noise implementation (using simplex noise with smoother interpolation)
function perlin2D(x: number, y: number): number {
  return (noise2D(x, y) + 1) / 2 // Normalize to 0-1
}

function perlin3D(x: number, y: number, z: number): number {
  return (noise3D(x, y, z) + 1) / 2 // Normalize to 0-1
}

// Create generative utilities instance
export function createGenerativeUtils(seedString?: string): GenerativeUtils {
  // Initialize hash with provided seed or generate new one
  currentHash = new Hash(seedString)

  // Reinitialize noise functions with the seed
  noise2D = createNoise2D(() => currentHash!.random())
  noise3D = createNoise3D(() => currentHash!.random())
  noise4D = createNoise4D(() => currentHash!.random())

  const clamp01 = (v: number) => Math.max(0, Math.min(v, 1))

  const randomUnit = (rng: () => number) => {
    const epsilon = 1e-9
    return clamp01(rng()) * (1 - epsilon) + epsilon
  }

  const normalizeWeights = (weights: number[]): number[] => {
    const epsilon = 1e-9
    const sanitized = weights.map((w) => Math.max(epsilon, w))
    const sum = sanitized.reduce((acc, w) => acc + w, 0)
    return sanitized.map((w) => w / sum)
  }

  const cumulativeInteriorTs = (weights: number[], nSeg: number): number[] => {
    const normalized = normalizeWeights(weights)
    const ts: number[] = []
    let cum = 0
    for (let i = 0; i < nSeg - 1; i++) {
      cum += normalized[i]!
      ts.push(cum)
    }
    return ts
  }

  const tsToGaps = (ts: number[]): number[] => {
    if (!ts.length) {
      return [1]
    }
    const gaps: number[] = []
    let prev = 0
    for (const t of ts) {
      gaps.push(Math.max(0, t - prev))
      prev = t
    }
    gaps.push(Math.max(0, 1 - prev))
    return gaps
  }

  const gapsToTs = (gaps: number[]): number[] => {
    const ts: number[] = []
    let cum = 0
    for (let i = 0; i < gaps.length - 1; i++) {
      cum += gaps[i]!
      ts.push(cum)
    }
    return ts
  }

  const applyMinGapFloor = (ts: number[], minGapRatio: number): number[] => {
    if (minGapRatio <= 0) return ts

    const gaps = tsToGaps(ts)
    const nGaps = gaps.length
    const cappedFloor = Math.min(Math.max(0, minGapRatio), 1 / nGaps)
    const totalFloor = cappedFloor * nGaps
    const free = Math.max(0, 1 - totalFloor)

    // Re-normalize shape into the remaining free space while enforcing a hard gap floor.
    const sum = gaps.reduce((acc, g) => acc + Math.max(0, g), 0) || 1
    const floored = gaps.map((g) => cappedFloor + free * (Math.max(0, g) / sum))
    return gapsToTs(floored)
  }

  const fibonacciWeights = (count: number): number[] => {
    if (count <= 0) return []
    if (count === 1) return [1]

    const weights = [1, 1]
    while (weights.length < count) {
      const len = weights.length
      weights.push(weights[len - 1]! + weights[len - 2]!)
    }
    return weights
  }

  const curveTransform = (u: number, curve?: DivLengthCurveOptions): number => {
    const config = curve ?? { kind: 'pow' as const, strength: 2 }
    const strength = Math.max(0.0001, config.strength ?? (config.kind === 'pow' ? 2 : config.kind === 'log' ? 9 : 4))

    let out: number
    if (config.kind === 'pow') {
      out = Math.pow(u, strength)
    } else if (config.kind === 'log') {
      out = Math.log1p(strength * u) / Math.log1p(strength)
    } else {
      out = (Math.exp(strength * u) - 1) / (Math.exp(strength) - 1)
    }

    return config.invert ? 1 - out : out
  }

  const buildInteriorTs = (nSeg: number, options: DivLengthOptions, defaultRng: () => number): number[] => {
    const interiorCount = nSeg - 1
    if (interiorCount <= 0) return []

    const mode = options.mode ?? 'uniform'
    const rng = options.rng ?? defaultRng

    if (mode === 'uniform') {
      return Array.from({ length: interiorCount }, (_, i) => (i + 1) / nSeg)
    }

    if (mode === 'randomSorted') {
      return Array.from({ length: interiorCount }, () => randomUnit(rng)).sort((a, b) => a - b)
    }

    if (mode === 'curve') {
      return Array.from({ length: interiorCount }, (_, i) => {
        const u = (i + 1) / nSeg
        return clamp01(curveTransform(u, options.curve))
      }).sort((a, b) => a - b)
    }

    if (mode === 'fibonacci') {
      return cumulativeInteriorTs(fibonacciWeights(nSeg), nSeg)
    }

    const randomWeights = Array.from({ length: nSeg }, () => randomUnit(rng))
    if (mode === 'gapAscending') {
      randomWeights.sort((a, b) => a - b)
    } else if (mode === 'gapDescending') {
      randomWeights.sort((a, b) => b - a)
    }

    return cumulativeInteriorTs(randomWeights, nSeg)
  }

  const divLength = (a: Vec, b: Vec, nSeg: number, incStartEndOrOptions: DivLengthArg = false): Vec[] => {
    const segCount = Math.max(0, Math.floor(nSeg))
    if (segCount <= 0) return []

    const options: DivLengthOptions =
      typeof incStartEndOrOptions === 'boolean'
        ? { includeEndpoints: incStartEndOrOptions }
        : incStartEndOrOptions

    const includeEndpoints = options.includeEndpoints ?? false
    const out: Vec[] = []

    if (includeEndpoints) {
      out.push(a)
    }

    const segmentLength = a.sub(b).m
    const ratioFromLength =
      options.minSegmentLength !== undefined && segmentLength > 1e-9
        ? options.minSegmentLength / segmentLength
        : 0
    const minGapRatio = Math.max(options.minSegmentRatio ?? 0, ratioFromLength)

    const rawTs = buildInteriorTs(segCount, options, () => currentHash!.random())
    const ts = applyMinGapFloor(rawTs, minGapRatio)
    for (const t of ts) {
      out.push(a.lerp(b, t))
    }

    if (includeEndpoints) {
      out.push(b)
    }

    return out
  }

  // Non-axis-aligned scale factors for utils.noise.cell().
  // Values are irrational w.r.t. each other and typical grid sizes,
  // preventing periodic patterns and axis-aligned artifacts.
  const CELL_SCALES = [0.173, 0.097, 0.211, 0.139, 0.251, 0.163, 0.229, 0.181]

  // Create utils object for Grid/Cell constructors
  const utils: GenerativeUtils = {
    seed: {
      get current() {
        return currentHash!.hash
      },
      set: (seed: string) => {
        currentHash = new Hash(seed)
        noise2D = createNoise2D(() => currentHash!.random())
        noise3D = createNoise3D(() => currentHash!.random())
        noise4D = createNoise4D(() => currentHash!.random())
      },
      reset: () => {
        const s = currentHash!.hash
        currentHash = new Hash(s)
        noise2D = createNoise2D(() => currentHash!.random())
        noise3D = createNoise3D(() => currentHash!.random())
        noise4D = createNoise4D(() => currentHash!.random())
      },
      random: () => currentHash!.random(),
      randomRange: (min: number, max: number) => currentHash!.randomRange(min, max),
      randomInt: (min: number, max: number) => currentHash!.randomInt(min, max),
      coinToss: (chance: number = 50) => {
        return currentHash!.random() <= chance / 100
      },
    },
    noise: {
      simplex2D: (x: number, y: number) => noise2D(x, y),
      simplex3D: (x: number, y: number, z: number) => noise3D(x, y, z),
      simplex4D: (x: number, y: number, z: number, w: number) => noise4D(x, y, z, w),
      perlin2D,
      perlin3D,
      cell: (...keys: number[]): number => {
        let u = 0
        let v = 1.618 // golden ratio offset keeps the two noise axes independent
        for (let i = 0; i < keys.length; i++) {
          u += keys[i]! * CELL_SCALES[i % CELL_SCALES.length]!
          v += keys[i]! * CELL_SCALES[(i + 4) % CELL_SCALES.length]!
        }
        return (noise2D(u, v) + 1) / 2
      },
    },
    math: {
      map: (value: number, start1: number, stop1: number, start2: number, stop2: number) => {
        return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1))
      },
      lerp: (start: number, stop: number, amt: number) => {
        return start + (stop - start) * amt
      },
      constrain: (n: number, low: number, high: number) => {
        return Math.max(Math.min(n, high), low)
      },
      clamp: (n: number, low: number, high: number) => {
        return Math.max(Math.min(n, high), low)
      },
      norm: (value: number, start: number, stop: number) => {
        return (value - start) / (stop - start)
      },
      dist: (x1: number, y1: number, x2: number, y2: number) => {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
      },
      dist3D: (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number) => {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2 + (z2 - z1) ** 2)
      },
      rad: (deg: number) => {
        return deg * (Math.PI / 180)
      },
      deg: (rad: number) => {
        return rad / (Math.PI / 180)
      },
      divLength,
    },
    vec: {
      create: (x: number, y: number, z: number = 0) => new Vec(x, y, z),
      dist: (a: Vec, b: Vec) => {
        const xx = a.x - b.x
        const yy = a.y - b.y
        const zz = a.z - b.z
        return Math.sqrt(xx ** 2 + yy ** 2 + zz ** 2)
      },
      lerp: (a: Vec, b: Vec, t: number) => {
        const xn = (1 - t) * a.x + b.x * t
        const yn = (1 - t) * a.y + b.y * t
        const zn = (1 - t) * a.z + b.z * t
        return new Vec(xn, yn, zn)
      },
      mid: (a: Vec, b: Vec) => {
        const xn = (a.x + b.x) / 2
        const yn = (a.y + b.y) / 2
        const zn = (a.z + b.z) / 2
        return new Vec(xn, yn, zn)
      },
      dot: (a: Vec, b: Vec) => {
        return a.x * b.x + a.y * b.y + a.z * b.z
      },
      ang: (a: Vec, b: Vec) => {
        return Math.acos(a.norm().dot(b.norm()) / (a.norm().m * b.norm().m))
      },
    },
    array: {
      shuffle: <T>(iA: T[]): T[] => {
        const oA = Array.from(iA)
        for (let i = oA.length - 1; i > 0; i--) {
          const j = Math.floor(currentHash!.random() * (i + 1))
          const temp = oA[i]
          oA[i] = oA[j]!
          oA[j] = temp!
        }
        return oA
      },
      // Legacy alias for backwards compatibility
      divLength,
    },
    grid: {
      create: (config: Omit<GridConfig, 'utils'>) => {
        return new Grid({ ...config, utils })
      }
    },
    cell: {
      create: (config: CellConfig) => {
        return new Cell(config)
      }
    },
    color: {
      parse: (input: ColorInput) => Color.parse(input),
      isValid: (input: ColorInput | null | undefined) => Color.isValid(input),
      fromHex: (hex: string) => Color.fromHex(hex),
      fromRgb: (r: number, g: number, b: number, a: number = 1) => Color.fromRgb(r, g, b, a),
      fromHsl: (h: number, s: number, l: number, a: number = 1) => Color.fromHsl(h, s, l, a)
    }
  }

  return utils
}

