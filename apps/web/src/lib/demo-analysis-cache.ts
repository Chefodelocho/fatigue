/**
 * Process-wide (NOT per-session) cache for the reference "demo" dataset.
 *
 * Unlike `parsed-data-cache.ts` and `analysis-result-cache.ts` — which are
 * scoped per browser session so different users' uploaded analyses don't
 * leak into each other — the reference dataset and its material properties
 * are fixed constants. There is no reason to ever recompute the same
 * ~900K-row CSV parse, fatigue analysis, and Haigh/3D data build for every
 * new session that requests it.
 *
 * This cache is computed lazily on the FIRST request (from anyone) and then
 * reused for the lifetime of the server process, so that clicking "Run Demo"
 * always serves the already-stored demo results instead of recomputing them
 * (which takes ~10-20s for this dataset) — including the exact final JSON
 * response, so repeat requests skip Haigh-diagram and 3D-visualization
 * rebuilding too, not just CSV parsing.
 *
 * An in-flight promise is tracked so concurrent first-requests (e.g. two
 * users opening the demo at the same moment right after a server restart)
 * share a single computation instead of duplicating the work.
 *
 * Backed by `globalThis` (not a plain module-scope variable) for the same
 * reason as the per-session caches: Next.js compiles each API route as a
 * separate bundle, so a plain `const cache = ...` in a shared module would
 * get a distinct instance per route file even though they run in the same
 * process.
 *
 * @module lib/demo-analysis-cache
 */

import type { FEMAnalysisResult, FEMNodeStress, NodeCoordinates } from '@fatigue/types';

// -- Types ---------------------------------------------------------------------

export interface DemoAnalysisCacheEntry {
  /** Raw parsed FEM node stress data (material-independent). */
  readonly nodes: readonly FEMNodeStress[];
  /** Parsed node coordinates for 3D visualization, if available. */
  readonly coordinates: readonly NodeCoordinates[] | null;
  /** Full analysis result computed with the fixed reference material. */
  readonly result: FEMAnalysisResult;
  /**
   * The exact, final JSON response previously served for the demo analysis
   * (material, Haigh diagram data per component, 3D visualization, etc).
   * Typed as `unknown` here — its concrete shape is owned by
   * `/api/analyze/route.ts`, which casts it back to its own response type.
   * Reusing this directly (instead of only `result`) skips re-running
   * Haigh-diagram generation and 3D-visualization building on every
   * request too, not just the CSV parse + safety-factor computation.
   */
  readonly response: unknown;
}

interface DemoCacheGlobal {
  entry: DemoAnalysisCacheEntry | null;
  /** Tracks an in-progress computation so concurrent callers share it. */
  inFlight: Promise<DemoAnalysisCacheEntry> | null;
}

// -- Global-backed singleton -----------------------------------------------------

function getGlobalDemoCache(): DemoCacheGlobal {
  const globalForCache = globalThis as unknown as {
    __fatigueDemoAnalysisCache__?: DemoCacheGlobal;
  };

  if (!globalForCache.__fatigueDemoAnalysisCache__) {
    globalForCache.__fatigueDemoAnalysisCache__ = { entry: null, inFlight: null };
  }

  return globalForCache.__fatigueDemoAnalysisCache__;
}

// -- Public accessors ------------------------------------------------------------

/**
 * Retrieves the cached demo analysis, or `null` if it hasn't been computed
 * yet in this server process.
 */
export function getDemoAnalysis(): DemoAnalysisCacheEntry | null {
  return getGlobalDemoCache().entry;
}

/**
 * Returns the demo analysis, computing it via `compute()` at most once
 * across all concurrent callers and all future requests for the lifetime
 * of the server process.
 *
 * If a computation is already in flight (e.g. two users hit the cold cache
 * at the same time), later callers await the same promise instead of
 * starting a duplicate CSV parse + analysis run.
 */
export async function getOrComputeDemoAnalysis(
  compute: () => Promise<DemoAnalysisCacheEntry>,
): Promise<DemoAnalysisCacheEntry> {
  const cache = getGlobalDemoCache();

  if (cache.entry) {
    return cache.entry;
  }

  if (!cache.inFlight) {
    cache.inFlight = compute()
      .then((entry) => {
        cache.entry = entry;
        return entry;
      })
      .finally(() => {
        cache.inFlight = null;
      });
  }

  return cache.inFlight;
}
