// worker.js
// Module worker: decodes sources at display size, renders pixelated steps
// (downscale → effects → bitmap) and releases sources. Every request with a
// `rid` gets a reply, either a result or `{ rid, error }`.

import { applyEffects, extractDominantColors } from './effects.js';

/**
 * key → Promise<{ bitmap: ImageBitmap, width: number, height: number, dominant: Map<number, string[]> }>
 * Promises (not values) so render/release can wait on an in-flight load.
 */
const sources = new Map();

// Reused for every render; transferToImageBitmap() hands its contents off.
let scratch = null;
let fallbackLogged = false;

function getScratch(width, height) {
  if (!scratch) {
    scratch = new OffscreenCanvas(width, height);
  } else {
    scratch.width = width;
    scratch.height = height;
  }
  return scratch.getContext('2d', { willReadFrequently: true });
}

async function decode(url, targetWidth) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Fetch failed (${response.status}): ${url}`);
  const blob = await response.blob();

  try {
    const bitmap = await createImageBitmap(blob, { resizeWidth: targetWidth, resizeQuality: 'high' });
    if (bitmap.width === targetWidth) return bitmap;
    bitmap.close();
  } catch {
    // Fall through to manual resize
  }

  if (!fallbackLogged) {
    fallbackLogged = true;
    console.info('[pixelate] createImageBitmap resizeWidth unsupported, using OffscreenCanvas resize');
  }

  const native = await createImageBitmap(blob);
  const targetHeight = Math.max(1, Math.round(native.height * targetWidth / native.width));
  const canvas = new OffscreenCanvas(targetWidth, targetHeight);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(native, 0, 0, targetWidth, targetHeight);
  native.close();
  return canvas.transferToImageBitmap();
}

function load({ key, url, targetWidth }) {
  let entry = sources.get(key);
  if (!entry) {
    entry = decode(url, targetWidth).then((bitmap) => ({
      bitmap,
      width: bitmap.width,
      height: bitmap.height,
      dominant: new Map()
    }));
    sources.set(key, entry);
    // Don't cache failures — a later load may succeed
    entry.catch(() => {
      if (sources.get(key) === entry) sources.delete(key);
    });
  }
  return entry;
}

function getSource(key) {
  const entry = sources.get(key);
  if (!entry) throw new Error(`Source not loaded: ${key}`);
  return entry;
}

function dominantColors(source, count) {
  let colors = source.dominant.get(count);
  if (!colors) {
    const ctx = getScratch(source.width, source.height);
    ctx.drawImage(source.bitmap, 0, 0);
    colors = extractDominantColors(ctx.getImageData(0, 0, source.width, source.height), count);
    source.dominant.set(count, colors);
  }
  return colors;
}

// Replace ['dominant', n] duotone colours with hex colours from the full source
function resolveEffects(source, effects) {
  if (!effects) return null;
  return effects.map((effect) => {
    if (effect.type === 'duotone' && Array.isArray(effect.colors) && effect.colors[0] === 'dominant') {
      const colors = dominantColors(source, typeof effect.colors[1] === 'number' ? effect.colors[1] : 2);
      return { ...effect, colors };
    }
    return effect;
  });
}

async function render({ key, grain, effects, strength = 1 }) {
  const source = await getSource(key);
  const hasEffects = Array.isArray(effects) && effects.length > 0 && strength > 0;
  if (grain === 'full' && !hasEffects) {
    return createImageBitmap(source.bitmap);
  }

  const { width, height } = source;
  let scale = 1; // 'full' with effects: same size, point-sampled = exact copy
  if (grain !== 'full') {
    const grainNum = Number(grain);
    if (!Number.isFinite(grainNum) || grainNum <= 0) {
      throw new Error(`Invalid grain: ${grain}`);
    }
    scale = Math.min(width, height) / grainNum;
  }
  const scaledWidth = Math.max(1, Math.ceil(width / scale));
  const scaledHeight = Math.max(1, Math.ceil(height / scale));

  // Resolve before sizing scratch for the downscale (dominant uses it at full size)
  const resolved = hasEffects ? resolveEffects(source, effects) : null;

  const ctx = getScratch(scaledWidth, scaledHeight);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(source.bitmap, 0, 0, scaledWidth, scaledHeight);

  if (resolved) {
    const imageData = ctx.getImageData(0, 0, scaledWidth, scaledHeight);
    applyEffects(imageData, resolved, strength);
    ctx.putImageData(imageData, 0, 0);
  }

  return scratch.transferToImageBitmap();
}

async function release({ key }) {
  const entry = sources.get(key);
  if (!entry) return;
  sources.delete(key);
  try {
    (await entry).bitmap.close();
  } catch {
    // Load failed; nothing to close
  }
}

self.onmessage = async (e) => {
  const msg = e.data;
  const { rid } = msg;
  try {
    switch (msg.type) {
      case 'load': {
        const { width, height } = await load(msg);
        self.postMessage({ rid, width, height });
        break;
      }
      case 'render': {
        const bitmap = await render(msg);
        self.postMessage({ rid, bitmap }, [bitmap]);
        break;
      }
      case 'release':
        await release(msg);
        if (rid !== undefined) self.postMessage({ rid });
        break;
      default:
        throw new Error(`Unknown message type: ${msg.type}`);
    }
  } catch (err) {
    if (rid !== undefined) {
      self.postMessage({ rid, error: err instanceof Error ? err.message : String(err) });
    }
  }
};
