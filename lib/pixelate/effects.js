// effects.js
// Per-pixel image effects. Applied in the worker AFTER the point-sampled
// downscale (per-pixel ops commute with point sampling, so the output is
// identical to applying them at full resolution — at a fraction of the cost).
// No DOM access: importable from both main thread and worker.

/**
 * Apply contrast adjustment to image data
 * @param {ImageData} imageData - Canvas ImageData object
 * @param {number} amount - Contrast amount (1.0 = no change, >1 = more contrast, <1 = less contrast)
 * @returns {ImageData} Modified ImageData
 */
export function applyContrast(imageData, amount) {
  const data = imageData.data;
  
  // Simple contrast formula: factor = amount
  // For each pixel: newValue = (value - 128) * factor + 128
  // This centers the effect around middle gray (128)
  const factor = amount;
  
  for (let i = 0; i < data.length; i += 4) {
    data[i] = (data[i] - 128) * factor + 128;       // Red
    data[i + 1] = (data[i + 1] - 128) * factor + 128; // Green
    data[i + 2] = (data[i + 2] - 128) * factor + 128; // Blue
    // Alpha (i + 3) stays unchanged
    
    // Clamp values to 0-255 range
    data[i] = Math.max(0, Math.min(255, data[i]));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1]));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2]));
  }
  
  return imageData;
}

/**
 * Apply saturation adjustment to image data
 * @param {ImageData} imageData - Canvas ImageData object
 * @param {number} amount - Saturation amount (0 = grayscale, 1 = no change, >1 = more saturated)
 * @returns {ImageData} Modified ImageData
 */
export function applySaturation(imageData, amount) {
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Calculate luminance (grayscale)
    const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
    
    // Interpolate between grayscale and original color
    data[i] = gray + amount * (r - gray);
    data[i + 1] = gray + amount * (g - gray);
    data[i + 2] = gray + amount * (b - gray);
  }
  
  return imageData;
}

/**
 * Apply brightness adjustment to image data
 * @param {ImageData} imageData - Canvas ImageData object
 * @param {number} amount - Brightness amount (-255 to 255, 0 = no change)
 * @returns {ImageData} Modified ImageData
 */
export function applyBrightness(imageData, amount) {
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.max(0, Math.min(255, data[i] + amount));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + amount));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + amount));
  }
  
  return imageData;
}

/**
 * Extract dominant colors from image data using simple color quantization
 * @param {ImageData} imageData - Canvas ImageData object
 * @param {number} count - Number of dominant colors to extract
 * @returns {Array<string>} Array of hex color strings
 */
export function extractDominantColors(imageData, count = 2) {
  const data = imageData.data;
  const colorMap = new Map();
  
  // Sample every nth pixel for performance (adjust sampling rate based on image size)
  const sampleRate = Math.max(1, Math.floor(data.length / (4 * 10000)));
  
  // Reduce color space by rounding to nearest 32 (reduces 16M colors to ~32K)
  const colorBucket = 32;
  
  for (let i = 0; i < data.length; i += 4 * sampleRate) {
    const r = Math.round(data[i] / colorBucket) * colorBucket;
    const g = Math.round(data[i + 1] / colorBucket) * colorBucket;
    const b = Math.round(data[i + 2] / colorBucket) * colorBucket;
    
    const key = `${r},${g},${b}`;
    colorMap.set(key, (colorMap.get(key) || 0) + 1);
  }
  
  // Sort by frequency and get top N colors
  const sortedColors = Array.from(colorMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([rgb]) => {
      const [r, g, b] = rgb.split(',').map(Number);
      return rgbToHex(r, g, b);
    });
  
  return sortedColors;
}

/**
 * Apply duotone effect to image data
 * @param {ImageData} imageData - Canvas ImageData object
 * @param {string} color1 - First color (hex string or 'dominant')
 * @param {string} color2 - Second color (hex string)
 * @returns {ImageData} Modified ImageData
 */
export function applyDuotone(imageData, color1, color2) {
  const data = imageData.data;
  
  // Handle 'dominant' color extraction
  let colors = [color1, color2];
  if (color1 === 'dominant' && typeof color2 === 'number') {
    // color2 is actually the count
    colors = extractDominantColors(imageData, color2);
  } else if (color1 === 'dominant') {
    colors = extractDominantColors(imageData, 2);
  }
  
  const rgb1 = hexToRgb(colors[0]);
  const rgb2 = hexToRgb(colors[1]);
  
  for (let i = 0; i < data.length; i += 4) {
    // Calculate luminance
    const luminance = (0.2989 * data[i] + 0.5870 * data[i + 1] + 0.1140 * data[i + 2]) / 255;
    
    // Interpolate between the two colors based on luminance
    data[i] = rgb1.r + luminance * (rgb2.r - rgb1.r);
    data[i + 1] = rgb1.g + luminance * (rgb2.g - rgb1.g);
    data[i + 2] = rgb1.b + luminance * (rgb2.b - rgb1.b);
  }
  
  return imageData;
}

/**
 * Apply posterize effect (reduce number of colors)
 * @param {ImageData} imageData - Canvas ImageData object
 * @param {number} levels - Number of levels per channel (2-256)
 * @returns {ImageData} Modified ImageData
 */
export function applyPosterize(imageData, levels) {
  const data = imageData.data;
  const step = 255 / (levels - 1);
  
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.round(data[i] / step) * step;
    data[i + 1] = Math.round(data[i + 1] / step) * step;
    data[i + 2] = Math.round(data[i + 2] / step) * step;
  }
  
  return imageData;
}

/**
 * Apply threshold effect (convert to black and white at a threshold)
 * @param {ImageData} imageData - Canvas ImageData object
 * @param {number} threshold - Threshold value (0-255)
 * @returns {ImageData} Modified ImageData
 */
export function applyThreshold(imageData, threshold) {
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const luminance = 0.2989 * data[i] + 0.5870 * data[i + 1] + 0.1140 * data[i + 2];
    const value = luminance >= threshold ? 255 : 0;
    
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
  }
  
  return imageData;
}

/**
 * Apply color inversion effect with optional strength
 * @param {ImageData} imageData - Canvas ImageData object
 * @param {number} strength - Inversion strength (0 = original, 1 = fully inverted)
 * @returns {ImageData} Modified ImageData
 */
export function applyInvert(imageData, strength = 1.0) {
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    // Blend between original and inverted colors
    // At strength 0: original color
    // At strength 1: inverted color (255 - original)
    // Formula: newValue = original * (1 - strength) + inverted * strength
    //        = original * (1 - strength) + (255 - original) * strength
    //        = original + (255 - 2 * original) * strength
    
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    data[i] = r + (255 - 2 * r) * strength;         // Red
    data[i + 1] = g + (255 - 2 * g) * strength;     // Green
    data[i + 2] = b + (255 - 2 * b) * strength;     // Blue
    // Alpha (i + 3) stays unchanged
    
    // Clamp to 0-255 range
    data[i] = Math.max(0, Math.min(255, data[i]));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1]));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2]));
  }
  
  return imageData;
}

/**
 * Chain multiple effects together
 * @param {ImageData} imageData - Canvas ImageData object
 * @param {Array<Object>} effects - Array of effect objects: [{type: 'contrast', value: 1.5}, ...]
 * @returns {ImageData} Modified ImageData
 */
export function chainEffects(imageData, effects) {
  if (!effects || effects.length === 0) {
    return imageData;
  }
  
  for (const effect of effects) {
    switch (effect.type) {
      case 'contrast':
        applyContrast(imageData, effect.value);
        break;
      case 'saturation':
        applySaturation(imageData, effect.value);
        break;
      case 'brightness':
        applyBrightness(imageData, effect.value);
        break;
      case 'duotone':
        if (Array.isArray(effect.colors) && effect.colors.length >= 2) {
          applyDuotone(imageData, effect.colors[0], effect.colors[1]);
        } else if (Array.isArray(effect.colors) && effect.colors[0] === 'dominant') {
          applyDuotone(imageData, 'dominant', effect.colors[1] || 2);
        }
        break;
      case 'posterize':
        applyPosterize(imageData, effect.levels || 4);
        break;
      case 'threshold':
        applyThreshold(imageData, effect.value || 128);
        break;
      case 'invert':
        applyInvert(imageData, effect.strength !== undefined ? effect.strength : 1.0);
        break;
      default:
        console.warn(`Unknown effect type: ${effect.type}`);
    }
  }
  
  return imageData;
}

// Helper functions

/**
 * Convert RGB to hex color string
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {string} Hex color string
 */
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = Math.max(0, Math.min(255, x)).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * Convert hex color string to RGB object
 * @param {string} hex - Hex color string (e.g., '#ff0000')
 * @returns {Object} RGB object {r, g, b}
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

/**
 * Effect strength for a step: linear from 1 at the start step to `clear` at step 0
 * @param {number} index - Step index (0 = clear)
 * @param {number} startIndex - Index of the start (most pixelated) step
 * @param {number} [clear=0] - Strength at the clear step (0 = original, 1 = full effects)
 * @returns {number} Strength 0–1
 */
export function effectStrengthAt(index, startIndex, clear = 0) {
  if (startIndex === 0) return 1.0;
  const strength = clear + (1 - clear) * (index / startIndex);
  return Math.max(0, Math.min(1, strength));
}

/**
 * Apply effects at full strength, then crossfade with the original pixels.
 * Works the same for every effect type, so binary ones (threshold, duotone)
 * fade gradually instead of switching off at some strength.
 * @param {ImageData} imageData - Canvas ImageData object (modified in place)
 * @param {Array<Object>|null} effects - Array of effect objects
 * @param {number} [strength=1] - 0 (original) to 1 (full effect)
 * @returns {ImageData} Modified ImageData
 */
export function applyEffects(imageData, effects, strength = 1.0) {
  if (!effects || effects.length === 0 || strength <= 0) {
    return imageData;
  }
  if (strength >= 1) {
    return chainEffects(imageData, effects);
  }

  const data = imageData.data;
  const original = new Uint8ClampedArray(data);
  chainEffects(imageData, effects);

  for (let i = 0; i < data.length; i += 4) {
    data[i] = original[i] + (data[i] - original[i]) * strength;
    data[i + 1] = original[i + 1] + (data[i + 1] - original[i + 1]) * strength;
    data[i + 2] = original[i + 2] + (data[i + 2] - original[i + 2]) * strength;
    // Alpha (i + 3) stays unchanged
  }

  return imageData;
}
