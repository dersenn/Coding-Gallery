import type { CleanupFunction, ProjectContext } from '~/types/project'
import p5 from 'p5'

/**
 * 220203 Type In Space (C4TA p5 migration)
 *
 * Intent:
 * - Preserve the original "glyph in depth" composition for letter outlines in WEBGL.
 *
 * What is being tested/preserved:
 * - Font outline sampling via `textToPoints`.
 * - Chunked depth-layer rendering with RGB-separated stroke groups.
 * - Camera orbit around centered glyph under orthographic projection.
 *
 * Non-goals:
 * - Not a general typography editor; glyph, chunk count, and camera language remain fixed.
 */
type GlyphPoint = {
  x: number
  y: number
}

type FontWithLegacyOutlineApis = p5.Font & {
  textToPoints: (
    text: string,
    x: number,
    y: number,
    fontSize: number,
    options?: { sampleFactor?: number; simplifyThreshold?: number }
  ) => GlyphPoint[]
}

type GlyphState = {
  chunks: GlyphPoint[][]
}

const FONT_PATH = '/assets/fonts/MunkenSans-Medium.otf'
const GLYPH_TEXT = 'C'
const GLYPH_CHUNKS = 3
const GLYPH_SAMPLE_FACTOR = 0.3
const CAMERA_DISTANCE_FACTOR = 0.1
const ORTHO_FRUSTUM_SCALE = 0.02

export async function init(
  container: HTMLElement,
  _context: ProjectContext
): Promise<CleanupFunction> {
  let font: FontWithLegacyOutlineApis | null = null
  let cam: p5.Camera | null = null
  let glyph: GlyphState = { chunks: [] }
  let glyphFontSize = 0
  let colors: p5.Color[] = []

  const buildGlyph = () => {
    if (!font) return

    const rawPoints = font.textToPoints(
      GLYPH_TEXT,
      0,
      0,
      glyphFontSize,
      { sampleFactor: GLYPH_SAMPLE_FACTOR, simplifyThreshold: 0 }
    )
    if (rawPoints.length === 0) {
      glyph = { chunks: [] }
      return
    }

    // Derive bounds from outline points, then mirror legacy placement:
    // original sketch used x = -bounds.w / 2 and y = bounds.h / 2.
    let minX = Number.POSITIVE_INFINITY
    let maxX = Number.NEGATIVE_INFINITY
    let minY = Number.POSITIVE_INFINITY
    let maxY = Number.NEGATIVE_INFINITY
    for (let i = 0; i < rawPoints.length; i++) {
      const pt = rawPoints[i]!
      if (pt.x < minX) minX = pt.x
      if (pt.x > maxX) maxX = pt.x
      if (pt.y < minY) minY = pt.y
      if (pt.y > maxY) maxY = pt.y
    }

    const boundsWidth = maxX - minX
    const boundsHeight = maxY - minY
    const legacyOffsetX = -boundsWidth / 2
    const legacyOffsetY = boundsHeight / 2
    const points = rawPoints.map((pt) => ({
      x: pt.x + legacyOffsetX,
      y: pt.y + legacyOffsetY
    }))

    const chunkSize = points.length / GLYPH_CHUNKS
    const chunks: GlyphPoint[][] = []
    for (let c = 0; c < points.length; c += chunkSize) {
      chunks.push(points.slice(c, c + chunkSize))
    }

    glyph = { chunks }
  }

  const sketch = new p5((p) => {
    p.setup = () => {
      p.createCanvas(container.clientWidth, container.clientHeight, p.WEBGL)
      glyphFontSize = Math.max(1, p.width / 2)
      colors = [p.color(255, 0, 0), p.color(0, 255, 0), p.color(0, 0, 255)]
      cam = p.createCamera()

      void p.loadFont(FONT_PATH).then((loadedFont) => {
        font = loadedFont as FontWithLegacyOutlineApis
        buildGlyph()
      })
    }

    p.draw = () => {
      if (!cam || glyph.chunks.length === 0) return

      // Step 1: preserve camera orbit + orthographic projection around glyph origin.
      p.orbitControl()
      const halfW = (p.width * ORTHO_FRUSTUM_SCALE) / 2
      const halfH = (p.height * ORTHO_FRUSTUM_SCALE) / 2
      p.ortho(-halfW, halfW, halfH, -halfH, -5000, 5000)
      p.background(255)

      const dist = Math.max(80, glyphFontSize * CAMERA_DISTANCE_FACTOR)
      const speed = p.frameCount / 100
      const camX = Math.cos(speed) * dist
      const camZ = Math.sin(speed) * dist
      cam.lookAt(0, 0, 0)
      cam.setPosition(camX, 0, camZ)

      // Step 2: render point-traced glyph chunks at separated depth layers.
      p.strokeWeight(5)
      p.noFill()
      for (let i = 0; i < glyph.chunks.length; i++) {
        const chunk = glyph.chunks[i]!
        p.stroke(colors[i] ?? colors[colors.length - 1]!)
        p.beginShape()
        for (let ptIdx = 0; ptIdx < chunk.length; ptIdx++) {
          const pt = chunk[ptIdx]!
          p.vertex(pt.x, pt.y, i * 100)
        }
        p.endShape()
      }
    }

    p.windowResized = () => {
      p.resizeCanvas(container.clientWidth, container.clientHeight)
      glyphFontSize = Math.max(1, p.width / 2)
      buildGlyph()
    }
  }, container)

  return () => {
    sketch.remove()
  }
}
