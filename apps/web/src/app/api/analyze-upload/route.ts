/**
 * API route for uploaded FEM fatigue analysis.
 *
 * Accepts multipart form data with:
 * - `baseFile`: Base case CSV file
 * - `loadFile`: Loading case CSV file
 * - `material`: JSON string with material properties
 * - `coordinatesFile`: (optional) Node coordinates CSV file for 3D visualization
 *
 * Pre-computes Haigh diagram scatter points for ALL four stress
 * components (VON, P1, P2, P3) in a single request so the frontend
 * can switch components instantly without re-fetching.
 *
 * When a coordinates file is provided, also pre-computes 3D visualization
 * data showing the worst 10,000 nodes per component, color-coded by
 * safety factor.
 *
 * @module api/analyze-upload
 */

import { type NextRequest, NextResponse } from 'next/server';

import type {
  BoundingBox3D,
  Component3DData,
  HaighLinePoint,
  HaighPoint,
  Node3DVizPoint,
  NodeCoordinates,
  NodeSafetyFactors,
  StressComponent,
  Visualization3DData,
} from '@fatigue/types';

import { analyzeFEMData, generateHaighDiagramData } from '@fatigue/core';
import { loadFEMNodeStress, parseCoordinatesCSV } from '@fatigue/data';

// -- Configuration ------------------------------------------------------------

const MAX_SCATTER_POINTS = 10_000;
const MAX_3D_POINTS = 10_000;
const MAX_BACKGROUND_POINTS = 40_000;
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

// -- 3D Visualization Helpers -------------------------------------------------

/**
 * Build 3D visualization data by joining coordinates with safety factors.
 *
 * For each stress component, selects the worst `maxPoints` nodes (sorted
 * by minSF ascending) that have matching coordinates.
 *
 * @param coordinates  - Map of nodeId → NodeCoordinates
 * @param safetyFactors - Per-component safety factor arrays from analysis
 * @param maxPoints     - Maximum number of worst nodes to return per component
 * @returns Visualization3DData or null if no matches found
 */
function buildVisualization3D(
  coordinates: ReadonlyMap<number, NodeCoordinates>,
  safetyFactors: {
    readonly VON: readonly NodeSafetyFactors[];
    readonly P1: readonly NodeSafetyFactors[];
    readonly P2: readonly NodeSafetyFactors[];
    readonly P3: readonly NodeSafetyFactors[];
  },
  maxPoints: number,
): Visualization3DData | null {
  // Build 3D data per component
  const worstByComponent: Record<StressComponent, Component3DData> =
    {} as Record<StressComponent, Component3DData>;

  let totalMatchedNodes = 0;
  const allMatchedCoords: NodeCoordinates[] = [];

  for (const comp of ALL_COMPONENTS) {
    const factors = safetyFactors[comp];

    // Join safety factors with coordinates
    const joined: Node3DVizPoint[] = [];

    for (const sf of factors) {
      const coord = coordinates.get(sf.nodeId);
      if (!coord) continue;

      // Sanitize SF values for JSON serialization
      const fin = (v: number) => (Number.isFinite(v) ? v : 9999.99);

      joined.push({
        nodeId: sf.nodeId,
        x: coord.x,
        y: coord.y,
        z: coord.z,
        minSF: fin(sf.minSF),
        goodmanSF: fin(sf.goodmanSF),
        gerberSF: fin(sf.gerberSF),
        soderbergSF: fin(sf.soderbergSF),
        meanStress: sf.meanStress,
        alternatingStress: sf.alternatingStress,
      });
    }

    if (comp === 'VON') {
      totalMatchedNodes = joined.length;
      // Use a for-loop to avoid push(...spread) which blows the call stack
      // with ~900K matched nodes (V8 call stack limit ~12K-15K args).
      for (const p of joined) {
        allMatchedCoords.push({ nodeId: p.nodeId, x: p.x, y: p.y, z: p.z });
      }
    }

    // Sort by minSF ascending (worst first) and cap
    const sorted = [...joined].sort((a, b) => a.minSF - b.minSF);
    const worstNodes = sorted.slice(0, maxPoints);

    worstByComponent[comp] = {
      worstNodes,
      totalMatchedNodes: joined.length,
    };
  }

  if (totalMatchedNodes === 0) {
    return null;
  }

  // Compute bounding box from all matched coordinates using reduce
  // (avoids Math.min(...array) which blows the call stack with ~900K elements).
  const initialBounds: BoundingBox3D = {
    minX: Infinity,
    maxX: -Infinity,
    minY: Infinity,
    maxY: -Infinity,
    minZ: Infinity,
    maxZ: -Infinity,
  };

  const bounds: BoundingBox3D = allMatchedCoords.reduce(
    (acc, c) => ({
      minX: Math.min(acc.minX, c.x),
      maxX: Math.max(acc.maxX, c.x),
      minY: Math.min(acc.minY, c.y),
      maxY: Math.max(acc.maxY, c.y),
      minZ: Math.min(acc.minZ, c.z),
      maxZ: Math.max(acc.maxZ, c.z),
    }),
    initialBounds,
  );

  // Sample background coordinates for translucent context rendering.
  // Use deterministic stride-based sampling to avoid bias and randomness overhead.
  const totalCoords = allMatchedCoords.length;
  let backgroundCoordinates: readonly NodeCoordinates[];
  if (totalCoords <= MAX_BACKGROUND_POINTS) {
    backgroundCoordinates = allMatchedCoords;
  } else {
    const stride = totalCoords / MAX_BACKGROUND_POINTS;
    const sampled: NodeCoordinates[] = [];
    for (let i = 0; i < MAX_BACKGROUND_POINTS; i++) {
      const idx = Math.floor(i * stride);
      sampled.push(allMatchedCoords[idx]!);
    }
    backgroundCoordinates = sampled;
  }

  return {
    coordinateNodeCount: coordinates.size,
    matchedNodeCount: totalMatchedNodes,
    bounds,
    backgroundCoordinates,
    worstByComponent,
  };
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

    // Extract optional coordinates file
    const coordinatesFile = formData.get('coordinatesFile');
    const hasCoordinates = coordinatesFile !== null && coordinatesFile instanceof File;

    // Write uploaded files to temporary files for the parser
    const { writeFile, unlink } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const { tmpdir } = await import('node:os');

    const tempDir = tmpdir();
    const baseId = `fatigue-base-${Date.now()}.csv`;
    const loadId = `fatigue-load-${Date.now()}.csv`;
    const coordsId = `fatigue-coords-${Date.now()}.csv`;
    const basePath = join(tempDir, baseId);
    const loadPath = join(tempDir, loadId);
    const coordsPath = hasCoordinates ? join(tempDir, coordsId) : null;

    try {
      // Write uploaded files to temp location
      const baseBuffer = Buffer.from(await baseFile.arrayBuffer());
      const loadBuffer = Buffer.from(await loadFile.arrayBuffer());
      await writeFile(basePath, baseBuffer);
      await writeFile(loadPath, loadBuffer);

      if (coordsPath && hasCoordinates) {
        const coordsBuffer = Buffer.from(await coordinatesFile.arrayBuffer());
        await writeFile(coordsPath, coordsBuffer);
      }

      console.log(
        `[api/analyze-upload] Processing files: ${baseFile.name}, ${loadFile.name}` +
        (hasCoordinates ? `, ${coordinatesFile.name}` : ''),
      );

      // Parse and analyze
      const nodes = await loadFEMNodeStress(basePath, loadPath);
      console.log(`[api/analyze-upload] Loaded ${nodes.length} nodes`);

      // Parse coordinates if provided (in parallel-safe manner)
      let coordMap: ReadonlyMap<number, NodeCoordinates> | null = null;
      if (coordsPath) {
        const coords = await parseCoordinatesCSV(coordsPath);
        console.log(`[api/analyze-upload] Loaded ${coords.length} node coordinates`);
        coordMap = new Map(coords.map((c) => [c.nodeId, c]));
      }

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

      // Build 3D visualization data if coordinates were provided
      const visualization3D = coordMap
        ? buildVisualization3D(coordMap, result.safetyFactors, MAX_3D_POINTS)
        : null;

      if (visualization3D) {
        console.log(
          `[api/analyze-upload] 3D viz: ${visualization3D.matchedNodeCount} matched nodes, ` +
          `worst VON count: ${visualization3D.worstByComponent.VON.worstNodes.length}`,
        );
      }

      const response = {
        material,
        nodeCount: result.nodeCount,
        computeTimeSeconds: elapsed,
        minSafetyFactors: sanitizedMinSF,
        haighLines,
        haighPointsByComponent,
        visualization3D,
      };

      return NextResponse.json(response);
    } finally {
      // Clean up temp files
      await unlink(basePath).catch(() => {});
      await unlink(loadPath).catch(() => {});
      if (coordsPath) {
        await unlink(coordsPath).catch(() => {});
      }
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
