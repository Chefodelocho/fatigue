/**
 * API route for FEM fatigue analysis (reference "demo" dataset).
 *
 * Reads CSV files from the reference data directory, runs the full
 * analysis pipeline (CSV parsing → stress pair computation → safety
 * factors → Haigh diagram → 3D visualization), and returns the result
 * as JSON.
 *
 * The reference dataset and material are fixed constants, so the result
 * is computed ONCE across the server process's lifetime and reused by
 * every request from every session afterwards — see `demo-analysis-cache.ts`.
 * This is what lets the home page's "Run Demo & See Results" button jump
 * straight to results without a multi-second wait on every visit.
 *
 * Pre-computes Haigh diagram scatter points for ALL four stress
 * components (VON, P1, P2, P3) in a single request so the frontend
 * can switch components instantly without re-fetching.
 *
 * Each session's parsed FEM data is also cached (material-independent) so
 * that the `/api/recompute` endpoint can quickly re-run the analysis when
 * the user changes material properties, and `/api/visualization3d-full`
 * can build the HD (all-nodes) 3D dataset on demand.
 *
 * @module api/analyze
 */

import path from 'node:path';

import { type NextRequest, NextResponse } from 'next/server';

import type {
  FEMAnalysisResult,
  NodeCoordinates,
  StressComponent,
  Visualization3DData,
} from '@fatigue/types';

import { analyzeFEMData, generateHaighDiagramData } from '@fatigue/core';
import { loadFEMNodeStress, parseCoordinatesCSV } from '@fatigue/data';

import {
  buildVisualization3D,
  selectWorstPoints,
  sanitizeAllMinSF,
  type HaighLines,
  type ComponentHaighData,
} from '@/lib/analysis-helpers';
import { setParsedData } from '@/lib/parsed-data-cache';
import { setAnalysisResult } from '@/lib/analysis-result-cache';
import { getOrComputeDemoAnalysis, type DemoAnalysisCacheEntry } from '@/lib/demo-analysis-cache';
import {
  getOrCreateSessionId,
  applySessionCookie,
} from '@/lib/session-cookie';

// -- Configuration -----------------------------------------------------------

/** Maximum number of scatter points per stress component. */
const MAX_SCATTER_POINTS = 10_000;

/** Maximum number of worst nodes per component in the 3D visualization. */
const MAX_3D_POINTS = 10_000;

/** All stress components to pre-compute. */
const ALL_COMPONENTS: readonly StressComponent[] = ['VON', 'P1', 'P2', 'P3'] as const;

/** Default material properties for the reference dataset. */
const MATERIAL = {
  ultimateStrength: 500,
  yieldStrength: 350,
  enduranceLimit: 250,
} as const;

// -- Route Handler ------------------------------------------------------------

/**
 * GET /api/analyze
 *
 * Runs the full FEM fatigue analysis and returns results for ALL stress
 * components in a single response.
 *
 * The reference dataset + material are fixed, so the underlying computation
 * (CSV parse → safety factors → Haigh diagram → 3D visualization) only ever
 * runs ONCE across the server's lifetime — see `demo-analysis-cache.ts`.
 * Every request (from any session) after the first reuses that exact stored
 * result. Each session still gets its own parsed-data/result cache entries
 * populated (cheap — just a Map write) so `/api/recompute` and
 * `/api/visualization3d-full` keep working correctly per session.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Resolve session ID from cookie (generates one if absent)
    const { sessionId, setCookieHeader } = getOrCreateSessionId(request);

    const { nodes, coordinates, result, response } = await getOrComputeDemoAnalysis(() =>
      computeAnalysis(),
    );

    // Populate this session's caches so recompute + HD-full endpoints work,
    // even though the underlying computation was reused from the global cache.
    setParsedData(sessionId, { nodes, coordinates });
    setAnalysisResult(sessionId, result);

    const nextResponse = NextResponse.json(response);
    applySessionCookie(nextResponse, setCookieHeader);
    return nextResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[api/analyze] Error:', message);

    return NextResponse.json(
      { error: 'Analysis failed', details: message },
      { status: 500 },
    );
  }
}

// -- Analysis Computation -----------------------------------------------------

/**
 * Performs the full FEM analysis pipeline: CSV parsing, coordinate parsing,
 * safety-factor computation, and the final JSON response shape (Haigh
 * diagram + 3D visualization data). Called at most once per server process
 * — see `getOrComputeDemoAnalysis`.
 */
async function computeAnalysis(): Promise<DemoAnalysisCacheEntry> {
  const startTime = performance.now();
  console.log('[api/analyze] No cached demo result yet — loading CSV files and running analysis...');

  // Resolve file paths relative to the monorepo root
  const projectRoot = path.join(process.cwd(), '../..');
  const basePath = path.join(projectRoot, 'data/reference/base/Base_Case.csv');
  const loadPath = path.join(projectRoot, 'data/reference/load/Running_Ex_CD.csv');
  const coordsPath = path.join(
    projectRoot,
    'data/reference/coordinates/Lower_Car_ASSY-Base Case_coordinates.csv',
  );

  console.log(`[api/analyze] Base file: ${basePath}`);
  console.log(`[api/analyze] Load file: ${loadPath}`);

  // Parse CSV files
  const nodes = await loadFEMNodeStress(basePath, loadPath);
  console.log(`[api/analyze] Loaded ${nodes.length} nodes`);

  // Parse node coordinates for 3D visualization (best-effort — reference
  // dataset ships a coordinates file, but don't fail the whole analysis
  // if it's missing or unreadable).
  let coordinates: readonly NodeCoordinates[] | null = null;
  try {
    coordinates = await parseCoordinatesCSV(coordsPath);
    console.log(`[api/analyze] Loaded ${coordinates.length} node coordinates`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`[api/analyze] Could not load coordinates file: ${message}`);
  }

  // Run full analysis
  const result = analyzeFEMData(nodes, MATERIAL);
  console.log('[api/analyze] Analysis complete');

  const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
  const response = buildResponse(result, elapsed, coordinates);

  console.log(
    `[api/analyze] Computed and cached process-wide in ${elapsed}s — ` +
      'all future requests (any session) will reuse this instantly',
  );

  return { nodes, coordinates, result, response };
}

// -- Response Types -----------------------------------------------------------

interface AnalysisResponse {
  readonly material: typeof MATERIAL;
  readonly nodeCount: number;
  readonly computeTimeSeconds: string;
  readonly minSafetyFactors: ReturnType<typeof sanitizeAllMinSF>;
  /** Failure criterion lines (same for all components — depend only on material) */
  readonly haighLines: HaighLines;
  /** Pre-computed worst-10k scatter points per stress component */
  readonly haighPointsByComponent: Record<StressComponent, ComponentHaighData>;
  /** 3D visualization data, present when node coordinates were available */
  readonly visualization3D: Visualization3DData | null;
}

// -- Response Builder ---------------------------------------------------------

function buildResponse(
  result: FEMAnalysisResult,
  elapsed: string,
  coordinates: readonly NodeCoordinates[] | null,
): AnalysisResponse {
  // Generate Haigh diagram for the first component to extract the failure lines
  // (lines are identical for all components — they only depend on material)
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

  // VON points are already computed from firstHaigh
  haighPointsByComponent.VON = {
    points: selectWorstPoints(firstHaigh.points, MAX_SCATTER_POINTS),
    totalPoints: firstHaigh.points.length,
  };

  // Generate points for P1, P2, P3
  for (const comp of ALL_COMPONENTS) {
    if (comp === 'VON') continue; // already done

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

  // Build 3D visualization data if coordinates were available
  const coordMap = coordinates
    ? new Map(coordinates.map((c) => [c.nodeId, c]))
    : null;

  const visualization3D = coordMap
    ? buildVisualization3D(coordMap, result.safetyFactors, MAX_3D_POINTS)
    : null;

  return {
    material: MATERIAL,
    nodeCount: result.nodeCount,
    computeTimeSeconds: elapsed,
    minSafetyFactors: sanitizeAllMinSF(result.minSafetyFactors),
    haighLines,
    haighPointsByComponent,
    visualization3D,
  };
}
