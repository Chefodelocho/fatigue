/**
 * Server-side analysis history store using file-based JSON persistence.
 *
 * Stores analysis entries as individual JSON files in `data/analyses/`.
 * This directory is volume-mounted in Docker so analyses persist across
 * container restarts and are accessible from any browser/device.
 *
 * @module lib/server-analysis-store
 */

import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { NodeSafetyFactors, StressComponent } from '@fatigue/types';

// -- Types -------------------------------------------------------------------

export interface StoredMaterialConfig {
  readonly id: string;
  readonly name: string;
  readonly ultimateStrength: number;
  readonly yieldStrength: number;
  readonly enduranceLimit: number;
  readonly isCustom: boolean;
}

export interface StoredAnalysisEntry {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  readonly material: StoredMaterialConfig;
  readonly baseFileName: string;
  readonly loadFileName: string;
  readonly nodeCount: number;
  readonly computeTimeSeconds: string;
  /**
   * Min safety factors per component (needed for history list display).
   * Optional for backward compatibility with entries saved before this field existed.
   */
  readonly minSafetyFactors?: Record<StressComponent, NodeSafetyFactors>;
  /** Full analysis response data for restoring results */
  readonly analysisData: unknown;
}

/** Metadata-only view (excludes large analysisData payload). */
export type AnalysisMeta = Omit<StoredAnalysisEntry, 'analysisData'>;

// -- Configuration -----------------------------------------------------------

const STORAGE_DIR = join(process.cwd(), 'data', 'analyses');
const MAX_ENTRIES = 50;

// -- Internal helpers --------------------------------------------------------

async function ensureDir(): Promise<void> {
  await mkdir(STORAGE_DIR, { recursive: true });
}

function filePath(id: string): string {
  // Sanitize ID to prevent path traversal
  const safeId = id.replace(/[^a-zA-Z0-9-]/g, '');
  return join(STORAGE_DIR, `${safeId}.json`);
}

// -- Public API --------------------------------------------------------------

/**
 * Lists all saved analyses (metadata only, no full data).
 *
 * Returns entries sorted by creation date descending (newest first).
 */
export async function listAnalyses(): Promise<readonly AnalysisMeta[]> {
  await ensureDir();

  try {
    const files = await readdir(STORAGE_DIR);
    const entries: AnalysisMeta[] = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      try {
        const raw = await readFile(join(STORAGE_DIR, file), 'utf-8');
        const entry = JSON.parse(raw) as StoredAnalysisEntry;
        entries.push({
          id: entry.id,
          name: entry.name,
          createdAt: entry.createdAt,
          material: entry.material,
          baseFileName: entry.baseFileName,
          loadFileName: entry.loadFileName,
          nodeCount: entry.nodeCount,
          computeTimeSeconds: entry.computeTimeSeconds,
          ...(entry.minSafetyFactors ? { minSafetyFactors: entry.minSafetyFactors } : {}),
        });
      } catch {
        // Skip corrupted files
      }
    }

    return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

/**
 * Loads a single analysis entry by ID (including full data).
 */
export async function getAnalysis(id: string): Promise<StoredAnalysisEntry | null> {
  try {
    const raw = await readFile(filePath(id), 'utf-8');
    return JSON.parse(raw) as StoredAnalysisEntry;
  } catch {
    return null;
  }
}

/**
 * Saves an analysis entry to disk.
 *
 * If the total count exceeds MAX_ENTRIES, the oldest entries are evicted.
 */
export async function saveAnalysis(entry: StoredAnalysisEntry): Promise<void> {
  await ensureDir();

  // Enforce max entries — evict oldest
  const existing = await listAnalyses();
  if (existing.length >= MAX_ENTRIES) {
    const toDelete = existing.slice(MAX_ENTRIES - 1);
    for (const old of toDelete) {
      await deleteAnalysis(old.id);
    }
  }

  await writeFile(filePath(entry.id), JSON.stringify(entry), 'utf-8');
}

/**
 * Deletes a single analysis entry by ID.
 *
 * @returns `true` if the file was deleted, `false` if not found
 */
export async function deleteAnalysis(id: string): Promise<boolean> {
  try {
    await unlink(filePath(id));
    return true;
  } catch {
    return false;
  }
}

/**
 * Deletes all stored analyses.
 */
export async function clearAllAnalyses(): Promise<void> {
  await ensureDir();

  const files = await readdir(STORAGE_DIR);
  for (const file of files) {
    if (file.endsWith('.json')) {
      await unlink(join(STORAGE_DIR, file)).catch(() => {});
    }
  }
}
