// index.js
// createPixelate(container, options): hover-reversible stepped pixelation.
// Main thread only paints bitmaps; decoding, downscaling and effects run in
// the worker pool (see pool.js / worker.js).

import { generateGrainSteps, findGrainIndex } from './steps.js';
import { effectStrengthAt } from './effects.js';
import { createStepper } from './stepper.js';
import { load, render, release } from './pool.js';

const defaults = Object.freeze({
  src: null,         // string URL, or
  sources: null,     // [{ width, url }] — picks smallest >= display width × DPR
  grain: 2,          // start grain (most pixelated)
  steps: 12,
  easing: 'log',     // 'linear' | 'quadratic' | 'log' | fn
  interval: 72,      // ms per step
  effects: null,     // [{ type: 'contrast', value: 1.5 }, ...]
  clearEffects: 0,   // effect strength at clear: 0 = original, 1 = keep full effects
  trigger: 'self',   // 'self' | HTMLElement
  includeSelf: true, // with an element trigger, also react to the container
  lazy: Object.freeze({ rootMargin: '100%', releaseMargin: '300%' }),
  workerUrl: null    // override worker script URL (used when the pool is first created)
});

const RESIZE_GROWTH = 1.25;
const RESIZE_DEBOUNCE_MS = 200;

// Shared IntersectionObservers, one per margin, so hundreds of instances
// don't each create their own.
const observers = new Map(); // margin → { observer, handlers: WeakMap<Element, Set<fn>> }

function observe(element, margin, handler) {
  let entry = observers.get(margin);
  if (!entry) {
    const handlers = new WeakMap();
    const observer = new IntersectionObserver((entries) => {
      for (const e of entries) {
        handlers.get(e.target)?.forEach((fn) => fn(e.isIntersecting));
      }
    }, { rootMargin: margin, threshold: 0 });
    entry = { observer, handlers };
    observers.set(margin, entry);
  }
  let set = entry.handlers.get(element);
  if (!set) {
    set = new Set();
    entry.handlers.set(element, set);
  }
  set.add(handler);
  // Each observe() delivers an initial entry, which is what kicks off the first load
  entry.observer.unobserve(element);
  entry.observer.observe(element);

  return () => {
    set.delete(handler);
    if (set.size === 0) {
      entry.handlers.delete(element);
      entry.observer.unobserve(element);
    }
  };
}

/**
 * @typedef {Object} PixelateEffect
 * @property {string} type - 'contrast' | 'brightness' | 'saturation' | 'duotone' | 'posterize' | 'threshold' | 'invert'
 * @property {number} [value]
 * @property {number} [levels]
 * @property {[string, string] | ['dominant', number]} [colors]
 * @property {number} [strength]
 */

/**
 * @typedef {Object} PixelateOptions
 * @property {string} [src]
 * @property {Array<{ width: number, url: string }>} [sources]
 * @property {number} [grain]
 * @property {number} [steps]
 * @property {'linear' | 'quadratic' | 'log' | ((t: number) => number)} [easing]
 * @property {number} [interval]
 * @property {PixelateEffect[] | null} [effects]
 * @property {number} [clearEffects]
 * @property {'self' | HTMLElement} [trigger]
 * @property {boolean} [includeSelf]
 * @property {{ rootMargin?: string, releaseMargin?: string }} [lazy]
 * @property {string | URL | null} [workerUrl]
 */

/**
 * @param {HTMLElement} container
 * @param {PixelateOptions} [options]
 */
export function createPixelate(container, options = {}) {
  const opts = {
    ...defaults,
    ...options,
    lazy: { ...defaults.lazy, ...options.lazy }
  };

  const canvas = document.createElement('canvas');
  canvas.classList.add('artwork-pixelate');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  // Size from CSS + aspect-ratio only. Without this the backing store
  // (display width × DPR) becomes the intrinsic size, grows auto-sized
  // containers (e.g. 1fr grid columns) and feeds the resize → reload loop.
  canvas.style.contain = 'size';
  const ctx = canvas.getContext('2d');
  container.appendChild(canvas);

  let destroyed = false;
  let generation = 0;
  let cycle = null;        // current load cycle, see startLoad()
  let sourceAspect = null; // kept across unloads so layout doesn't shift
  let hovered = false;
  let inRange = false;     // inside lazy.rootMargin
  let resizeTimer = null;

  let resolveReady;
  let rejectReady;
  let readySettled = false;
  const ready = new Promise((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  ready.catch(() => {}); // callers that don't await ready shouldn't see unhandled rejections

  function fit() {
    if (!sourceAspect) return;
    const { width, height } = container.getBoundingClientRect();
    // Landscape relative to container: constrain by width; portrait: by height
    if (height === 0 || sourceAspect > width / height) {
      canvas.style.width = '100%';
      canvas.style.height = 'auto';
    } else {
      canvas.style.width = 'auto';
      canvas.style.height = '100%';
    }
  }

  function paint(bitmap) {
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  }

  function pickSource() {
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = Math.ceil(container.getBoundingClientRect().width * dpr);
    if (!displayWidth) return null;

    if (opts.sources && opts.sources.length > 0) {
      const sorted = [...opts.sources].sort((a, b) => a.width - b.width);
      const chosen = sorted.find((s) => s.width >= displayWidth) || sorted[sorted.length - 1];
      return { url: chosen.url, targetWidth: Math.min(displayWidth, chosen.width), displayWidth };
    }
    if (!opts.src) return null;
    return { url: opts.src, targetWidth: displayWidth, displayWidth };
  }

  async function startLoad() {
    if (destroyed || cycle) return;
    const source = pickSource();
    if (!source) return; // zero-size container: ResizeObserver retries

    const gen = ++generation;
    // Resolve against the document — the worker would resolve relative URLs against itself
    const url = new URL(source.url, document.baseURI).href;
    const key = `${url}@${source.targetWidth}`;
    const c = {
      key,
      displayWidth: source.displayWidth,
      bitmaps: [],  // Promise<ImageBitmap|null> per step
      settled: [],  // ImageBitmap per step, for close()
      stepper: null,
      ready: false
    };
    cycle = c;

    try {
      const { width, height } = await load(key, url, source.targetWidth, { workerUrl: opts.workerUrl });
      if (gen !== generation) return;

      sourceAspect = width / height;
      canvas.width = width;
      canvas.height = height;
      canvas.style.aspectRatio = `${width} / ${height}`;
      fit();

      const grains = generateGrainSteps({
        startGrain: opts.grain,
        steps: opts.steps,
        shortSide: Math.min(width, height),
        easing: opts.easing
      });
      const startIndex = findGrainIndex(grains, opts.grain);

      const requestStep = (i) => {
        const strength = effectStrengthAt(i, startIndex, opts.clearEffects);
        const promise = render(key, grains[i], opts.effects, strength).then((bitmap) => {
          if (gen !== generation) {
            bitmap.close();
            return null;
          }
          c.settled[i] = bitmap;
          return bitmap;
        });
        promise.catch(() => {});
        c.bitmaps[i] = promise;
      };
      // Start grain first so it paints as early as possible
      for (let i = startIndex; i >= 0; i--) requestStep(i);

      c.stepper = createStepper({
        count: startIndex + 1,
        start: startIndex,
        interval: opts.interval,
        onStep: async (i, signal) => {
          const bitmap = await c.bitmaps[i];
          if (signal.aborted || !bitmap || gen !== generation) return;
          paint(bitmap);
        }
      });

      const first = await c.bitmaps[startIndex];
      if (!first || gen !== generation) return;
      paint(first);
      c.ready = true;
      canvas.classList.add('pixelate-ready');
      container.classList.add('pixelate-ready');
      if (!readySettled) {
        readySettled = true;
        resolveReady();
      }
      if (hovered) c.stepper.to(0);
    } catch (err) {
      if (gen !== generation) return;
      console.error('[pixelate] load failed:', err);
      if (!readySettled) {
        readySettled = true;
        rejectReady(err);
      }
    }
  }

  function unload() {
    if (!cycle) return;
    generation++;
    const c = cycle;
    cycle = null;
    c.stepper?.destroy();
    for (const bitmap of c.settled) bitmap?.close();
    release(c.key);
    // Free the backing store; aspect-ratio keeps the layout
    canvas.width = 1;
    canvas.height = 1;
    canvas.classList.remove('pixelate-ready');
    container.classList.remove('pixelate-ready');
  }

  function enter() {
    if (destroyed) return;
    hovered = true;
    if (cycle?.ready) cycle.stepper.to(0);
    else if (!cycle) startLoad();
  }

  function leave() {
    if (destroyed) return;
    hovered = false;
    if (cycle?.ready) cycle.stepper.to(cycle.stepper.count - 1);
  }

  const unobserveLoad = observe(container, opts.lazy.rootMargin, (isIntersecting) => {
    inRange = isIntersecting;
    if (isIntersecting) startLoad();
  });
  const unobserveRelease = observe(container, opts.lazy.releaseMargin, (isIntersecting) => {
    if (!isIntersecting) unload();
  });

  const resizeObserver = new ResizeObserver(() => {
    fit();
    if (!cycle) {
      if (inRange) startLoad();
      return;
    }
    const source = pickSource();
    if (source && source.displayWidth > cycle.displayWidth * RESIZE_GROWTH) {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        unload();
        if (inRange) startLoad();
      }, RESIZE_DEBOUNCE_MS);
    }
  });
  resizeObserver.observe(container);

  const targets = opts.trigger === 'self'
    ? [canvas]
    : [opts.trigger, ...(opts.includeSelf ? [container] : [])];
  for (const target of targets) {
    target.addEventListener('pointerenter', enter);
    target.addEventListener('pointerleave', leave);
  }

  return {
    enter,
    leave,
    ready,
    get canvas() { return canvas; },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      clearTimeout(resizeTimer);
      unobserveLoad();
      unobserveRelease();
      resizeObserver.disconnect();
      for (const target of targets) {
        target.removeEventListener('pointerenter', enter);
        target.removeEventListener('pointerleave', leave);
      }
      unload();
      canvas.remove();
    }
  };
}

createPixelate.defaults = defaults;

export { generateGrainSteps, findGrainIndex, easingPresets } from './steps.js';
export { createStepper } from './stepper.js';
export { destroyPool } from './pool.js';
