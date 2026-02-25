export type DownloadControlValues = Record<string, number | boolean | string>

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
