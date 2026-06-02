/**
 * API route for uploaded FEM fatigue analysis.
 *
 * Accepts multipart form data with:
 * - `baseFile`: Base case CSV file
 * - `loadFile`: Loading case CSV file
 * - `material`: JSON string with material properties
 *
 * Pre-computes Haigh diagram scatter points for ALL four stress
 * components (VON, P1, P2, P3) in a single request so the frontend
 * can switch components instantly without re-fetching.
 *
 * @module api/analyze-upload
 */

import { type NextRequest, NextResponse } from 'next/server';

import type {
  HaighLinePoint,
  HaighPoint,
  NodeSafetyFactors,
  StressComponent,
} from '@fatigue/types';

import { analyzeFEMData, generateHaighDiagramData } from '@fatigue/core';
import { loadFEMNodeStress } from '@fatigue/data';

// -- Configuration ------------------------------------------------------------

const MAX_SCATTER_POINTS = 10_000;
const ALL_COMPONENTS: readonly StressComponent[] = ['VON', 'P1', 'P2', 'P3'] as const;

// -- Helpers ------------------------------------------------------------------

/**
 * Select the worst (lowest Goodman SF) Haigh points up to `maxSize`.
 *
 * Filters out non-finite Goodman SF values (NaN / Infinity) before
 * sorting so all returned points survive JSON serialization.
 */
function selectWorstPoints(points: readonly HaighPoint[], maxSize: number): readonly HaighPoint[] {
  const finitePoints = points.filter((p) => Number.isFinite(p.goodmanSF));

  if (finitePoints.length <= maxSize) {
    return [...finitePoints].sort((a, b) => a.goodmanSF - b.goodmanSF);
  }

  const sorted = [...finitePoints].sort((a, b) => a.goodmanSF - b.goodmanSF);
  return sorted.slice(0, maxSize);
}

/**
 * Sanitize a single NodeSafetyFactors for JSON serialization.
 *
 * Replaces NaN / Infinity values with a finite fallback.
 */
function sanitizeNodeSF(sf: NodeSafetyFactors): NodeSafetyFactors {
  const fin = (v: number) => (Number.isFinite(v) ? v : 9999.99);
  return {
    nodeId: sf.nodeId,
    stressComponent: sf.stressComponent,
    meanStress: sf.meanStress,
    alternatingStress: sf.alternatingStress,
    goodmanSF: fin(sf.goodmanSF),
    gerberSF: fin(sf.gerberSF),
    soderbergSF: fin(sf.soderbergSF),
    minSF: fin(sf.minSF),
  };
}

// -- Response Types -----------------------------------------------------------

interface HaighLines {
  readonly goodmanLine: readonly HaighLinePoint[];
  readonly gerberLine: readonly HaighLinePoint[];
  readonly soderbergLine: readonly HaighLinePoint[];
  readonly yieldLine: readonly HaighLinePoint[];
}

interface ComponentHaighData {
  readonly points: readonly HaighPoint[];
  readonly totalPoints: number;
}

// -- POST Handler -------------------------------------------------------------

/**
 * POST /api/analyze-upload
 *
 * Accepts FormData with CSV files and material properties, runs analysis
 * for ALL stress components, and returns pre-computed results.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = performance.now();

  try {
    const formData = await request.formData();

    // Extract files
    const baseFile = formData.get('baseFile');
    const loadFile = formData.get('loadFile');

    if (!baseFile || !(baseFile instanceof File)) {
      return NextResponse.json({ error: 'Missing baseFile' }, { status: 400 });
    }
    if (!loadFile || !(loadFile instanceof File)) {
      return NextResponse.json({ error: 'Missing loadFile' }, { status: 400 });
    }

    // Extract material properties
    const materialRaw = formData.get('material');
    if (!materialRaw || typeof materialRaw !== 'string') {
      return NextResponse.json({ error: 'Missing material properties' }, { status: 400 });
    }

    const material = JSON.parse(materialRaw) as {
      ultimateStrength: number;
      yieldStrength: number;
      enduranceLimit: number;
    };

    // Validate material properties
    if (
      !material.ultimateStrength ||
      !material.yieldStrength ||
      !material.enduranceLimit ||
      material.ultimateStrength <= 0 ||
      material.yieldStrength < 0 ||
      material.enduranceLimit <= 0
    ) {
      return NextResponse.json(
        { error: 'Invalid material properties. Ensure σu > 0, σe > 0.' },
        { status: 400 },
      );
    }

    // Write uploaded files to temporary files for the parser
    const { writeFile, unlink } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const { tmpdir } = await import('node:os');

    const tempDir = tmpdir();
    const baseId = `fatigue-base-${Date.now()}.csv`;
    const loadId = `fatigue-load-${Date.now()}.csv`;
    const basePath = join(tempDir, baseId);
    const loadPath = join(tempDir, loadId);

    try {
      // Write uploaded files to temp location
      const baseBuffer = Buffer.from(await baseFile.arrayBuffer());
      const loadBuffer = Buffer.from(await loadFile.arrayBuffer());
      await writeFile(basePath, baseBuffer);
      await writeFile(loadPath, loadBuffer);

      console.log(`[api/analyze-upload] Processing files: ${baseFile.name}, ${loadFile.name}`);

      // Parse and analyze
      const nodes = await loadFEMNodeStress(basePath, loadPath);
      console.log(`[api/analyze-upload] Loaded ${nodes.length} nodes`);

      const result = analyzeFEMData(nodes, material);
      const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);

      // Generate Haigh diagram for VON to extract failure lines
      const firstHaigh = generateHaighDiagramData(
        result.material,
        result.safetyFactors.VON,
        'VON',
      );

      const haighLines: HaighLines = {
        goodmanLine: firstHaigh.goodmanLine,
        gerberLine: firstHaigh.gerberLine,
        soderbergLine: firstHaigh.soderbergLine,
        yieldLine: firstHaigh.yieldLine,
      };

      // Pre-compute worst scatter points for ALL components
      const haighPointsByComponent: Record<StressComponent, ComponentHaighData> =
        {} as Record<StressComponent, ComponentHaighData>;

      haighPointsByComponent.VON = {
        points: selectWorstPoints(firstHaigh.points, MAX_SCATTER_POINTS),
        totalPoints: firstHaigh.points.length,
      };

      for (const comp of ALL_COMPONENTS) {
        if (comp === 'VON') continue;

        const compHaigh = generateHaighDiagramData(
          result.material,
          result.safetyFactors[comp],
          comp,
        );

        haighPointsByComponent[comp] = {
          points: selectWorstPoints(compHaigh.points, MAX_SCATTER_POINTS),
          totalPoints: compHaigh.points.length,
        };
      }

      // Sanitize min safety factors for JSON
      const sanitizedMinSF: Record<StressComponent, NodeSafetyFactors> = {
        VON: sanitizeNodeSF(result.minSafetyFactors.VON),
        P1: sanitizeNodeSF(result.minSafetyFactors.P1),
        P2: sanitizeNodeSF(result.minSafetyFactors.P2),
        P3: sanitizeNodeSF(result.minSafetyFactors.P3),
      };

      const response = {
        material,
        nodeCount: result.nodeCount,
        computeTimeSeconds: elapsed,
        minSafetyFactors: sanitizedMinSF,
        haighLines,
        haighPointsByComponent,
      };

      return NextResponse.json(response);
    } finally {
      // Clean up temp files
      await unlink(basePath).catch(() => {});
      await unlink(loadPath).catch(() => {});
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[api/analyze-upload] Error:', message);
    return NextResponse.json(
      { error: 'Analysis failed', details: message },
      { status: 500 },
    );
  }
}
