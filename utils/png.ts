/**
 * Minimal PNG chunk helpers for exports.
 *
 * - `pHYs` for print DPI
 * - `iTXt` (keyword `coding-gallery`) carrying the same JSON as the SVG `<metadata>` block,
 *   so a sketch can be restored from a saved PNG.
 *
 * Inspect an export with: `exiftool -PNG:all file.png`
 */

export const PNG_METADATA_KEYWORD = 'coding-gallery'

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
/** Signature (8) + IHDR chunk (4 len + 4 type + 13 data + 4 crc). IHDR is always first and 13 bytes. */
const AFTER_IHDR = 33

const encoder = new TextEncoder()
const decoder = new TextDecoder()

let crcTable: Uint32Array | null = null
function crc32(bytes: Uint8Array): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
      crcTable[n] = c >>> 0
    }
  }
  let crc = 0xffffffff
  for (const b of bytes) crc = crcTable[(crc ^ b) & 0xff]! ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function makeChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = encoder.encode(type)
  const out = new Uint8Array(12 + data.length)
  const view = new DataView(out.buffer)
  view.setUint32(0, data.length)
  out.set(typeBytes, 4)
  out.set(data, 8)
  // CRC covers type + data, which sit contiguously at offset 4
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)))
  return out
}

/** Physical pixel density (unit: metre). */
export function pHYsChunk(dpi: number): Uint8Array {
  const ppm = Math.round(dpi / 0.0254)
  const data = new Uint8Array(9)
  const view = new DataView(data.buffer)
  view.setUint32(0, ppm)
  view.setUint32(4, ppm)
  view.setUint8(8, 1)
  return makeChunk('pHYs', data)
}

/**
 * Uncompressed international text chunk (UTF-8).
 * Layout: keyword \0 | compFlag | compMethod | language \0 | translatedKeyword \0 | text
 */
export function iTXtChunk(text: string, keyword = PNG_METADATA_KEYWORD): Uint8Array {
  const k = encoder.encode(keyword)
  const t = encoder.encode(text)
  const data = new Uint8Array(k.length + 5 + t.length) // zero-filled: separators/flags are 0
  data.set(k, 0)
  data.set(t, k.length + 5)
  return makeChunk('iTXt', data)
}

function isPng(bytes: Uint8Array): boolean {
  return PNG_SIGNATURE.every((b, i) => bytes[i] === b)
}

/** Insert chunks directly after IHDR. */
export function insertPngChunks(buffer: ArrayBuffer, chunks: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const src = new Uint8Array(buffer)
  if (!isPng(src) || chunks.length === 0) return src
  const extra = chunks.reduce((n, c) => n + c.length, 0)
  const out = new Uint8Array(src.length + extra)
  out.set(src.subarray(0, AFTER_IHDR))
  let offset = AFTER_IHDR
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  out.set(src.subarray(AFTER_IHDR), offset)
  return out
}

/** Find the `coding-gallery` iTXt chunk and parse its JSON. Returns null if absent/invalid. */
export function readPngMetadata(buffer: ArrayBuffer, keyword = PNG_METADATA_KEYWORD): unknown | null {
  const bytes = new Uint8Array(buffer)
  if (!isPng(bytes)) return null
  const view = new DataView(buffer)
  let i = 8
  while (i + 8 <= bytes.length) {
    const length = view.getUint32(i)
    const type = decoder.decode(bytes.subarray(i + 4, i + 8))
    if (type === 'iTXt') {
      const data = bytes.subarray(i + 8, i + 8 + length)
      const keywordEnd = data.indexOf(0)
      const compressed = data[keywordEnd + 1] === 1
      if (!compressed && decoder.decode(data.subarray(0, keywordEnd)) === keyword) {
        let p = keywordEnd + 3              // skip \0, compFlag, compMethod
        p = data.indexOf(0, p) + 1          // skip language tag
        p = data.indexOf(0, p) + 1          // skip translated keyword
        try {
          return JSON.parse(decoder.decode(data.subarray(p)))
        } catch {
          return null
        }
      }
    }
    if (type === 'IEND') break
    i += 12 + length
  }
  return null
}

/** Encode a canvas to PNG, add DPI/metadata chunks, and trigger a download. */
export function downloadCanvasPng(
  el: HTMLCanvasElement,
  filename: string,
  options: { metadata?: object, dpi?: number } = {}
): void {
  el.toBlob(async (blob) => {
    if (!blob) return
    const chunks: Uint8Array[] = []
    if (options.dpi) chunks.push(pHYsChunk(options.dpi))
    if (options.metadata) chunks.push(iTXtChunk(JSON.stringify(options.metadata)))
    const bytes = insertPngChunks(await blob.arrayBuffer(), chunks)

    const url = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }))
    const link = document.createElement('a')
    link.download = filename
    link.href = url
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    // Revoke after the click has been handled
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }, 'image/png')
}
