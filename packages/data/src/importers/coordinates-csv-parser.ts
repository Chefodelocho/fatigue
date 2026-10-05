/**
 * Streaming CSV parser for FEM node coordinate exports.
 *
 * Parses CSV files exported from FEM simulation software that contain
 * nodal coordinates (Node, Value, X (mm), Y (mm), Z (mm), Components).
 * The files have a variable-length metadata header followed by a column
 * header row, then data rows.
 *
 * Header detection is dynamic: the parser scans lines until it finds
 * a row containing "Node" and "X" columns (case-insensitive).
 *
 * Only Node, X, Y, and Z columns are extracted; Value and Components
 * are ignored.
 *
 * Uses Node.js readline + createReadStream for memory-efficient
 * streaming of large files (~100 MB).
 *
 * @module importers/coordinates-csv-parser
 */

import { createReadStream } from 'node:fs';
import * as readline from 'node:readline';

import type { NodeCoordinates } from '@fatigue/types';

// -- Constants ----------------------------------------------------------------

/**
 * Maximum number of lines to scan before giving up on header detection.
 * Prevents infinite loops on malformed files.
 */
const MAX_HEADER_SCAN_LINES = 50;

// -- CSV Parsing --------------------------------------------------------------

/**
 * Parse a FEM node coordinate CSV file using streaming.
 *
 * Dynamically detects the column header row by scanning for a line
 * that contains "NODE" and "X" (or "X (MM)") as column headers.
 * All rows before the header are treated as metadata and skipped.
 *
 * @param filePath - Absolute path to the CSV file
 * @returns Array of parsed node coordinates
 *
 * @example
 * ```ts
 * const coords = await parseCoordinatesCSV('/path/to/coordinates.csv');
 * console.log(`Parsed ${coords.length} node coordinates`);
 * ```
 */
export async function parseCoordinatesCSV(filePath: string): Promise<readonly NodeCoordinates[]> {
  const rows: NodeCoordinates[] = [];

  const rl = readline.createInterface({
    input: createReadStream(filePath, { encoding: 'utf-8' }),
    crlfDelay: Infinity, // Handle both \n and \r\n
  });

  let lineIndex = 0;
  let colNode = -1;
  let colX = -1;
  let colY = -1;
  let colZ = -1;

  for await (const line of rl) {
    lineIndex++;

    // If we haven't found the header yet, try to detect it
    if (colNode === -1) {
      // Give up after too many lines
      if (lineIndex > MAX_HEADER_SCAN_LINES) {
        break;
      }

      const headers = line.split(',').map((h) => h.trim().toUpperCase());

      colNode = headers.indexOf('NODE');

      // Look for "X (MM)" first, then fall back to bare "X"
      colX = headers.indexOf('X (MM)');
      if (colX === -1) {
        colX = headers.indexOf('X');
      }

      colY = headers.indexOf('Y (MM)');
      if (colY === -1) {
        colY = headers.indexOf('Y');
      }

      colZ = headers.indexOf('Z (MM)');
      if (colZ === -1) {
        colZ = headers.indexOf('Z');
      }

      // All required columns must be present
      if (colNode === -1 || colX === -1 || colY === -1 || colZ === -1) {
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
    if (cols.length <= Math.max(colNode, colX, colY, colZ)) {
      continue;
    }

    const nodeIdValue = cols[colNode];
    const xValue = cols[colX];
    const yValue = cols[colY];
    const zValue = cols[colZ];
    if (
      nodeIdValue === undefined ||
      xValue === undefined ||
      yValue === undefined ||
      zValue === undefined
    ) {
      continue;
    }

    const nodeId = parseInt(nodeIdValue, 10);
    if (Number.isNaN(nodeId)) {
      continue; // Skip non-numeric rows
    }

    const x = parseFloat(xValue);
    const y = parseFloat(yValue);
    const z = parseFloat(zValue);

    // Skip rows with NaN coordinates
    if (Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(z)) {
      continue;
    }

    rows.push({ nodeId, x, y, z });
  }

  return rows;
}
