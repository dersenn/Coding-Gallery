import type { GenerativeUtils, Vec } from './generative'

/**
 * Flat aliases onto {@link GenerativeUtils} for sketch and framework code.
 *
 * **Seeding:** Always call `shortcuts(context.utils)` (or another sketch-scoped
 * `utils` instance). Do not build a standalone `GenerativeUtils` and pass it here,
 * or random/noise streams will not match the gallery seed.
 *
 * **Groups returned** (each entry delegates to the same-named area under `utils`):
 * - **Random:** `rnd`, `rndInt`, `rndRange`, `coin` → `utils.seed.*`
 * - **Math:** `map`, `lerp`, `clamp`, `norm`, `dist`, `rad`, `deg`, `curve`, `divLength` → `utils.math.*`
 * - **Vectors:** `v`, `vDist`, `vLerp`, `vMid`, `vDot`, `vAng` → `utils.vec.*`
 * - **Noise:** `noise2`, `noise3`, `simplex2`, `simplex3` → `utils.noise.*`
 * - **Arrays:** `shuffle`, `pick`, `pickMany` → `utils.array.*`
 * - **Layout helpers:** `Grid`, `Cell` → `utils.grid.create`, `utils.cell.create`
 * - **Color:** `clr` → `utils.color.parse`
 * - **Types / style:** `Vec` is the same factory as `v` (`utils.vec.create`), useful when
 *   you want `new Vec(...)`-shaped wording in annotations; prefer `v` at call sites.
 *
 * @param utils - The generative utility bundle (normally `context.utils` in sketches).
 * @returns A plain object of bound functions; see {@link Shortcuts}.
 *
 * @example Sketch draw()
 * ```js
 * const { v, rnd, map, coin } = shortcuts(utils)
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
    curve: utils.math.curve, // curve(type)(t) => number

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
    pick: utils.array.pick, // pick(items) => T | undefined
    pickMany: utils.array.pickMany, // pickMany(items, count) => T[]
    divLength: utils.math.divLength, // divLength(start, end, divisions, includeEndpointsOrOptions?) => Vec[]

    // Grid and Cell shortcuts
    Grid: utils.grid.create, // Grid(config) => Grid
    Cell: utils.cell.create, // Cell(config) => Cell
    
    // Color shortcuts
    clr: utils.color.parse, // clr(input) => Color | null

    // Direct access to Vec class for type annotations
    Vec: utils.vec.create, // Vec(x, y, z?) => Vec
  }
}

/** Inferred type of the object returned by {@link shortcuts}. */
export type Shortcuts = ReturnType<typeof shortcuts>
