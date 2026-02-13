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
    rnd: utils.seed.random, // rnd() => number [0-1]
    rndInt: utils.seed.randomInt, // rndInt(min, max) => integer
    rndRange: utils.seed.randomRange, // rndRange(min, max) => number
    coin: utils.seed.coinToss, // coin() => boolean

    // Math shortcuts
    map: utils.math.map, // map(value, start1, stop1, start2, stop2) => number
    lerp: utils.math.lerp, // lerp(start, stop, amt) => number
    clamp: utils.math.clamp, // clamp(value, min, max) => number
    norm: utils.math.norm, // norm(value, start, stop) => number [0-1]
    dist: utils.math.dist, // dist(x1, y1, x2, y2) => number
    rad: utils.math.rad, // rad(degrees) => radians
    deg: utils.math.deg, // deg(radians) => degrees

    // Vector shortcuts - single letter for convenience
    v: utils.vec.create, // v(x, y, z?) => Vec
    vDist: utils.vec.dist, // vDist(v1, v2) => number
    vLerp: utils.vec.lerp, // vLerp(v1, v2, amt) => Vec
    vMid: utils.vec.mid, // vMid(v1, v2) => Vec
    vDot: utils.vec.dot, // vDot(v1, v2) => number
    vAng: utils.vec.ang, // vAng(v1, v2) => number (radians)

    // Noise shortcuts
    noise2: utils.noise.perlin2D, // noise2(x, y) => number [-1, 1]
    noise3: utils.noise.perlin3D, // noise3(x, y, z) => number [-1, 1]
    simplex2: utils.noise.simplex2D, // simplex2(x, y) => number [-1, 1]
    simplex3: utils.noise.simplex3D, // simplex3(x, y, z) => number [-1, 1]

    // Array shortcuts
    shuffle: utils.array.shuffle, // shuffle(array) => array
    divLength: utils.array.divLength, // divLength(start, end, divisions) => number[]

    // Direct access to Vec class for type annotations
    Vec: utils.vec.create, // Vec(x, y, z?) => Vec
  }
}

// Type for shortcut return value
export type Shortcuts = ReturnType<typeof shortcuts>
