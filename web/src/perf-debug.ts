/**
 * Lightweight performance debug utilities.
 *
 * Enabled when VITE_PERF_DEBUG === 'true'. Safe to ship in production builds.
 */

const ENABLED = typeof import.meta !== 'undefined'
  && typeof import.meta.env !== 'undefined'
  && import.meta.env.VITE_PERF_DEBUG === 'true';

export type PerfCounters = Record<string, number>;
export type PerfGaugeProvider = () => Record<string, number>;

const counters: PerfCounters = {};
const gauges: PerfGaugeProvider[] = [];

/**
 * Increment a named counter. No-op when perf debug is disabled.
 */
export function perfIncrement(name: string, delta: number = 1): void {
  if (!ENABLED) return;
  counters[name] = (counters[name] ?? 0) + delta;
}

/**
 * Register a gauge provider that returns numeric measurements.
 * Returns an unsubscribe function.
 */
export function registerPerfGauge(provider: PerfGaugeProvider): () => void {
  if (!ENABLED) return () => {};
  gauges.push(provider);
  return () => {
    const idx = gauges.indexOf(provider);
    if (idx >= 0) gauges.splice(idx, 1);
  };
}

function collectGauges(): Record<string, number> {
  const result: Record<string, number> = {};
  for (const g of gauges) {
    try {
      Object.assign(result, g());
    } catch (err) {
      // Swallow gauge errors to avoid impacting the app.
      // eslint-disable-next-line no-console
      console.warn('[PerfDebug] gauge error', err);
    }
  }
  return result;
}

function getMemoryInfo(): any {
  try {
    const anyPerf: any = (typeof performance !== 'undefined') ? performance : null;
    if (anyPerf && anyPerf.memory) {
      const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = anyPerf.memory;
      return { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit };
    }
  } catch {
    // Ignore if not supported.
  }
  return undefined;
}

// Periodic logger: runs only in browser when enabled.
if (ENABLED && typeof window !== 'undefined') {
  const start = Date.now();
  const intervalMs = 30000; // 30s

  window.setInterval(() => {
    const elapsedSec = Math.round((Date.now() - start) / 1000);
    const snapshotCounters = { ...counters };
    const gaugeValues = collectGauges();
    const memory = getMemoryInfo();

    // eslint-disable-next-line no-console
    console.log('[PerfDebug]', {
      ts: new Date().toISOString(),
      elapsedSec,
      counters: snapshotCounters,
      gauges: gaugeValues,
      memory,
    });
  }, intervalMs);
}

export const perfDebug = {
  enabled: ENABLED,
  increment: perfIncrement,
  registerGauge: registerPerfGauge,
};

