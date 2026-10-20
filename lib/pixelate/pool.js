// pool.js
// Lazily created worker pool. Requests are matched to replies by `rid`.
// A source `key` sticks to the worker that decoded it, since its bitmap lives there.

const RELEASE_GRACE_MS = 1500;

let pool = null;

/**
 * @param {Object} [options]
 * @param {string|URL} [options.workerUrl] - Override for hosts where `import.meta.url` workers don't resolve
 */
function getPool({ workerUrl } = {}) {
  if (pool) return pool;

  const cores = typeof navigator !== 'undefined' && navigator.hardwareConcurrency
    ? navigator.hardwareConcurrency
    : 2;
  const size = Math.max(1, Math.min(4, cores - 1));

  const workers = [];
  for (let i = 0; i < size; i++) {
    // Keep the `new Worker(new URL(...))` shape literal so bundlers detect it
    const worker = workerUrl
      ? new Worker(workerUrl, { type: 'module' })
      : new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = onMessage;
    worker.onerror = (event) => onWorkerError(i, event);
    workers.push(worker);
  }

  pool = {
    workers,
    pending: new Map(),      // rid → { resolve, reject, worker }
    assignment: new Map(),   // key → worker index
    refs: new Map(),         // key → refcount
    releaseTimers: new Map(), // key → timeout id
    nextRid: 1,
    nextWorker: 0
  };
  return pool;
}

function onMessage(e) {
  const { rid, error, ...result } = e.data;
  const entry = pool?.pending.get(rid);
  if (!entry) {
    // Late reply after destroy / abandoned request: don't leak transferred bitmaps
    result.bitmap?.close();
    return;
  }
  pool.pending.delete(rid);
  if (error) entry.reject(new Error(error));
  else entry.resolve(result);
}

function onWorkerError(index, event) {
  if (!pool) return;
  const message = event?.message || 'Worker error';
  for (const [rid, entry] of pool.pending) {
    if (entry.worker === index) {
      pool.pending.delete(rid);
      entry.reject(new Error(message));
    }
  }
}

function workerFor(key) {
  let index = pool.assignment.get(key);
  if (index === undefined) {
    index = pool.nextWorker;
    pool.nextWorker = (pool.nextWorker + 1) % pool.workers.length;
    pool.assignment.set(key, index);
  }
  return index;
}

/**
 * Send a message for `key` to its worker and wait for the reply.
 * @param {string} key
 * @param {Object} msg
 * @param {Transferable[]} [transfer]
 * @returns {Promise<Object>}
 */
export function request(key, msg, transfer = []) {
  if (!pool) return Promise.reject(new Error('Pixelate pool not initialised'));
  const index = workerFor(key);
  const rid = pool.nextRid++;
  return new Promise((resolve, reject) => {
    pool.pending.set(rid, { resolve, reject, worker: index });
    pool.workers[index].postMessage({ ...msg, rid, key }, transfer);
  });
}

/**
 * Decode `url` at `targetWidth` in a worker (or reuse the cached decode).
 * Each load must be paired with a release(key).
 * @returns {Promise<{ width: number, height: number }>}
 */
export function load(key, url, targetWidth, options) {
  getPool(options);
  const timer = pool.releaseTimers.get(key);
  if (timer !== undefined) {
    clearTimeout(timer);
    pool.releaseTimers.delete(key);
  }
  pool.refs.set(key, (pool.refs.get(key) || 0) + 1);
  return request(key, { type: 'load', url, targetWidth });
}

/**
 * Render one step. `effects` at full strength; the worker crossfades them
 * with the original by `strength` (0–1).
 * @returns {Promise<ImageBitmap>}
 */
export async function render(key, grain, effects, strength) {
  const { bitmap } = await request(key, { type: 'render', grain, effects, strength });
  return bitmap;
}

/**
 * Drop one reference to `key`. The worker frees the source after a short
 * grace period, so destroy → recreate with the same source doesn't re-decode.
 */
export function release(key) {
  if (!pool) return;
  const count = (pool.refs.get(key) || 0) - 1;
  if (count > 0) {
    pool.refs.set(key, count);
    return;
  }
  pool.refs.delete(key);
  if (pool.releaseTimers.has(key)) return;
  pool.releaseTimers.set(key, setTimeout(() => {
    if (!pool) return;
    pool.releaseTimers.delete(key);
    if (pool.refs.has(key)) return;
    const index = pool.assignment.get(key);
    pool.assignment.delete(key);
    if (index !== undefined) pool.workers[index].postMessage({ type: 'release', key });
  }, RELEASE_GRACE_MS));
}

/** Terminate all workers and reject outstanding requests. */
export function destroyPool() {
  if (!pool) return;
  const current = pool;
  pool = null;
  for (const timer of current.releaseTimers.values()) clearTimeout(timer);
  for (const worker of current.workers) worker.terminate();
  for (const entry of current.pending.values()) entry.reject(new Error('Pixelate pool destroyed'));
}
