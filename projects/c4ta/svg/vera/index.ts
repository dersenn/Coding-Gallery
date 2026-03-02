import type {
  CleanupFunction,
  ProjectActionDefinition,
  ProjectContext,
  ProjectControlDefinition
} from '~/types/project'
import { SVG, shortcuts } from '~/types/project'
import { syncControlState } from '~/composables/useControls'

type VeraLayer = 'vera1' | 'vera2'

/**
 * A Vera 2 (C4TA SVG migration)
 *
 * Intent:
 * - Preserve the original overlapping-tile line compositions and center-origin framing.
 *
 * What is being tested/preserved:
 * - Variant contrast:
 *   - Vera 1: constrained line-choice motifs per tile.
 *   - Vera 2: diagonal motifs with jittered vertical progression.
 * - Deterministic toggling: enabling/disabling layers should not reshuffle line choices.
 *
 * Non-goals:
 * - Not a generic overlap-grid utility yet; formulas remain local to preserve behavior.
 */
const VIRTUAL_HEIGHT = 100
const TILE_OVERLAP_FACTOR = 3
const BASE_STROKE = 0.2
const DEFAULT_DIVISIONS = 12

export const controls: ProjectControlDefinition[] = [
  {
    type: 'group',
    id: 'composition',
    label: 'Composition',
    collapsible: true,
    defaultOpen: true,
    controls: [
      {
        type: 'checkbox-group',
        label: 'Sketches',
        key: 'enabledLayers',
        default: ['vera1'],
        options: [
          { label: 'Vera 1', value: 'vera1' },
          { label: 'Vera 2', value: 'vera2' }
        ]
      }
    ]
  }
]

export const actions: ProjectActionDefinition[] = [
  { key: 'download-svg', label: 'Download SVG' }
]

export async function init(
  container: HTMLElement,
  context: ProjectContext
): Promise<CleanupFunction> {
  const { controls, utils, theme, onControlChange, registerAction } = context
  const { v, simplex2 } = shortcuts(utils)

  const controlState = {
    enabledLayers: controls.enabledLayers as VeraLayer[]
  }

  container.style.display = 'flex'
  container.style.alignItems = 'center'
  container.style.justifyContent = 'center'

  const size = Math.min(container.clientWidth, container.clientHeight)
  const svg = new SVG({
    parent: container,
    id: 'vera',
    width: size,
    height: size
  })

  const res = size / VIRTUAL_HEIGHT
  const virtualWidth = svg.w / res
  const virtualMin = Math.min(virtualWidth, VIRTUAL_HEIGHT)

  // Keep legacy color intent, but source from active theme when available.
  const vera1Color = theme.palette[0] ?? '#0000ff'
  const vera2Color = theme.palette[2] ?? '#ff0000'

  // Convert legacy center-origin virtual coordinates into SVG pixel coordinates.
  const toStagePoint = (x: number, y: number) =>
    v(svg.c.x + x * res, svg.c.y + y * res)

  const drawVirtualLine = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string
  ) => {
    svg.makeLine(
      toStagePoint(x1, y1),
      toStagePoint(x2, y2),
      color,
      BASE_STROKE * res
    )
  }

  // Deterministic value per layer/cell/channel so control toggles do not reshuffle existing lines.
  const stableUnit = (
    layerOffset: number,
    channelOffset: number,
    x: number,
    y: number
  ): number => {
    const n = simplex2(
      x * 0.173 + y * 0.097 + layerOffset,
      y * 0.211 - x * 0.139 + channelOffset
    )
    return (n + 1) / 2
  }

  const stableIndex = (
    layerOffset: number,
    channelOffset: number,
    x: number,
    y: number,
    length: number
  ): number => {
    // Convert stable [0..1] value into bounded integer index for variant arrays.
    const scaled = Math.floor(stableUnit(layerOffset, channelOffset, x, y) * length)
    return Math.min(scaled, Math.max(0, length - 1))
  }

  const drawVera1 = (xPos: number, yPos: number, w: number, h: number, divisions: number) => {
    const cols = divisions
    const rows = cols
    const tileW = (w * TILE_OVERLAP_FACTOR) / (-cols + 3 + cols * TILE_OVERLAP_FACTOR)
    const tileH = (h * TILE_OVERLAP_FACTOR) / (-rows + 3 + rows * TILE_OVERLAP_FACTOR)
    const xOverlap = tileW / TILE_OVERLAP_FACTOR
    const yOverlap = tileH / TILE_OVERLAP_FACTOR

    // Overlap grid starts one overlap unit in, matching original composition framing.
    const startX = xPos + xOverlap
    const startY = yPos + yOverlap

    for (let x = 0; x < cols; x++) {
      const xOff = startX + x * (tileW - xOverlap)
      for (let y = 0; y < rows; y++) {
        const yOff = startY + y * (tileH - yOverlap)
        // Four motif candidates from legacy Vera 1.
        const positions = [
          [xOff, yOff, xOff + tileW, yOff + tileH],
          [xOff, yOff + tileH, xOff + tileW, yOff],
          [xOff + tileW / 2, yOff, xOff + tileW / 2, yOff + tileH],
          [xOff, yOff + tileH / 2, xOff + tileW, yOff + tileH / 2]
        ] as const
        const index = stableIndex(12.7, 3.1, x, y, positions.length)
        const line = positions[index]!
        drawVirtualLine(line[0], line[1], line[2], line[3], vera1Color)
      }
    }
  }

  const drawVera2 = (xPos: number, yPos: number, w: number, h: number, cols: number, rows: number) => {
    const tileW = (w * TILE_OVERLAP_FACTOR) / (-cols + 3 + cols * TILE_OVERLAP_FACTOR)
    const tileH = (h * TILE_OVERLAP_FACTOR) / (-rows + 3 + rows * TILE_OVERLAP_FACTOR)
    const xOverlap = tileW / TILE_OVERLAP_FACTOR
    const yOverlap = tileH / TILE_OVERLAP_FACTOR

    const startX = xPos + xOverlap
    const startY = yPos + yOverlap

    for (let x = 0; x < cols; x++) {
      const xOff = startX + x * (tileW - xOverlap)
      for (let y = 0; y < rows; y++) {
        // Legacy quirk preserved: y progression uses a per-cell jitter multiplier.
        const yOffsetSteps = Math.max(1, Math.floor(h / rows))
        const yJitter = Math.floor(stableUnit(41.3, 5.7, x, y) * yOffsetSteps)
        const yOff = startY + y * yJitter
        const variableHeight = stableUnit(41.3, 11.2, x, y) * tileH
        const positions = [
          [xOff, yOff, xOff + tileW, yOff + variableHeight],
          [xOff, yOff + variableHeight, xOff + tileW, yOff]
        ] as const
        const index = stableIndex(41.3, 17.9, x, y, positions.length)
        const line = positions[index]!
        drawVirtualLine(line[0], line[1], line[2], line[3], vera2Color)
      }
    }
  }

  const draw = () => {
    svg.stage.innerHTML = ''
    svg.makeRect(v(0, 0), svg.w, svg.h, theme.background, 'none', 0)

    // Render order keeps Vera 1 on top when both are enabled, matching migration baseline.
    const enabledLayers = new Set(controlState.enabledLayers)
    if (enabledLayers.has('vera2')) {
      drawVera2(-virtualMin / 2, -virtualMin / 2, virtualMin, virtualMin, DEFAULT_DIVISIONS, DEFAULT_DIVISIONS)
    }
    if (enabledLayers.has('vera1')) {
      drawVera1(-virtualMin / 2, -virtualMin / 2, virtualMin, virtualMin, DEFAULT_DIVISIONS)
    }
  }

  draw()

  onControlChange((nextControls) => {
    syncControlState(controlState, nextControls)
    draw()
  })

  registerAction('download-svg', () => {
    svg.save(utils.seed.current, 'vera')
  })

  return () => {
    svg.stage.remove()
  }
}
