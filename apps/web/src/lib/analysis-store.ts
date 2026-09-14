/**
 * Analysis history store — API-based persistence.
 *
 * Saves analysis metadata and results to the server via REST API
 * (`/api/analyses`) so that analyses persist across server restarts while
 * remaining scoped to the current browser session via an HTTP-only cookie.
 *
 * Also provides a client-side `generateAnalysisId()` utility.
 *
 * @module lib/analysis-store
 */

import type { StressComponent, NodeSafetyFactors } from '@fatigue/types';

// -- Types -------------------------------------------------------------------

export interface MaterialConfig {
  readonly id: string;
  readonly name: string;
  readonly ultimateStrength: number;
  readonly yieldStrength: number;
  readonly enduranceLimit: number;
  readonly isCustom: boolean;
}

export interface AnalysisHistoryEntry {
  /** Unique ID (timestamp-based) */
  readonly id: string;
  /** Display name */
  readonly name: string;
  /** When the analysis was created (ISO 8601) */
  readonly createdAt: string;
  /** Material used */
  readonly material: MaterialConfig;
  /** Base case file name */
  readonly baseFileName: string;
  /** Loading case file name */
  readonly loadFileName: string;
  /** Number of nodes analyzed */
  readonly nodeCount: number;
  /** Compute time in seconds */
  readonly computeTimeSeconds: string;
  /** Min safety factors per component (may be absent in legacy entries) */
  readonly minSafetyFactors?: Record<StressComponent, NodeSafetyFactors>;
}

export interface SavedAnalysis extends AnalysisHistoryEntry {
  /** Full analysis data for restoring */
  readonly analysisData: unknown;
}

// -- API Functions -----------------------------------------------------------

/**
 * Loads the analysis history list from the server.
 *
 * Returns metadata-only entries (no full analysis data).
 */
export async function fetchHistory(): Promise<readonly AnalysisHistoryEntry[]> {
  try {
    const response = await fetch('/api/analyses');
    if (!response.ok) return [];
    const entries = (await response.json()) as AnalysisHistoryEntry[];
    return Array.isArray(entries) ? entries : [];
  } catch {
    return [];
  }
}

/**
 * Saves an analysis to the server-side store.
 */
export async function saveToHistory(entry: SavedAnalysis): Promise<void> {
  try {
    await fetch('/api/analyses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
  } catch (error) {
    console.error('Failed to save analysis to server:', error);
  }
}

/**
 * Loads a saved analysis's full data by ID from the server.
 */
export async function fetchAnalysisData(id: string): Promise<unknown | null> {
  try {
    const response = await fetch(`/api/analyses/${id}`);
    if (!response.ok) return null;
    const entry = (await response.json()) as SavedAnalysis;
    return entry.analysisData ?? null;
  } catch {
    return null;
  }
}

/**
 * Deletes an analysis from the server-side store.
 */
export async function deleteFromHistory(id: string): Promise<void> {
  try {
    await fetch(`/api/analyses/${id}`, { method: 'DELETE' });
  } catch (error) {
    console.error('Failed to delete analysis from server:', error);
  }
}

// -- Utility -----------------------------------------------------------------

/**
 * Generates a unique analysis ID (timestamp + random suffix).
 */
export function generateAnalysisId(): string {
  return `analysis-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
