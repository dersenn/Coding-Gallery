import { Grid, GridCell, Path } from '~/types/project'
import { shortcuts } from '~/utils/shortcuts'

// ─── Patchwork Lines ─────────────────────────────────────────────────────────
// SVG / plotter port of patchwork/patchwork-1|2. Same grid and noise.
// Each terminal cell picks a line pattern from `bucket` (noise → pattern index)
// instead of a palette colour + weave. See the switch in MyCell.draw().
// Units: viewBox is in mm (print target svg @ 25.4 dpi).

const PATTERN_COUNT = 6

function squareDivisions(width, height, divisions) {
  if (width <= height) {
    const cellSize = width / divisions
    return { cols: divisions, rows: Math.max(1, Math.floor(height / cellSize)) }
  } else {
    const cellSize = height / divisions
    return { cols: Math.max(1, Math.floor(width / cellSize)), rows: divisions }
  }
}

/** Point at fraction t along the path a → corner → b. */
function alongEdges(a, corner, b, t) {
  const l1 = a.sub(corner).m
  const l2 = corner.sub(b).m
  const d = t * (l1 + l2)
  return d <= l1 ? a.lerp(corner, d / l1) : corner.lerp(b, (d - l1) / l2)
}

// No svg group helper in utils/svg.ts yet — candidate for UTILITY_GAP_BACKLOG.
function group(id, parent) {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  g.setAttribute('id', id)
  parent.append(g)
  return g
}



class MyGrid extends Grid {
  createCell(config) {
    return new MyCell(config)
  }
}

class MyCell extends GridCell {
  constructor(config) {
    super(config)
    this.noise = 0
    this.sampleSize = 0
    this.bucket = 0
  }

  // ── noise ──

  noiseSample(fbm2, ns) {
    const { x: cx, y: cy } = this.center()
    const rootCell = this.parent ?? this
    const delta = rootCell.index * ns.offset
    // align strip-phase offset with top-level split axis (rows → Y, cols → X)
    const offsetX = ns.portrait ? 0 : delta
    const offsetY = ns.portrait ? delta : 0

    this.sampleSize = this.width * ns.sampleMultiplier

    // snap to coarser sample grid
    const sx = this.sampleSize > 0 ? Math.floor((cx + offsetX) / this.sampleSize) * this.sampleSize : cx + offsetX
    const sy = this.sampleSize > 0 ? Math.floor((cy + offsetY) / this.sampleSize) * this.sampleSize : cy + offsetY

    return fbm2(sx, sy)
  }

  normalizeNoise(min, max, contrast) {
    const normalized = max > min ? (this.noise - min) / (max - min) : 0.5
    this.noise = Math.pow(normalized, 1 / contrast)
  }

  /** Same role as assignColor() in patchwork: noise → index. `order` allows shuffling. */
  assignPattern(order) {
    const i = Math.min(Math.floor(this.noise * order.length), order.length - 1)
    this.bucket = order[i]
  }

  // ── line patterns: each returns segments [a, b] ──

  /** left edge → right edge */
  horizontal(n) {
    const { divLength } = shortcuts(this.grid.utils)
    const left = divLength(this.tl(), this.bl(), n + 1)
    const right = divLength(this.tr(), this.br(), n + 1)
    return left.map((a, i) => [a, right[i]])
  }

  /** top edge → bottom edge */
  vertical(n) {
    const { divLength } = shortcuts(this.grid.utils)
    const top = divLength(this.tl(), this.tr(), n + 1)
    const bottom = divLength(this.bl(), this.br(), n + 1)
    return top.map((a, i) => [a, bottom[i]])
  }

  /** "/" — both ends walk tl → br, one via tr, one via bl. Equal distance = 45°. */
  diagonal(n) {
    return Array.from({ length: n }, (_, i) => {
      const t = (i + 1) / (n + 1)
      return [
        alongEdges(this.tl(), this.tr(), this.br(), t),
        alongEdges(this.tl(), this.bl(), this.br(), t),
      ]
    })
  }

  /** "\" — mirrored: tr → bl */
  antiDiagonal(n) {
    return Array.from({ length: n }, (_, i) => {
      const t = (i + 1) / (n + 1)
      return [
        alongEdges(this.tr(), this.tl(), this.bl(), t),
        alongEdges(this.tr(), this.br(), this.bl(), t),
      ]
    })
  }

  // ── draw ──

  /** Draw segments into the layer for `direction`, in that direction's colour. */
  drawLines(svg, layers, direction, segs, style) {
    const layer = layers[direction]
    const stroke = style.colors[direction]
    if (style.connect) {
      // one continuous zigzag: every other line reversed, all joined
      const pts = segs.flatMap((seg, i) => (i % 2 ? [seg[1], seg[0]] : seg))
      layer.append(svg.path(new Path(pts).buildPolygon(false), 'none', stroke, style.penW))
    } else {
      segs.forEach(([a, b]) => layer.append(svg.line(a, b, stroke, style.penW)))
    }
  }

  draw(svg, layers, style) {
    const n = 1 // lines per cell — override per case as needed

    switch (this.bucket) {
      case 0:
        this.drawLines(svg, layers, 'horizontal', this.horizontal(n), style)
        break
      case 1:
        this.drawLines(svg, layers, 'vertical', this.vertical(n), style)
        break
      case 2:
        this.drawLines(svg, layers, 'diagonal', this.diagonal(n), style)
        break
      case 3:
        this.drawLines(svg, layers, 'antiDiagonal', this.antiDiagonal(n), style)
        break
      case 4:
        // cross: horizontal + vertical
        this.drawLines(svg, layers, 'horizontal', this.horizontal(n), style)
        this.drawLines(svg, layers, 'vertical', this.vertical(n), style)
        break
      case 5:
      default:
        // diagonal cross: diagonal + anti-diagonal
        this.drawLines(svg, layers, 'diagonal', this.diagonal(n), style)
        this.drawLines(svg, layers, 'antiDiagonal', this.antiDiagonal(n), style)
        break
    }
  }
}



export function draw(context) {
  const { svg, theme, utils, controls: c } = context
  const { rndInt, shuffle, simplex2, noiseField } = shortcuts(utils)
  if (!svg) return

  const { mm, trimWidth, trimHeight } = svg.print

  const border = {
    top: mm(12),
    right: mm(12),
    bottom: mm(18),
    left: mm(12),
  }

  const style = {
    // one colour per line direction — illustration only, a plotter ignores these
    colors: {
      horizontal: theme.palette[0],
      vertical: theme.palette[1],
      diagonal: theme.palette[2],
      antiDiagonal: theme.palette[3],
    },
    penW: mm(c.penMm),
    connect: c.connectLines,
  }

  const order = Array.from({ length: PATTERN_COUNT }, (_, i) => i)
  const patternOrder = c.shufflePatterns ? shuffle(order) : order


  // GRID

  const width = trimWidth - border.left - border.right
  const height = trimHeight - border.top - border.bottom
  const portrait = height > width
  const splits = rndInt(2, 4)

  const grid = new MyGrid({
    cols: portrait ? 1 : splits,
    rows: portrait ? splits : 1,
    width,
    height,
    x: border.left,
    y: border.top,
    utils,
  })

  const terminals = grid.subdivide({
    maxLevel: 1,
    rule: (cell, level) => {
      if (level === 0) return squareDivisions(cell.width, cell.height, c.divisions)
      return false
    }
  })


  // NOISE → PATTERN

  const fbm2 = noiseField(simplex2, {
    frequency: c.scale,
    frequencyX: c.stretchX,
    frequencyY: c.stretchY,
    octaves: c.octaves,
    lacunarity: c.lacunarity,
    persistence: c.persistence,
  })

  const noiseSettings = {
    sampleMultiplier: c.sampleMultiplier,
    offset: c.offset,
    portrait,
  }

  terminals.forEach(cell => { cell.noise = cell.noiseSample(fbm2, noiseSettings) })

  const min = Math.min(...terminals.map(cell => cell.noise))
  const max = Math.max(...terminals.map(cell => cell.noise))

  terminals.forEach(cell => {
    cell.normalizeNoise(min, max, c.contrast)
    cell.assignPattern(patternOrder)
  })


  // LAYERS — one group per pen, sub-group per line direction

  // Paper colour via CSS, not a <rect> (it would be plotted).
  svg.stage.style.background = theme.white

  const pen = group('pen-1', svg.stage)
  pen.setAttribute('fill', 'none')
  pen.setAttribute('stroke-linecap', 'round')
  pen.setAttribute('stroke-linejoin', 'round')

  const layers = {
    horizontal: group('horizontal', pen),
    vertical: group('vertical', pen),
    diagonal: group('diagonal', pen),
    antiDiagonal: group('anti-diagonal', pen),
  }


  // DRAWING

  terminals.forEach(cell => cell.draw(svg, layers, style))

  if (c.showTrim) svg.drawTrimBox()
}
