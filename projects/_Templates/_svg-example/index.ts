import type { ProjectContext, CleanupFunction, ControlDefinition } from '~/types/project'
import { SVG, Path } from '~/utils/svg'
import { shortcuts } from '~/utils/shortcuts'

/**
 * SVG Example: Generative Grid Pattern
 * 
 * Demonstrates:
 * - Basic shapes (circles, lines, rectangles)
 * - Path construction with bezier curves
 * - Vector operations
 * - Seeded randomness
 * - Control panel integration
 */

// Export controls - defined in the sketch
export const controls: ControlDefinition[] = [
  {
    type: 'slider',
    label: 'Grid Size',
    key: 'gridSize',
    default: 8,
    min: 3,
    max: 20,
    step: 1
  },
  {
    type: 'slider',
    label: 'Complexity',
    key: 'complexity',
    default: 4,
    min: 2,
    max: 8,
    step: 1
  },
  {
    type: 'slider',
    label: 'Stroke Width',
    key: 'strokeWidth',
    default: 1.5,
    min: 0.5,
    max: 5,
    step: 0.5
  },
  {
    type: 'toggle',
    label: 'Show Noise Field',
    key: 'showNoise',
    default: false
  }
]

export async function init(
  container: HTMLElement,
  context: ProjectContext
): Promise<CleanupFunction> {
  const { controls, utils, onControlChange } = context
  const { v, rnd, rndInt, map, rad, noise2 } = shortcuts(utils)

  // Get control values
  let gridSize = controls.gridSize as number
  let complexity = controls.complexity as number
  let showNoise = controls.showNoise as boolean
  let strokeWidth = controls.strokeWidth as number

  // Create SVG canvas
  const svg = new SVG({
    parent: container,
    id: 'svg-example',
  })

  function draw() {
    // Clear previous content
    svg.stage.innerHTML = ''

    // Add white background
    svg.makeRect(v(0, 0), svg.w, svg.h, '#ffffff', 'none')

    const cols = gridSize
    const rows = gridSize
    const cellW = svg.w / cols
    const cellH = svg.h / rows

    // Draw grid cells
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const x = i * cellW
        const y = j * cellH
        const center = v(x + cellW / 2, y + cellH / 2)

        // Use noise to determine pattern
        const noiseVal = noise2(i * 0.2, j * 0.2)
        const pattern = Math.floor(noiseVal * complexity)

        switch (pattern % 4) {
          case 0:
            // Circle
            const r = map(noiseVal, 0, 1, 5, cellW / 3)
            svg.makeCircle(center, r, 'none', '#000', strokeWidth)
            break

          case 1:
            // Diagonal line
            const corner1 = v(x, y)
            const corner2 = v(x + cellW, y + cellH)
            svg.makeLine(corner1, corner2, '#000', strokeWidth)
            break

          case 2:
            // Random bezier curve
            const pts = [
              v(x + rnd() * cellW * 0.3, y + rnd() * cellH * 0.3),
              v(x + cellW * (0.3 + rnd() * 0.4), y + cellH * (0.3 + rnd() * 0.4)),
              v(x + cellW * (0.6 + rnd() * 0.4), y + cellH * (0.6 + rnd() * 0.4)),
            ]
            const path = new Path(pts, false)
            const pathStr = path.buildSpline(0.4)
            svg.makePath(pathStr, 'none', '#000', strokeWidth)
            break

          case 3:
            // Small rect
            const rectSize = map(noiseVal, 0, 1, cellW * 0.2, cellW * 0.6)
            const rectPos = v(
              center.x - rectSize / 2,
              center.y - rectSize / 2
            )
            svg.makeRect(rectPos, rectSize, rectSize, 'none', '#000', strokeWidth)
            break
        }

        // Optional: show noise field as background
        if (showNoise) {
          const opacity = map(noiseVal, 0, 1, 0, 0.3)
          svg.makeRect(
            v(x, y),
            cellW,
            cellH,
            `rgba(0, 0, 255, ${opacity})`,
            'none'
          )
        }
      }
    }

    // Add border
    svg.makeRect(v(0, 0), svg.w, svg.h, 'none', '#00ff00', strokeWidth * 2)

    // Add some decorative circles at corners
    const cornerRadius = 20
    const corners = [
      v(cornerRadius, cornerRadius),
      v(svg.w - cornerRadius, cornerRadius),
      v(cornerRadius, svg.h - cornerRadius),
      v(svg.w - cornerRadius, svg.h - cornerRadius),
    ]
    svg.makeCircles(corners, cornerRadius / 2, '#000', 'none')

    // Create a complex spline path across the canvas
    const splinePts: any[] = []
    const numSplinePts = 6
    for (let i = 0; i < numSplinePts; i++) {
      splinePts.push(
        v(
          map(i, 0, numSplinePts - 1, 50, svg.w - 50),
          svg.h / 2 + Math.sin(i * 0.5) * 100 + rnd() * 50 - 25
        )
      )
    }
    const spline = new Path(splinePts, false)
    const splineStr = spline.buildSpline(0.3)
    svg.makePath(splineStr, 'none', 'rgba(255, 0, 0, 0.6)', strokeWidth * 1.5)
  }

  // Initial draw
  draw()

  // React to control changes
  onControlChange((newControls) => {
    gridSize = newControls.gridSize as number
    complexity = newControls.complexity as number
    showNoise = newControls.showNoise as boolean
    strokeWidth = newControls.strokeWidth as number
    draw()
  })

  // Keyboard shortcut for downloading SVG
  const handleKeyPress = (event: KeyboardEvent) => {
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement
    ) {
      return
    }
    
    if (event.key.toLowerCase() === 'd') {
      event.preventDefault()
      svg.save(utils.seed.current, 'svg-grid')
    }
  }
  
  window.addEventListener('keydown', handleKeyPress)

  // Cleanup function
  return () => {
    window.removeEventListener('keydown', handleKeyPress)
    svg.stage.remove()
  }
}
