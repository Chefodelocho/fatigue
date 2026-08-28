/**
 * Shared session-scoped cache for parsed FEM data (pre-material analysis).
 *
 * Stores the raw parsed FEMNodeStress[] and optional NodeCoordinates[] so
 * that when the user changes material properties, only the material-dependent
 * computations need to be re-run — CSV parsing is avoided entirely.
 *
 * This cache is separate from the analysis result cache because the result
 * is material-dependent while the parsed data is not.
 *
 * @module lib/parsed-data-cache
 */

import type { FEMNodeStress, NodeCoordinates } from '@fatigue/types';

import { buildCacheKey, createSessionCache } from '@/lib/session-cookie';

// -- Types -------------------------------------------------------------------

export interface ParsedData {
  /** Raw FEM node stress data from CSV parsing (material-independent). */
  readonly nodes: readonly FEMNodeStress[];
  /** Optional node coordinates for 3D visualization (material-independent). */
  readonly coordinates: readonly NodeCoordinates[] | null;
}

// -- Internal cache (not exported to avoid cross-module private member issue) -

const cache = createSessionCache<ParsedData>();

/**
 * Builds the cache key for parsed data within a session.
 */
function parsedDataKey(sessionId: string): string {
  return buildCacheKey('parsed', sessionId);
}

// -- Public accessors --------------------------------------------------------

/**
 * Stores parsed FEM data for the given session.
 */
export function setParsedData(sessionId: string, data: ParsedData): void {
  cache.set(parsedDataKey(sessionId), data);
}

/**
 * Retrieves cached parsed FEM data for the given session.
 *
 * Returns `undefined` if no data is cached or the session has expired.
 */
export function getParsedData(sessionId: string): ParsedData | undefined {
  return cache.get(parsedDataKey(sessionId));
}
