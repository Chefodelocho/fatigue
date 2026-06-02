/**
 * Analysis history store using localStorage persistence.
 *
 * Saves analysis metadata and results to the browser's localStorage
 * so users can reload previous analyses without re-processing CSV files.
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
  /** Min safety factors per component */
  readonly minSafetyFactors: Record<StressComponent, NodeSafetyFactors>;
}

export interface SavedAnalysis extends AnalysisHistoryEntry {
  /** Full analysis data for restoring */
  readonly analysisData: unknown;
}

// -- Storage Configuration ---------------------------------------------------

const STORAGE_KEY = 'fatigue-analysis-history';
const MAX_HISTORY_ENTRIES = 50;

// -- Store Functions ---------------------------------------------------------

/**
 * Loads the analysis history from localStorage.
 */
export function loadHistory(): readonly AnalysisHistoryEntry[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AnalysisHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Saves an analysis to the history.
 *
 * If an entry with the same ID exists, it is updated.
 * Otherwise, the entry is prepended to the list.
 * The list is capped at MAX_HISTORY_ENTRIES.
 */
export function saveToHistory(entry: SavedAnalysis): void {
  if (typeof window === 'undefined') return;

  try {
    const existing = loadHistory();

    // Check if already exists (update case)
    const filtered = existing.filter((e) => e.id !== entry.id);

    // Prepend new entry
    const updated = [
      {
        id: entry.id,
        name: entry.name,
        createdAt: entry.createdAt,
        material: entry.material,
        baseFileName: entry.baseFileName,
        loadFileName: entry.loadFileName,
        nodeCount: entry.nodeCount,
        computeTimeSeconds: entry.computeTimeSeconds,
        minSafetyFactors: entry.minSafetyFactors,
      } satisfies AnalysisHistoryEntry,
      ...filtered,
    ].slice(0, MAX_HISTORY_ENTRIES);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Also save the full analysis data separately (can be large)
    localStorage.setItem(`${STORAGE_KEY}-data-${entry.id}`, JSON.stringify(entry.analysisData));
  } catch (error) {
    console.error('Failed to save analysis history:', error);
  }
}

/**
 * Loads a saved analysis's full data by ID.
 */
export function loadAnalysisData(id: string): unknown | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}-data-${id}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Deletes an analysis from the history.
 */
export function deleteFromHistory(id: string): void {
  if (typeof window === 'undefined') return;

  try {
    const existing = loadHistory();
    const filtered = existing.filter((e) => e.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    localStorage.removeItem(`${STORAGE_KEY}-data-${id}`);
  } catch (error) {
    console.error('Failed to delete analysis from history:', error);
  }
}

/**
 * Clears all analysis history.
 */
export function clearHistory(): void {
  if (typeof window === 'undefined') return;

  try {
    const existing = loadHistory();
    localStorage.removeItem(STORAGE_KEY);
    for (const entry of existing) {
      localStorage.removeItem(`${STORAGE_KEY}-data-${entry.id}`);
    }
  } catch (error) {
    console.error('Failed to clear analysis history:', error);
  }
}

/**
 * Generates a unique ID for a new analysis entry.
 */
export function generateAnalysisId(): string {
  return `analysis-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
