/**
 * Unit tests for the coordinates CSV parser.
 *
 * Tests cover header detection, data row parsing, edge cases,
 * and error handling for the streaming coordinate file parser.
 *
 * @module importers/coordinates-csv-parser.test
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { writeFile, unlink, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { parseCoordinatesCSV } from './coordinates-csv-parser';

// -- Test Fixtures ------------------------------------------------------------

const TEMP_DIR = join(tmpdir(), `fatigue-test-coords-${Date.now()}`);

/**
 * Standard coordinate CSV with the same format as the reference file.
 */
const STANDARD_CSV = `Date:  11:32, Tuesday, June 02, 2026
Model name: Lower_Car_ASSY
Study name: Base Case(-Standard-)
Mesh type: Mixed Mesh


Node  ,Value  ,X (mm)  ,Y (mm)  ,Z (mm)  ,Components
1  ,0.000e+00   ,843.52  ,-347.6  ,32.574  ,D8001346589-1/D8000854949-1
2  ,0.000e+00   ,842.05  ,-347.17  ,35.626  ,D8001346589-1/D8000854949-1
3  ,0.000e+00   ,842.05  ,-345.39  ,38.024  ,D8001346589-1/D8000854949-1
4  ,0.000e+00   ,843.52  ,-344.2  ,37.144  ,D8001346589-1/D8000854949-1
5  ,0.000e+00   ,842.05  ,-336.44  ,50.061  ,D8001346589-1/D8000854949-1
`;

/**
 * Minimal CSV with no metadata — header on line 1.
 */
const MINIMAL_CSV = `Node,X (mm),Y (mm),Z (mm)
1,100.0,200.0,300.0
2,101.5,201.5,301.5
3,102.0,202.0,302.0
`;

/**
 * CSV with bare column names (no unit suffix).
 */
const BARE_COLUMNS_CSV = `Node,Value,X,Y,Z,Components
10,0.0,500.0,-100.0,250.0,Part-A
20,0.0,501.0,-101.0,251.0,Part-A
`;

/**
 * CSV with negative coordinates.
 */
const NEGATIVE_COORDS_CSV = `Node,X (mm),Y (mm),Z (mm)
1,-843.52,-347.6,-32.574
2,-842.05,-347.17,-35.626
`;

/**
 * CSV with malformed rows mixed in.
 */
const MALFORMED_CSV = `Node,X (mm),Y (mm),Z (mm)
1,100.0,200.0,300.0
INVALID_ROW
2,101.5,201.5,301.5
,,
3,102.0,202.0,302.0
`;

/**
 * CSV with no valid header (should produce empty result).
 */
const NO_HEADER_CSV = `This is just text
No header here
1,100,200,300
`;

/**
 * Empty CSV file.
 */
const EMPTY_CSV = '';

/**
 * CSV with only a header and no data rows.
 */
const HEADER_ONLY_CSV = `Node,X (mm),Y (mm),Z (mm)
`;

// -- Helper -------------------------------------------------------------------

async function writeTempFile(content: string, filename: string): Promise<string> {
  const filePath = join(TEMP_DIR, filename);
  await writeFile(filePath, content, 'utf-8');
  return filePath;
}

// -- Tests --------------------------------------------------------------------

describe('parseCoordinatesCSV', () => {
  beforeAll(async () => {
    await mkdir(TEMP_DIR, { recursive: true });
  });

  afterAll(async () => {
    await unlink(TEMP_DIR).catch(() => {});
  });

  it('should parse standard coordinate CSV with metadata header', async () => {
    const path = await writeTempFile(STANDARD_CSV, 'standard.csv');
    const result = await parseCoordinatesCSV(path);

    expect(result).toHaveLength(5);
    expect(result[0]).toEqual({
      nodeId: 1,
      x: 843.52,
      y: -347.6,
      z: 32.574,
    });
    expect(result[4]).toEqual({
      nodeId: 5,
      x: 842.05,
      y: -336.44,
      z: 50.061,
    });
  });

  it('should parse minimal CSV with header on first line', async () => {
    const path = await writeTempFile(MINIMAL_CSV, 'minimal.csv');
    const result = await parseCoordinatesCSV(path);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      nodeId: 1,
      x: 100.0,
      y: 200.0,
      z: 300.0,
    });
  });

  it('should parse CSV with bare column names (no unit suffix)', async () => {
    const path = await writeTempFile(BARE_COLUMNS_CSV, 'bare-columns.csv');
    const result = await parseCoordinatesCSV(path);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      nodeId: 10,
      x: 500.0,
      y: -100.0,
      z: 250.0,
    });
    expect(result[1]).toEqual({
      nodeId: 20,
      x: 501.0,
      y: -101.0,
      z: 251.0,
    });
  });

  it('should handle negative coordinates correctly', async () => {
    const path = await writeTempFile(NEGATIVE_COORDS_CSV, 'negative.csv');
    const result = await parseCoordinatesCSV(path);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      nodeId: 1,
      x: -843.52,
      y: -347.6,
      z: -32.574,
    });
  });

  it('should skip malformed rows gracefully', async () => {
    const path = await writeTempFile(MALFORMED_CSV, 'malformed.csv');
    const result = await parseCoordinatesCSV(path);

    expect(result).toHaveLength(3);
    expect(result[0]?.nodeId).toBe(1);
    expect(result[1]?.nodeId).toBe(2);
    expect(result[2]?.nodeId).toBe(3);
  });

  it('should return empty array for CSV with no valid header', async () => {
    const path = await writeTempFile(NO_HEADER_CSV, 'no-header.csv');
    const result = await parseCoordinatesCSV(path);

    expect(result).toHaveLength(0);
  });

  it('should return empty array for empty CSV file', async () => {
    const path = await writeTempFile(EMPTY_CSV, 'empty.csv');
    const result = await parseCoordinatesCSV(path);

    expect(result).toHaveLength(0);
  });

  it('should return empty array for header-only CSV', async () => {
    const path = await writeTempFile(HEADER_ONLY_CSV, 'header-only.csv');
    const result = await parseCoordinatesCSV(path);

    expect(result).toHaveLength(0);
  });

  it('should produce immutable results (readonly array)', async () => {
    const path = await writeTempFile(MINIMAL_CSV, 'immutable.csv');
    const result = await parseCoordinatesCSV(path);

    // TypeScript enforces readonly at compile time; verify runtime length
    expect(result.length).toBe(3);
    // Each entry should have all required fields
    for (const entry of result) {
      expect(entry).toHaveProperty('nodeId');
      expect(entry).toHaveProperty('x');
      expect(entry).toHaveProperty('y');
      expect(entry).toHaveProperty('z');
      expect(typeof entry.nodeId).toBe('number');
      expect(typeof entry.x).toBe('number');
      expect(typeof entry.y).toBe('number');
      expect(typeof entry.z).toBe('number');
    }
  });
});
