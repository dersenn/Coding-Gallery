// ─── Types ────────────────────────────────────────────────────────────────────

export interface WeaveConfig {
  /** Warp thread → shaft assignment, 1-based, length = repeat width */
  threading: number[]
  /** Weft row → treadle assignment, 1-based, length = repeat height */
  treadling: number[]
  /** [treadle-1][shaft-1] — true means warp lifts (warp over weft) */
  tieup: boolean[][]
  /** Color per warp thread, cycles across columns */
  warpColors: string[]
  /** Color per weft thread, cycles across rows */
  weftColors: string[]
}

export interface WeaveData {
  /** [row][col] — 1 = warp up, 0 = weft up */
  drawdown: number[][]
  /** Horizontal repeat size (= threading.length) */
  cols: number
  /** Vertical repeat size (= treadling.length) */
  rows: number
  warpColors: string[]
  weftColors: string[]
}

export interface WeaveRenderOptions {
  x?: number
  y?: number
  width: number
  height: number
  cellSize: number
}

// ─── Core computation ─────────────────────────────────────────────────────────

export function buildWeave(config: WeaveConfig): WeaveData {
  const { threading, treadling, tieup, warpColors, weftColors } = config
  const cols = threading.length
  const rows = treadling.length

  const drawdown: number[][] = Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => {
      const shaft = threading[col]! - 1
      const treadle = treadling[row]! - 1
      return tieup[treadle]?.[shaft] ? 1 : 0
    })
  )

  return { drawdown, cols, rows, warpColors, weftColors }
}

// ─── Technique-agnostic tiling ────────────────────────────────────────────────

/**
 * Iterates the cells needed to fill the given rect, resolving colors from the
 * tiled drawdown. Clipping to the rect boundary is the caller's responsibility.
 */
export function renderWeave(
  weave: WeaveData,
  options: WeaveRenderOptions,
  drawCell: (x: number, y: number, size: number, color: string) => void
): void {
  const { x = 0, y = 0, width, height, cellSize } = options
  const { drawdown, cols, rows, warpColors, weftColors } = weave

  const numCols = Math.ceil(width / cellSize)
  const numRows = Math.ceil(height / cellSize)

  for (let row = 0; row < numRows; row++) {
    for (let col = 0; col < numCols; col++) {
      const warpUp = drawdown[row % rows]![col % cols]
      const color = warpUp
        ? warpColors[col % warpColors.length]!
        : weftColors[row % weftColors.length]!
      drawCell(x + col * cellSize, y + row * cellSize, cellSize, color)
    }
  }
}

// ─── Canvas 2D wrapper ────────────────────────────────────────────────────────

export function drawWeaveCanvas(
  ctx: CanvasRenderingContext2D,
  weave: WeaveData,
  options: WeaveRenderOptions
): void {
  const { x = 0, y = 0, width, height } = options

  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, width, height)
  ctx.clip()

  renderWeave(weave, options, (cx, cy, size, color) => {
    ctx.fillStyle = color
    ctx.fillRect(cx, cy, size, size)
  })

  ctx.restore()
}

// ─── SVG wrapper ──────────────────────────────────────────────────────────────

/**
 * Note: SVG output produces one <rect> per cell. Fine for small drawdowns or
 * design tools, but canvas2d is a better fit for dense tiled patterns.
 */
export function drawWeaveSvg(
  parent: SVGElement,
  weave: WeaveData,
  options: WeaveRenderOptions
): void {
  const { x = 0, y = 0, width, height } = options
  const ns = 'http://www.w3.org/2000/svg'

  const clipId = `weave-clip-${Math.random().toString(36).slice(2)}`

  const clipPath = document.createElementNS(ns, 'clipPath')
  clipPath.setAttribute('id', clipId)
  const clipRect = document.createElementNS(ns, 'rect')
  clipRect.setAttribute('x', String(x))
  clipRect.setAttribute('y', String(y))
  clipRect.setAttribute('width', String(width))
  clipRect.setAttribute('height', String(height))
  clipPath.appendChild(clipRect)
  parent.appendChild(clipPath)

  const group = document.createElementNS(ns, 'g')
  group.setAttribute('clip-path', `url(#${clipId})`)

  renderWeave(weave, options, (cx, cy, size, color) => {
    const rect = document.createElementNS(ns, 'rect')
    rect.setAttribute('x', String(cx))
    rect.setAttribute('y', String(cy))
    rect.setAttribute('width', String(size))
    rect.setAttribute('height', String(size))
    rect.setAttribute('fill', color)
    group.appendChild(rect)
  })

  parent.appendChild(group)
}
