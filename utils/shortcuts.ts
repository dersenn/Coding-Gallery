import type { GenerativeUtils, Vec } from './generative'

/**
 * Shorthand function exports for hand-coding convenience
 * 
 * Usage:
 * ```ts
 * import { shortcuts } from '~/utils/shortcuts'
 * 
 * const { v, rnd, map, lerp } = shortcuts(utils)
 * 
 * const center = v(width / 2, height / 2)
 * const randomX = rnd() * width
 * const mappedValue = map(noise, 0, 1, -100, 100)
 * ```
 */
export function shortcuts(utils: GenerativeUtils) {
  return {
    // Random shortcuts
    rnd: utils.seed.random,
    rndInt: utils.seed.randomInt,
    rndRange: utils.seed.randomRange,
    coin: utils.seed.coinToss,

    // Math shortcuts
    map: utils.math.map,
    lerp: utils.math.lerp,
    clamp: utils.math.clamp,
    norm: utils.math.norm,
    dist: utils.math.dist,
    rad: utils.math.rad,
    deg: utils.math.deg,

    // Vector shortcuts - single letter for convenience
    v: utils.vec.create, // v(x, y, z?) creates new Vec
    vDist: utils.vec.dist,
    vLerp: utils.vec.lerp,
    vMid: utils.vec.mid,
    vDot: utils.vec.dot,
    vAng: utils.vec.ang,

    // Noise shortcuts
    noise2: utils.noise.perlin2D,
    noise3: utils.noise.perlin3D,
    simplex2: utils.noise.simplex2D,
    simplex3: utils.noise.simplex3D,

    // Array shortcuts
    shuffle: utils.array.shuffle,
    divLength: utils.array.divLength,

    // Direct access to Vec class for type annotations
    Vec: utils.vec.create,
  }
}

// Type for shortcut return value
export type Shortcuts = ReturnType<typeof shortcuts>
