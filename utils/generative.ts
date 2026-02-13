import { createNoise2D, createNoise3D, createNoise4D } from 'simplex-noise'

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
}

// Generative art utilities available to all projects
export interface GenerativeUtils {
  seed: {
    current: string
    set: (seed: string) => void
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
    divLength: (a: Vec, b: Vec, nSeg: number, incStartEnd?: boolean) => Vec[]
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

  return {
    seed: {
      get current() {
        return currentHash!.hash
      },
      set: (seed: string) => {
        currentHash = new Hash(seed)
        // Reinitialize noise functions with new seed
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
      divLength: (a: Vec, b: Vec, nSeg: number, incStartEnd: boolean = false): Vec[] => {
        const oA: Vec[] = []
        const t = 1 / nSeg

        if (incStartEnd) {
          oA.push(a)
        }

        for (let i = 0; i < nSeg - 1; i++) {
          oA.push(a.lerp(b, (i + 1) * t))
        }

        if (incStartEnd) {
          oA.push(b)
        }

        return oA
      },
    },
  }
}
