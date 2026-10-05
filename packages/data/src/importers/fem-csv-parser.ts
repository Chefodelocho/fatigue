/**
 * Streaming CSV parser for FEM stress data exports.
 *
 * Parses CSV files exported from FEM simulation software that contain
 * nodal stress results (P1, P2, P3, VON, INT, TRI). The files have
 * a 4-line header followed by a column header row, then data rows.
 *
 * Stress values are stored in N/m² (Pa) and converted to MPa.
 *
 * Uses Node.js readline + createReadStream for memory-efficient
 * streaming of large files (~84 MB each).
 *
 * @module importers/fem-csv-parser
 */

import { createReadStream } from 'node:fs';
import * as readline from 'node:readline';

import type { FEMNodeStress } from '@fatigue/types';

// -- Intermediate Row Type ----------------------------------------------------

/**
 * Raw parsed stress values for a single node (still in Pa).
 */
interface NodeStressRow {
  readonly nodeId: number;
  readonly p1: number;
  readonly p2: number;
  readonly p3: number;
  readonly von: number;
}

// -- Constants ----------------------------------------------------------------

/** Pa → MPa conversion factor. */
const PA_TO_MPA = 1e-6;

/** Number of header lines to skip before the column header row. */
const HEADER_LINES = 4;

// -- CSV Parsing --------------------------------------------------------------

/**
 * Parse a single FEM stress CSV file using streaming.
 *
 * Skips the first `HEADER_LINES` lines (metadata), then reads the column
 * header to identify column positions, then streams all data rows.
 *
 * @param filePath - Absolute path to the CSV file
 * @returns Array of parsed node stress rows (values in Pa)
 *
 * @example
 * ```ts
 * const rows = await parseFEMStressCSV('/path/to/Base_Case.csv');
 * console.log(`Parsed ${rows.length} nodes`);
 * ```
 */
export async function parseFEMStressCSV(filePath: string): Promise<readonly NodeStressRow[]> {
  const rows: NodeStressRow[] = [];

  const rl = readline.createInterface({
    input: createReadStream(filePath, { encoding: 'utf-8' }),
    crlfDelay: Infinity, // Handle both \n and \r\n
  });

  let lineIndex = 0;
  let colNode = -1;
  let colP1 = -1;
  let colP2 = -1;
  let colP3 = -1;
  let colVON = -1;

  for await (const line of rl) {
    lineIndex++;

    // Skip metadata header lines (1–4)
    if (lineIndex <= HEADER_LINES) {
      continue;
    }

    // If we haven't found the column header yet, try to detect it
    if (colNode === -1) {
      const headers = line.split(',').map((h) => h.trim().toUpperCase());
      colNode = headers.indexOf('NODE');
      colP1 = headers.indexOf('P1');
      colP2 = headers.indexOf('P2');
      colP3 = headers.indexOf('P3');
      colVON = headers.indexOf('VON');

      if (colNode === -1 || colP1 === -1 || colP2 === -1 || colP3 === -1 || colVON === -1) {
        // Not the header row — reset and keep looking
        colNode = -1;
        continue;
      }

      // Found the header row — proceed to data rows
      continue;
    }

    // Parse data row
    const cols = line.split(',').map((c) => c.trim());

    // Skip empty or malformed rows
    if (cols.length <= Math.max(colNode, colP1, colP2, colP3, colVON)) {
      continue;
    }

    const nodeIdValue = cols[colNode];
    const p1Value = cols[colP1];
    const p2Value = cols[colP2];
    const p3Value = cols[colP3];
    const vonValue = cols[colVON];
    if (
      nodeIdValue === undefined ||
      p1Value === undefined ||
      p2Value === undefined ||
      p3Value === undefined ||
      vonValue === undefined
    ) {
      continue;
    }

    const nodeId = parseInt(nodeIdValue, 10);
    if (Number.isNaN(nodeId)) {
      continue; // Skip non-numeric rows
    }

    const p1 = parseFloat(p1Value);
    const p2 = parseFloat(p2Value);
    const p3 = parseFloat(p3Value);
    const von = parseFloat(vonValue);

    // Skip rows with NaN stress values
    if (Number.isNaN(von)) {
      continue;
    }

    rows.push({
      nodeId,
      p1: Number.isNaN(p1) ? 0 : p1,
      p2: Number.isNaN(p2) ? 0 : p2,
      p3: Number.isNaN(p3) ? 0 : p3,
      von,
    });
  }

  return rows;
}

// -- Combined Loading ---------------------------------------------------------

/**
 * Load and combine base-case and loading-case FEM stress CSV files.
 *
 * Parses both CSV files in parallel, then merges them node-by-node.
 * Stress values are converted from Pa to MPa during the merge.
 *
 * @param basePath - Absolute path to the base case CSV file
 * @param loadPath - Absolute path to the loading case CSV file
 * @returns Array of FEMNodeStress with base + load values in MPa
 *
 * @example
 * ```ts
 * const nodes = await loadFEMNodeStress(
 *   '/data/reference/base/Base_Case.csv',
 *   '/data/reference/load/Running_Ex_CD.csv',
 * );
 * console.log(`Loaded ${nodes.length} nodes`);
 * ```
 */
export async function loadFEMNodeStress(
  basePath: string,
  loadPath: string,
): Promise<readonly FEMNodeStress[]> {
  // Parse both files in parallel
  const [baseRows, loadRows] = await Promise.all([
    parseFEMStressCSV(basePath),
    parseFEMStressCSV(loadPath),
  ]);

  if (baseRows.length !== loadRows.length) {
    console.warn(
      `[fem-csv-parser] Row count mismatch: base=${baseRows.length}, load=${loadRows.length}. ` +
        'Using matching nodes only.',
    );
  }

  // Build a lookup map for load rows by nodeId
  const loadMap = new Map<number, NodeStressRow>();
  for (const row of loadRows) {
    loadMap.set(row.nodeId, row);
  }

  // Merge base + load rows
  const nodes: FEMNodeStress[] = [];
  for (const base of baseRows) {
    const load = loadMap.get(base.nodeId);
    if (!load) {
      // Skip nodes that don't exist in the load file
      continue;
    }

    nodes.push({
      nodeId: base.nodeId,
      // Convert Pa → MPa and use 0 for NaN values
      baseVON: base.von * PA_TO_MPA,
      baseP1: base.p1 * PA_TO_MPA,
      baseP2: base.p2 * PA_TO_MPA,
      baseP3: base.p3 * PA_TO_MPA,
      loadVON: load.von * PA_TO_MPA,
      loadP1: load.p1 * PA_TO_MPA,
      loadP2: load.p2 * PA_TO_MPA,
      loadP3: load.p3 * PA_TO_MPA,
    });
  }

  return nodes;
}

// -- Re-export types ----------------------------------------------------------

export type { NodeStressRow };
