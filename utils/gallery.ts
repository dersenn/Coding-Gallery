import { createNoise2D, createNoise3D, createNoise4D } from 'simplex-noise'

// Gallery utilities available to all projects
export interface GalleryUtils {
  noise: {
    simplex2D: (x: number, y: number) => number
    simplex3D: (x: number, y: number, z: number) => number
    simplex4D: (x: number, y: number, z: number, w: number) => number
    perlin2D: (x: number, y: number) => number
    perlin3D: (x: number, y: number, z: number) => number
  }
  seed: {
    set: (seed: string | number) => void
    random: () => number
    randomRange: (min: number, max: number) => number
    randomInt: (min: number, max: number) => number
  }
  math: {
    map: (value: number, start1: number, stop1: number, start2: number, stop2: number) => number
    lerp: (start: number, stop: number, amt: number) => number
    constrain: (n: number, low: number, high: number) => number
    clamp: (n: number, low: number, high: number) => number
    norm: (value: number, start: number, stop: number) => number
    dist: (x1: number, y1: number, x2: number, y2: number) => number
    dist3D: (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number) => number
  }
}

// Seeded random number generator (using mulberry32)
class SeededRandom {
  private seed: number

  constructor(seed: string | number) {
    this.seed = this.hashSeed(seed)
  }

  private hashSeed(seed: string | number): number {
    if (typeof seed === 'number') {
      return seed >>> 0
    }
    let hash = 0
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i)
      hash = hash >>> 0
    }
    return hash
  }

  next(): number {
    let t = this.seed += 0x6D2B79F5
    t = Math.imul(t ^ t >>> 15, t | 1)
    t ^= t + Math.imul(t ^ t >>> 7, t | 61)
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min)
  }

  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1))
  }
}

// Global state
let currentRandom = new SeededRandom(Date.now())
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

// Create gallery utilities instance
export function createGalleryUtils(): GalleryUtils {
  return {
    noise: {
      simplex2D: (x: number, y: number) => noise2D(x, y),
      simplex3D: (x: number, y: number, z: number) => noise3D(x, y, z),
      simplex4D: (x: number, y: number, z: number, w: number) => noise4D(x, y, z, w),
      perlin2D,
      perlin3D,
    },
    seed: {
      set: (seed: string | number) => {
        currentRandom = new SeededRandom(seed)
        // Reinitialize noise functions with new seed
        noise2D = createNoise2D(() => currentRandom.next())
        noise3D = createNoise3D(() => currentRandom.next())
        noise4D = createNoise4D(() => currentRandom.next())
      },
      random: () => currentRandom.next(),
      randomRange: (min: number, max: number) => currentRandom.range(min, max),
      randomInt: (min: number, max: number) => currentRandom.int(min, max),
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
    },
  }
}
