/**
 * Shared session-scoped cache for the last computed {@link FEMAnalysisResult}.
 *
 * The full per-node safety factor arrays (`result.safetyFactors`) are needed
 * to build the "HD / Detail" full-node 3D visualization on demand, without
 * having to re-run `analyzeFEMData` (which iterates all ~900K+ nodes) on
 * every request. `/api/analyze`, `/api/analyze-upload`, and `/api/recompute`
 * all populate this cache after computing a result; `/api/visualization3d-full`
 * reads from it.
 *
 * This cache is separate from `parsed-data-cache` because the result here is
 * material-dependent (safety factors change when material properties change),
 * while parsed data (raw stresses + coordinates) is not.
 *
 * @module lib/analysis-result-cache
 */

import type { FEMAnalysisResult } from '@fatigue/types';

import { buildCacheKey, createSessionCache } from '@/lib/session-cookie';

// -- Internal cache ------------------------------------------------------------

const cache = createSessionCache<FEMAnalysisResult>('analysis-result');

/**
 * Builds the cache key for the analysis result within a session.
 */
function resultKey(sessionId: string): string {
  return buildCacheKey('result', sessionId);
}

// -- Public accessors ------------------------------------------------------------

/**
 * Stores the most recently computed analysis result for the given session.
 */
export function setAnalysisResult(sessionId: string, result: FEMAnalysisResult): void {
  cache.set(resultKey(sessionId), result);
}

/**
 * Retrieves the most recently computed analysis result for the given session.
 *
 * Returns `undefined` if no result is cached or the session has expired.
 */
export function getAnalysisResult(sessionId: string): FEMAnalysisResult | undefined {
  return cache.get(resultKey(sessionId));
}
