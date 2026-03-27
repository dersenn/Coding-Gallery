/**
 * Container Layout Utility
 *
 * resolveContainer() computes sketch canvas dimensions and sets up container
 * centering for three sizing modes: full container, centered square, and a
 * custom aspect ratio. Supports optional inset padding using any CSS length unit.
 *
 * Usage:
 *   import { resolveContainer } from '~/utils/container'
 *   const { el, width, height } = resolveContainer(container, 'square')
 *   const svg = new SVG({ parent: el, id: 'sketch', width, height })
 *
 * Or with padding:
 *   const { el, width, height, padding } = resolveContainer(container, { mode: '4:3', padding: '2vmin' })
 *   // `padding` is the resolved px value — usable for grid gaps, margins, etc.
 */

/** Sizing mode for resolveContainer.
 * - 'full'        — fills the container (default)
 * - 'square'      — centered square (Math.min of available width/height)
 * - 'W:H' string  — centered rect at a custom ratio (e.g. '4:3', '16:9', '1:1.414' for A4)
 */
export type ContainerMode = 'full' | 'square' | `${number}:${number}`

export interface ContainerConfig {
  mode?: ContainerMode
  /**
   * Inset padding applied to the container before computing dimensions.
   * - number -> interpreted as px (e.g. 32)
   * - string -> any valid CSS length ('2vmin', '1em', '5%')
   * The browser resolves the unit; the returned `padding` field is always in px.
   */
  padding?: number | string
}

export interface ContainerResult {
  /** Canvas width in px (accounts for padding). */
  width: number
  /** Canvas height in px (accounts for padding). */
  height: number
  /**
   * Resolved padding in px (uniform, top value).
   * Useful for grid gaps, inner margins, and other layout math that should
   * harmonize with the viewport inset.
   */
  padding: number
  /**
   * The element to use as parent for SVG / p5.
   * - 'full' mode: the original container itself.
   * - 'square' / ratio modes: a new sized wrapper div appended to the container.
   */
  el: HTMLElement
}

/** Inner frame rectangle resolved inside a fixed outer canvas. */
export interface InnerFrameResult {
  x: number
  y: number
  width: number
  height: number
}

export interface FrameTransform {
  toGlobal: (x: number, y: number) => { x: number; y: number }
  toLocal: (x: number, y: number) => { x: number; y: number }
}

const resolveInsetPx = (
  padding: ContainerConfig['padding'],
  width: number,
  height: number
): number => {
  if (padding === undefined) return 0
  if (typeof padding === 'number') return Math.max(0, padding)

  const value = padding.trim().toLowerCase()
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed)) return 0

  if (value.endsWith('vmin')) {
    return Math.max(0, (parsed / 100) * Math.min(width, height))
  }
  if (value.endsWith('%')) {
    return Math.max(0, (parsed / 100) * Math.min(width, height))
  }
  if (value.endsWith('px')) {
    return Math.max(0, parsed)
  }
  return Math.max(0, parsed)
}

const parseAspectMode = (mode: Exclude<ContainerMode, 'full' | 'square'>): number => {
  const [wStr, hStr] = mode.split(':')
  const w = Number.parseFloat(wStr ?? '')
  const h = Number.parseFloat(hStr ?? '')
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return 1
  return w / h
}

/**
 * Resolves an inner frame from canvas mode/padding inside a fixed outer size.
 * Useful for single-SVG sketches that simulate per-sketch artboards.
 */
export function resolveInnerFrame(
  outerWidth: number,
  outerHeight: number,
  config?: ContainerMode | ContainerConfig
): InnerFrameResult {
  const cfg: ContainerConfig = typeof config === 'string' ? { mode: config } : (config ?? {})
  const mode = cfg.mode ?? 'full'
  const inset = resolveInsetPx(cfg.padding, outerWidth, outerHeight)
  const availableWidth = Math.max(1, outerWidth - inset * 2)
  const availableHeight = Math.max(1, outerHeight - inset * 2)

  let width = availableWidth
  let height = availableHeight

  if (mode === 'square') {
    width = height = Math.min(availableWidth, availableHeight)
  } else if (mode !== 'full') {
    const ratio = parseAspectMode(mode)
    if (availableWidth / availableHeight > ratio) {
      height = availableHeight
      width = height * ratio
    } else {
      width = availableWidth
      height = width / ratio
    }
  }

  return {
    x: (outerWidth - width) / 2,
    y: (outerHeight - height) / 2,
    width,
    height
  }
}

/** Creates local<->global coordinate mappers for an inner frame rectangle. */
export function createFrameTransform(frame: InnerFrameResult): FrameTransform {
  return {
    toGlobal: (x, y) => ({ x: frame.x + x, y: frame.y + y }),
    toLocal: (x, y) => ({ x: x - frame.x, y: y - frame.y })
  }
}

/**
 * Resolves canvas dimensions and prepares the container for the given sizing mode.
 *
 * @param container - The HTMLElement passed to init() by the framework.
 * @param config    - A ContainerMode string or a ContainerConfig object.
 * @returns         - { width, height, padding, el } ready for use in SVG / p5 constructors.
 */
export function resolveContainer(
  container: HTMLElement,
  config?: ContainerMode | ContainerConfig
): ContainerResult {
  const cfg: ContainerConfig = typeof config === 'string' ? { mode: config } : (config ?? {})
  const mode = cfg.mode ?? 'full'

  // Apply padding before measuring - browser resolves the unit synchronously
  if (cfg.padding !== undefined) {
    container.style.padding = typeof cfg.padding === 'number'
      ? `${cfg.padding}px`
      : cfg.padding
  }

  // clientWidth includes padding; subtract it to get the true available content area
  const cs = getComputedStyle(container)
  const resolvedPadding = parseFloat(cs.paddingTop)
  const availW = container.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
  const availH = container.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)

  if (mode === 'full') {
    return { width: availW, height: availH, padding: resolvedPadding, el: container }
  }

  // Compute target dimensions from mode
  let width: number
  let height: number

  if (mode === 'square') {
    width = height = Math.min(availW, availH)
  } else {
    // Parse 'W:H' ratio string - letterbox fit within available area
    const [wStr, hStr] = mode.split(':')
    const ratio = parseFloat(wStr!) / parseFloat(hStr!)
    if (availW / availH > ratio) {
      // Container is wider than the target ratio - constrain by height
      height = availH
      width = height * ratio
    } else {
      // Container is taller than the target ratio - constrain by width
      width = availW
      height = width / ratio
    }
  }

  // Center the wrapper within the container content area
  container.style.display = 'flex'
  container.style.alignItems = 'center'
  container.style.justifyContent = 'center'

  const wrapper = document.createElement('div')
  wrapper.style.width = `${width}px`
  wrapper.style.height = `${height}px`
  wrapper.style.flexShrink = '0'
  container.appendChild(wrapper)

  return { width, height, padding: resolvedPadding, el: wrapper }
}
