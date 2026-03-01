import type {
  CleanupFunction,
  ProjectActionDefinition,
  ProjectContext
} from '~/types/project'
import { Color, Path, SVG, shortcuts, type Vec } from '~/types/project'

/**
 * Source notes preserved from legacy sketch:
 * - https://charlottedann.com/article/soft-blob-physics
 * - https://codepen.io/ksenia-k/pen/RwXVMMY
 */

interface DelaunayTriangle {
  a: Vec
  b: Vec
  c: Vec
  circumcenter: Vec
  radius: number
}


export const actions: ProjectActionDefinition[] = [
  { key: 'download-svg', label: 'Download SVG' }
]

export async function init(
  container: HTMLElement,
  context: ProjectContext
): Promise<CleanupFunction> {
  const { utils, theme, registerAction } = context
  const { v, rnd, dist } = shortcuts(utils)

  const svg = new SVG({
    parent: container,
    id: 'voronoi'
  })

  const pointCount = 20
  const border = 50;

  // Step 1: generate seed-driven points across the full stage.
  const points: Vec[] = Array.from({ length: pointCount }, () => {
    return v(rnd() * (svg.w - border * 2) + border, rnd() * (svg.h - border * 2) + border)
  })

  const allTriangles = (pts: Vec[]): Array<[Vec, Vec, Vec]> => {
    const triangles: Array<[Vec, Vec, Vec]> = []
    for (let i = 0; i < pts.length - 2; i++) {
      for (let j = i + 1; j < pts.length - 1; j++) {
        for (let k = j + 1; k < pts.length; k++) {
          triangles.push([pts[i]!, pts[j]!, pts[k]!])
        }
      }
    }
    return triangles
  }

  const findCircumcircle = (a: Vec, b: Vec, c: Vec): { center: Vec; radius: number } | null => {
    const d =
      2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y))

    // Collinear triangles do not have a stable circumcircle.
    if (Math.abs(d) < 1e-9) return null

    const aSq = a.x * a.x + a.y * a.y
    const bSq = b.x * b.x + b.y * b.y
    const cSq = c.x * c.x + c.y * c.y

    const ux =
      (aSq * (b.y - c.y) + bSq * (c.y - a.y) + cSq * (a.y - b.y)) / d
    const uy =
      (aSq * (c.x - b.x) + bSq * (a.x - c.x) + cSq * (b.x - a.x)) / d

    const center = v(ux, uy)
    const radius = dist(center.x, center.y, a.x, a.y)
    return { center, radius }
  }

  const satisfiesDelaunayCondition = (
    triangle: [Vec, Vec, Vec],
    pts: Vec[]
  ): { center: Vec; radius: number } | null => {
    const [a, b, c] = triangle
    const circle = findCircumcircle(a, b, c)
    if (!circle) return null

    for (const pt of pts) {
      if (pt === a || pt === b || pt === c) continue
      if (dist(pt.x, pt.y, circle.center.x, circle.center.y) < circle.radius - 1e-9) {
        return null
      }
    }

    return circle
  }

  // Step 2: brute-force Delaunay candidates and keep only valid triangles.
  const delaunayTriangles: DelaunayTriangle[] = []
  for (const triangle of allTriangles(points)) {
    const circle = satisfiesDelaunayCondition(triangle, points)
    if (!circle) continue
    delaunayTriangles.push({
      a: triangle[0],
      b: triangle[1],
      c: triangle[2],
      circumcenter: circle.center,
      radius: circle.radius
    })
  }

  // Step 3: render triangulation strokes + circumcenters using theme palette.
  for (const triangle of delaunayTriangles) {
    const path = new Path([triangle.a, triangle.b, triangle.c], true)
    const paletteIndex = utils.seed.randomInt(0, Math.max(0, theme.palette.length - 1))
    const parsed = Color.parse(theme.palette[paletteIndex] ?? theme.foreground)
    const edgeStroke = (parsed?.withAlpha(0.3).toRgbaString()) ?? theme.foreground
    const circumStroke = (parsed?.withAlpha(0.14).toRgbaString()) ?? theme.foreground
    const centerFill = (parsed?.withAlpha(0.55).toRgbaString()) ?? theme.foreground
    svg.makePath(path.buildPolygon(), 'transparent', edgeStroke, 2)
    svg.makeCircle(triangle.circumcenter, triangle.radius, 'none', circumStroke, 1)
    svg.makeCircle(triangle.circumcenter, 4, centerFill)
  }

  // Step 4: overlay point markers for the sampled sites.
  svg.makeCircles(points, 5, theme.palette[0] ?? theme.foreground)

  registerAction('download-svg', () => {
    svg.save(utils.seed.current, 'voronoi')
  })

  return () => {
    svg.stage.remove()
  }
}
