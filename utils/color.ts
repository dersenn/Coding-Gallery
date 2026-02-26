export type ColorArray = [number, number, number] | [number, number, number, number]
export type ColorInput = string | ColorArray | Color
export type CssColorFormat = 'hex' | 'rgba' | 'rgb' | 'hsl' | 'hsla'

const clampByte = (value: number): number => {
  return Math.max(0, Math.min(255, Math.round(value)))
}

const clampAlpha = (value: number): number => {
  if (Number.isNaN(value)) return 1
  return Math.max(0, Math.min(1, value))
}

const toHexByte = (value: number): string => {
  return clampByte(value).toString(16).padStart(2, '0')
}

const parseChannel = (value: string): number | null => {
  const input = value.trim()
  if (!input) return null

  if (input.endsWith('%')) {
    const parsed = Number.parseFloat(input.slice(0, -1))
    if (Number.isNaN(parsed)) return null
    return clampByte((parsed / 100) * 255)
  }

  const parsed = Number.parseFloat(input)
  if (Number.isNaN(parsed)) return null
  return clampByte(parsed)
}

const parseAlpha = (value: string): number | null => {
  const input = value.trim()
  if (!input) return null

  if (input.endsWith('%')) {
    const parsed = Number.parseFloat(input.slice(0, -1))
    if (Number.isNaN(parsed)) return null
    return clampAlpha(parsed / 100)
  }

  const parsed = Number.parseFloat(input)
  if (Number.isNaN(parsed)) return null
  return clampAlpha(parsed)
}

const parsePercent = (value: string): number | null => {
  const input = value.trim()
  if (!input.endsWith('%')) return null
  const parsed = Number.parseFloat(input.slice(0, -1))
  if (Number.isNaN(parsed)) return null
  return Math.max(0, Math.min(100, parsed))
}

const wrapHue = (value: number): number => {
  const wrapped = value % 360
  return wrapped < 0 ? wrapped + 360 : wrapped
}

const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
  const hh = wrapHue(h) / 360
  const ss = Math.max(0, Math.min(1, s / 100))
  const ll = Math.max(0, Math.min(1, l / 100))

  if (ss === 0) {
    const gray = clampByte(ll * 255)
    return [gray, gray, gray]
  }

  const hueToRgb = (p: number, q: number, t: number): number => {
    let tt = t
    if (tt < 0) tt += 1
    if (tt > 1) tt -= 1
    if (tt < 1 / 6) return p + (q - p) * 6 * tt
    if (tt < 1 / 2) return q
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
    return p
  }

  const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss
  const p = 2 * ll - q
  const r = hueToRgb(p, q, hh + 1 / 3)
  const g = hueToRgb(p, q, hh)
  const b = hueToRgb(p, q, hh - 1 / 3)

  return [clampByte(r * 255), clampByte(g * 255), clampByte(b * 255)]
}

const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
  const rr = clampByte(r) / 255
  const gg = clampByte(g) / 255
  const bb = clampByte(b) / 255
  const max = Math.max(rr, gg, bb)
  const min = Math.min(rr, gg, bb)
  const delta = max - min
  const l = (max + min) / 2

  if (delta === 0) {
    return [0, 0, +(l * 100).toFixed(1)]
  }

  const s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min)
  let h = 0

  if (max === rr) h = (gg - bb) / delta + (gg < bb ? 6 : 0)
  else if (max === gg) h = (bb - rr) / delta + 2
  else h = (rr - gg) / delta + 4

  h /= 6

  return [+(h * 360).toFixed(1), +(s * 100).toFixed(1), +(l * 100).toFixed(1)]
}

export class Color {
  readonly r: number
  readonly g: number
  readonly b: number
  readonly a: number

  constructor(r: number, g: number, b: number, a: number = 1) {
    this.r = clampByte(r)
    this.g = clampByte(g)
    this.b = clampByte(b)
    this.a = clampAlpha(a)
  }

  static fromRgb(r: number, g: number, b: number, a: number = 1): Color {
    return new Color(r, g, b, a)
  }

  static fromHsl(h: number, s: number, l: number, a: number = 1): Color {
    const [r, g, b] = hslToRgb(h, s, l)
    return new Color(r, g, b, a)
  }

  static fromHex(hex: string): Color | null {
    const input = hex.trim().replace(/^#/, '')
    if (!input) return null

    if (input.length === 3) {
      const r = Number.parseInt(input[0]! + input[0], 16)
      const g = Number.parseInt(input[1]! + input[1], 16)
      const b = Number.parseInt(input[2]! + input[2], 16)
      return new Color(r, g, b)
    }

    if (input.length === 6) {
      const r = Number.parseInt(input.slice(0, 2), 16)
      const g = Number.parseInt(input.slice(2, 4), 16)
      const b = Number.parseInt(input.slice(4, 6), 16)
      return new Color(r, g, b)
    }

    if (input.length === 8) {
      const r = Number.parseInt(input.slice(0, 2), 16)
      const g = Number.parseInt(input.slice(2, 4), 16)
      const b = Number.parseInt(input.slice(4, 6), 16)
      const a = Number.parseInt(input.slice(6, 8), 16) / 255
      return new Color(r, g, b, a)
    }

    return null
  }

  static parse(input: ColorInput): Color | null {
    if (input instanceof Color) {
      return input.clone()
    }

    if (Array.isArray(input)) {
      if (input.length !== 3 && input.length !== 4) return null
      return new Color(input[0], input[1], input[2], input[3] ?? 1)
    }

    const trimmed = input.trim()
    if (!trimmed) return null

    const keyword = trimmed.toLowerCase()
    if (keyword === 'none') return null
    if (keyword === 'transparent') return new Color(0, 0, 0, 0)

    if (trimmed.startsWith('#')) {
      return Color.fromHex(trimmed)
    }

    const rgbaMatch = trimmed.match(/^rgba?\((.+)\)$/i)
    if (rgbaMatch) {
      const parts = rgbaMatch[1]!.split(',').map(part => part.trim())
      if (parts.length !== 3 && parts.length !== 4) return null

      const r = parseChannel(parts[0]!)
      const g = parseChannel(parts[1]!)
      const b = parseChannel(parts[2]!)
      if (r === null || g === null || b === null) return null

      if (parts.length === 3) {
        return new Color(r, g, b, 1)
      }

      const a = parseAlpha(parts[3]!)
      if (a === null) return null

      return new Color(r, g, b, a)
    }

    const hslaMatch = trimmed.match(/^hsla?\((.+)\)$/i)
    if (!hslaMatch) return null

    const parts = hslaMatch[1]!.split(',').map(part => part.trim())
    if (parts.length !== 3 && parts.length !== 4) return null

    const h = Number.parseFloat(parts[0]!)
    const s = parsePercent(parts[1]!)
    const l = parsePercent(parts[2]!)
    if (Number.isNaN(h) || s === null || l === null) return null

    if (parts.length === 3) {
      return Color.fromHsl(h, s, l, 1)
    }

    const a = parseAlpha(parts[3]!)
    if (a === null) return null

    return Color.fromHsl(h, s, l, a)
  }

  static isValid(input: ColorInput | null | undefined): boolean {
    if (input === null || input === undefined) return false
    if (typeof input === 'string' && input.trim().toLowerCase() === 'none') return true
    return Color.parse(input) !== null
  }

  clone(): Color {
    return new Color(this.r, this.g, this.b, this.a)
  }

  withAlpha(alpha: number): Color {
    return new Color(this.r, this.g, this.b, alpha)
  }

  toHex(includeAlpha: boolean = false): string {
    const base = `#${toHexByte(this.r)}${toHexByte(this.g)}${toHexByte(this.b)}`
    if (!includeAlpha) return base
    return `${base}${toHexByte(this.a * 255)}`
  }

  toRgbString(): string {
    return `rgb(${this.r}, ${this.g}, ${this.b})`
  }

  toRgbaString(): string {
    return `rgba(${this.r}, ${this.g}, ${this.b}, ${this.a.toFixed(3)})`
  }

  toHslTuple(): [number, number, number] {
    return rgbToHsl(this.r, this.g, this.b)
  }

  toHslString(): string {
    const [h, s, l] = this.toHslTuple()
    return `hsl(${h}, ${s}%, ${l}%)`
  }

  toHslaString(): string {
    const [h, s, l] = this.toHslTuple()
    return `hsla(${h}, ${s}%, ${l}%, ${this.a.toFixed(3)})`
  }

  toCss(format: CssColorFormat = 'hex'): string {
    if (format === 'rgba') return this.toRgbaString()
    if (format === 'rgb') return this.toRgbString()
    if (format === 'hsla') return this.toHslaString()
    if (format === 'hsl') return this.toHslString()
    return this.toHex(this.a < 1)
  }

  toP5Tuple(): [number, number, number, number] {
    return [this.r, this.g, this.b, clampByte(this.a * 255)]
  }
}

const DEFAULT_FALLBACK_COLORS = ['#ffffff']

export interface ResolveActiveColorsOptions {
  paletteColors: string[]
  selectedValues?: Array<string | number>
  colorCount?: number
  customColors?: string[]
  useCustomPalette?: boolean
  applyColorCountWhenSelected?: boolean
  fallbackColors?: string[]
}

const toNormalizedHex = (input: string): string | null => {
  const parsed = Color.parse(input)
  if (!parsed) return null
  return parsed.toHex(parsed.a < 1)
}

export const normalizeColorList = (
  input: string[],
  fallback: string[] = DEFAULT_FALLBACK_COLORS
): string[] => {
  const uniqueColors = new Set<string>()

  input.forEach((color) => {
    const normalized = toNormalizedHex(color)
    if (normalized) uniqueColors.add(normalized)
  })

  if (uniqueColors.size > 0) return [...uniqueColors]

  const fallbackColors = fallback
    .map((color) => toNormalizedHex(color))
    .filter((color): color is string => color !== null)

  return fallbackColors.length ? fallbackColors : [...DEFAULT_FALLBACK_COLORS]
}

const normalizeSelectedIndices = (
  selectedValues: Array<string | number> | undefined,
  length: number
): number[] => {
  if (!selectedValues?.length) return []

  const indices: number[] = []
  selectedValues.forEach((value) => {
    const parsed = typeof value === 'number' ? value : Number.parseInt(value, 10)
    if (!Number.isInteger(parsed)) return
    if (parsed < 0 || parsed >= length) return
    if (indices.includes(parsed)) return
    indices.push(parsed)
  })

  return indices
}

export const resolveActiveColors = (options: ResolveActiveColorsOptions): string[] => {
  const basePalette = normalizeColorList(options.paletteColors, options.fallbackColors)
  const customPalette = normalizeColorList(options.customColors ?? [], basePalette)
  const sourcePalette = options.useCustomPalette ? customPalette : basePalette

  const selectedIndices = normalizeSelectedIndices(options.selectedValues, sourcePalette.length)
  const selectedColors = selectedIndices.length
    ? selectedIndices.map((index) => sourcePalette[index]!)
    : sourcePalette

  if (selectedIndices.length > 0 && options.applyColorCountWhenSelected === false) {
    return selectedColors.length ? selectedColors : [sourcePalette[0]!]
  }

  const limit = options.colorCount === undefined
    ? selectedColors.length
    : Math.max(1, Math.floor(options.colorCount))

  const limitedColors = selectedColors.slice(0, Math.min(limit, selectedColors.length))
  return limitedColors.length ? limitedColors : [sourcePalette[0]!]
}
