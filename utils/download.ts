import { Color } from './color'

export type DownloadControlValues = Record<string, number | boolean | string | Array<string | number>>

function sanitizeToken(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')
}

export function formatDownloadTimestamp(date: Date = new Date()): string {
  return date
    .toLocaleString('sv-SE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
    .replace(/[:.]/g, '-')
    .replace(/\s/g, '_')
}

function normalizeControls(controls?: DownloadControlValues): DownloadControlValues | undefined {
  if (!controls) return undefined

  const sortedEntries = Object.entries(controls).sort(([a], [b]) => a.localeCompare(b))
  if (sortedEntries.length === 0) return undefined
  return Object.fromEntries(sortedEntries)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function parseOpacity(token: string): number | null {
  const isPercent = token.endsWith('%')
  const raw = Number.parseFloat(token)
  if (!Number.isFinite(raw)) return null
  const value = isPercent ? raw / 100 : raw
  return clamp(value, 0, 1)
}

function formatOpacity(value: number): string {
  const clamped = clamp(value, 0, 1)
  return clamped.toFixed(6).replace(/\.?0+$/, '')
}

function parseAlphaColorFunction(value: string): { hex: string, alpha: number } | null {
  const input = value.trim()
  if (!/^rgba?\(/i.test(input) && !/^hsla?\(/i.test(input)) return null
  const parsedColor = Color.parse(input)
  if (!parsedColor) return null
  return {
    hex: parsedColor.toHex(false).toUpperCase(),
    alpha: parsedColor.a
  }
}

function normalizeAlphaPresentationAttrs(root: Element): void {
  const nodes: Element[] = [root, ...Array.from(root.querySelectorAll('*'))]
  const colorAttrs = [
    { color: 'fill', opacity: 'fill-opacity' },
    { color: 'stroke', opacity: 'stroke-opacity' }
  ] as const

  for (const node of nodes) {
    for (const attrs of colorAttrs) {
      const colorValue = node.getAttribute(attrs.color)
      if (!colorValue) continue

      const parsedColor = parseAlphaColorFunction(colorValue)
      if (!parsedColor) continue

      const existingOpacity = parseOpacity(node.getAttribute(attrs.opacity) ?? '')
      const combinedOpacity = parsedColor.alpha * (existingOpacity ?? 1)

      node.setAttribute(attrs.color, parsedColor.hex)
      node.setAttribute(attrs.opacity, formatOpacity(combinedOpacity))
    }
  }
}

export function buildSvgDownloadFilename(input: {
  projectId?: string
  seed?: string
}): string {
  const projectId = sanitizeToken(input.projectId || 'project')
  const timestamp = formatDownloadTimestamp()
  const seed = input.seed ? sanitizeToken(input.seed) : ''

  const segments = [projectId, timestamp]
  if (seed) segments.push(seed)

  return `${segments.join('_')}.svg`
}

export function serializeSvgWithMetadata(
  svgElement: SVGElement,
  input: {
    projectId?: string
    seed?: string
    controls?: DownloadControlValues
    sourceUrl?: string
  }
): string {
  const clonedSvg = svgElement.cloneNode(true) as SVGElement
  normalizeAlphaPresentationAttrs(clonedSvg)
  const ns = clonedSvg.namespaceURI || 'http://www.w3.org/2000/svg'
  const metadataElement = document.createElementNS(ns, 'metadata')
  const now = new Date()

  metadataElement.setAttribute('data-coding-gallery', 'export')
  metadataElement.textContent = JSON.stringify({
    source: 'coding-gallery',
    version: 1,
    projectId: input.projectId || null,
    seed: input.seed || null,
    exportedAt: formatDownloadTimestamp(now),
    exportedAtIso: now.toISOString(),
    sourceUrl: input.sourceUrl || null,
    controls: normalizeControls(input.controls) || null
  })

  const existingMetadata = clonedSvg.querySelector('metadata[data-coding-gallery="export"]')
  if (existingMetadata && existingMetadata.parentNode) {
    existingMetadata.parentNode.removeChild(existingMetadata)
  }
  clonedSvg.insertBefore(metadataElement, clonedSvg.firstChild)

  const serialized = new XMLSerializer().serializeToString(clonedSvg)
  const withNamespace = serialized.includes('xmlns=')
    ? serialized
    : serialized.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')

  return withNamespace.startsWith('<?xml')
    ? withNamespace
    : `<?xml version="1.0" encoding="UTF-8"?>\n${withNamespace}`
}
