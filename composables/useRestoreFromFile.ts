import type { LocationQueryRaw } from 'vue-router'
import { readPngMetadata } from '~/utils/png'
import type { ExportMetadata } from '~/utils/download'

/** Read coding-gallery export metadata from a PNG (iTXt) or SVG (<metadata>) file. */
export async function readExportMetadataFromFile(file: File): Promise<ExportMetadata | null> {
  let meta: unknown = null

  if (file.type === 'image/png' || file.name.toLowerCase().endsWith('.png')) {
    meta = readPngMetadata(await file.arrayBuffer())
  } else if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
    const doc = new DOMParser().parseFromString(await file.text(), 'image/svg+xml')
    const text = doc.querySelector('metadata[data-coding-gallery="export"]')?.textContent
    try { meta = text ? JSON.parse(text) : null } catch { meta = null }
  }

  if (!meta || typeof meta !== 'object' || (meta as ExportMetadata).source !== 'coding-gallery') return null
  return meta as ExportMetadata
}

/**
 * Build a route from export metadata.
 * Path + query come from `sourceUrl` (host dropped, so localhost exports restore on the live
 * site and vice versa). Embedded controls are layered on top as plain keys, which the
 * control loader accepts as a fallback — this also recovers values set via `setControls()`
 * that never reached the URL. Scoped (per-sketch) URL keys still take precedence.
 */
export function routeFromExportMetadata(meta: ExportMetadata): { path: string, query: LocationQueryRaw } | null {
  if (!meta.sourceUrl) return null
  const url = new URL(meta.sourceUrl)

  const query: LocationQueryRaw = {}
  url.searchParams.forEach((value, key) => {
    const existing = query[key]
    if (existing === undefined) query[key] = value
    else query[key] = Array.isArray(existing) ? [...existing, value] : [existing as string, value]
  })

  for (const [key, value] of Object.entries(meta.controls ?? {})) {
    if (key in query) continue
    query[key] = Array.isArray(value) ? value.map(String) : String(value)
  }
  if (meta.seed) query.seed = meta.seed

  return { path: url.pathname, query }
}

/** Drop a PNG/SVG export anywhere on the page to restore its sketch, seed and controls. */
export function useRestoreFromFile() {
  const router = useRouter()
  const hasFiles = (event: DragEvent) => event.dataTransfer?.types.includes('Files') ?? false

  const onDragOver = (event: DragEvent) => {
    if (hasFiles(event)) event.preventDefault()
  }

  const onDrop = async (event: DragEvent) => {
    if (!hasFiles(event)) return
    event.preventDefault()
    const file = event.dataTransfer?.files[0]
    if (!file) return

    const meta = await readExportMetadataFromFile(file)
    const route = meta ? routeFromExportMetadata(meta) : null
    if (!meta || !route) {
      console.warn(`[restore] No coding-gallery metadata found in "${file.name}"`)
      return
    }
    console.log('[restore]', meta)
    // Full reload: seed and controls are only read from the URL on project init,
    // so a client-side query change on the same project wouldn't re-seed.
    window.location.assign(router.resolve(route).href)
  }

  onMounted(() => {
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('drop', onDrop)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('dragover', onDragOver)
    window.removeEventListener('drop', onDrop)
  })
}
