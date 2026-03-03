/**
 * Canvas Layout Utility
 *
 * resolveCanvas() computes sketch canvas dimensions and sets up container
 * centering for three sizing modes: full container, centered square, and a
 * custom aspect ratio. Supports optional inset padding using any CSS length unit.
 *
 * Usage:
 *   import { resolveCanvas } from '~/utils/canvas'
 *   const { el, width, height } = resolveCanvas(container, 'square')
 *   const svg = new SVG({ parent: el, id: 'sketch', width, height })
 *
 * Or with padding:
 *   const { el, width, height, padding } = resolveCanvas(container, { mode: '4:3', padding: '2vmin' })
 *   // `padding` is the resolved px value — usable for grid gaps, margins, etc.
 */

/** Sizing mode for resolveCanvas.
 * - 'full'        — fills the container (default)
 * - 'square'      — centered square (Math.min of available width/height)
 * - 'W:H' string  — centered rect at a custom ratio (e.g. '4:3', '16:9', '1:1.414' for A4)
 */
export type CanvasMode = 'full' | 'square' | `${number}:${number}`

export interface CanvasConfig {
  mode?: CanvasMode
  /**
   * Inset padding applied to the container before computing dimensions.
   * - number → interpreted as px (e.g. 32)
   * - string → any valid CSS length ('2vmin', '1em', '5%')
   * The browser resolves the unit; the returned `padding` field is always in px.
   */
  padding?: number | string
}

export interface CanvasResult {
  /** Canvas width in px (accounts for padding). */
  width: number
  /** Canvas height in px (accounts for padding). */
  height: number
  /**
   * Resolved padding in px (uniform, top value).
   * Useful for grid gaps, inner margins, and other layout math that should
   * harmonise with the viewport inset.
   */
  padding: number
  /**
   * The element to use as parent for SVG / p5.
   * - 'full' mode: the original container itself.
   * - 'square' / ratio modes: a new sized wrapper div appended to the container.
   */
  el: HTMLElement
}

/**
 * Resolves canvas dimensions and prepares the container for the given sizing mode.
 *
 * @param container — The HTMLElement passed to init() by the framework.
 * @param config    — A CanvasMode string or a CanvasConfig object.
 * @returns         — { width, height, padding, el } ready for use in SVG / p5 constructors.
 *
 * @example
 * // Centered square
 * const { el, width, height } = resolveCanvas(container, 'square')
 * const svg = new SVG({ parent: el, id: 'sketch', width, height })
 *
 * @example
 * // 4:3 ratio with responsive inset
 * const { el, width, height, padding } = resolveCanvas(container, { mode: '4:3', padding: '2vmin' })
 * const gap = padding * 0.5
 *
 * @example
 * // p5 square sketch
 * const { el, width, height } = resolveCanvas(container, 'square')
 * const sketch = new p5((p) => {
 *   p.setup = () => p.createCanvas(width, height)
 * }, el)
 */
export function resolveCanvas(
  container: HTMLElement,
  config?: CanvasMode | CanvasConfig
): CanvasResult {
  const cfg: CanvasConfig = typeof config === 'string' ? { mode: config } : (config ?? {})
  const mode = cfg.mode ?? 'full'

  // Apply padding before measuring — browser resolves the unit synchronously
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
    // Parse 'W:H' ratio string — letterbox fit within available area
    const [wStr, hStr] = mode.split(':')
    const ratio = parseFloat(wStr!) / parseFloat(hStr!)
    if (availW / availH > ratio) {
      // Container is wider than the target ratio — constrain by height
      height = availH
      width = height * ratio
    } else {
      // Container is taller than the target ratio — constrain by width
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
