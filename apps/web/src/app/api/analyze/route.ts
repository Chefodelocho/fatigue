/**
 * API route for FEM fatigue analysis (reference dataset).
 *
 * Reads CSV files from the reference data directory, runs the full
 * analysis pipeline (CSV parsing → stress pair computation → safety
 * factors → Haigh diagram), and returns the result as JSON.
 *
 * Results are cached PER SESSION using a `fatigue-session-id` cookie
 * so that different browser sessions get isolated caches. This is
 * essential when deployed behind Docker with multiple users sharing
 * the same server process.
 *
 * Pre-computes Haigh diagram scatter points for ALL four stress
 * components (VON, P1, P2, P3) in a single request so the frontend
 * can switch components instantly without re-fetching.
 *
 * @module api/analyze
 */

import path from 'node:path';

import { type NextRequest, NextResponse } from 'next/server';

import type {
  FEMAnalysisResult,
  HaighLinePoint,
  HaighPoint,
  NodeSafetyFactors,
  StressComponent,
} from '@fatigue/types';

import { analyzeFEMData, generateHaighDiagramData } from '@fatigue/core';
import { loadFEMNodeStress } from '@fatigue/data';

import {
  buildCacheKey,
  createSessionCache,
  getOrCreateSessionId,
  applySessionCookie,
} from '@/lib/session-cookie';

// -- Configuration ------------------------------------------------------------

/** Maximum number of scatter points per stress component. */
const MAX_SCATTER_POINTS = 10_000;

/** All stress components to pre-compute. */
const ALL_COMPONENTS: readonly StressComponent[] = ['VON', 'P1', 'P2', 'P3'] as const;

/** Default material properties for the reference dataset. */
const MATERIAL = {
  ultimateStrength: 500,
  yieldStrength: 350,
  enduranceLimit: 250,
} as const;

// -- Session-scoped cache -----------------------------------------------------

/**
 * In-memory cache keyed by session ID.
 *
 * Each browser session gets its own cached result so that recomputation
 * is avoided while ensuring cross-session isolation. Entries expire
 * after 2 hours of inactivity.
 */
const analysisCache = createSessionCache<FEMAnalysisResult>();

// -- Helpers ------------------------------------------------------------------

/**
 * Select the worst (lowest Goodman SF) Haigh points up to `maxSize`.
 *
 * Filters out non-finite Goodman SF values (NaN from computation errors,
 * Infinity from zero cyclic loading) before sorting. This ensures all
 * returned points have valid, finite safety factors that survive JSON
 * serialization without becoming null.
 *
 * @param points   - Full array of Haigh scatter points
 * @param maxSize  - Maximum number of points to return
 * @returns The worst `maxSize` points sorted by Goodman SF ascending
 */
function selectWorstPoints(points: readonly HaighPoint[], maxSize: number): readonly HaighPoint[] {
  // Filter out non-finite Goodman SF (NaN / Infinity → null in JSON → ?? 0 on client)
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
 * Replaces NaN / Infinity values with a finite fallback so they
 * survive JSON.stringify() without becoming null.
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

// -- Route Handler ------------------------------------------------------------

/**
 * GET /api/analyze
 *
 * Runs the full FEM fatigue analysis and returns results for ALL stress
 * components in a single response. Results are cached per session based
 * on the `fatigue-session-id` cookie.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = performance.now();

  try {
    // Resolve session ID from cookie (generates one if absent)
    const { sessionId, setCookieHeader } = getOrCreateSessionId(request);
    const cacheKey = buildCacheKey('analyze', sessionId);

    // Check session-scoped cache
    let result = analysisCache.get(cacheKey);

    if (!result) {
      console.log(`[api/analyze] Session ${sessionId.slice(0, 8)}… — computing fresh result`);
      result = await computeAnalysis();
      analysisCache.set(cacheKey, result);
    } else {
      console.log(`[api/analyze] Session ${sessionId.slice(0, 8)}… — using cached result`);
    }

    const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
    const json = buildResponse(result, elapsed);

    const response = NextResponse.json(json);
    applySessionCookie(response, setCookieHeader);
    return response;
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
 * Performs the full FEM analysis pipeline (no caching).
 */
async function computeAnalysis(): Promise<FEMAnalysisResult> {
  console.log('[api/analyze] Loading CSV files and running analysis...');

  // Resolve file paths relative to the monorepo root
  const projectRoot = path.join(process.cwd(), '../..');
  const basePath = path.join(projectRoot, 'data/reference/base/Base_Case.csv');
  const loadPath = path.join(projectRoot, 'data/reference/load/Running_Ex_CD.csv');

  console.log(`[api/analyze] Base file: ${basePath}`);
  console.log(`[api/analyze] Load file: ${loadPath}`);

  // Parse CSV files
  const nodes = await loadFEMNodeStress(basePath, loadPath);
  console.log(`[api/analyze] Loaded ${nodes.length} nodes`);

  // Run full analysis
  const result = analyzeFEMData(nodes, MATERIAL);
  console.log('[api/analyze] Analysis complete');

  return result;
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

interface AnalysisResponse {
  readonly material: typeof MATERIAL;
  readonly nodeCount: number;
  readonly computeTimeSeconds: string;
  readonly minSafetyFactors: Record<StressComponent, NodeSafetyFactors>;
  /** Failure criterion lines (same for all components — depend only on material) */
  readonly haighLines: HaighLines;
  /** Pre-computed worst-10k scatter points per stress component */
  readonly haighPointsByComponent: Record<StressComponent, ComponentHaighData>;
}

// -- Response Builder ---------------------------------------------------------

function buildResponse(
  result: FEMAnalysisResult,
  elapsed: string,
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

  // Sanitize min safety factors for JSON (NaN/Infinity → null in JSON otherwise)
  const sanitizedMinSF: Record<StressComponent, NodeSafetyFactors> = {
    VON: sanitizeNodeSF(result.minSafetyFactors.VON),
    P1: sanitizeNodeSF(result.minSafetyFactors.P1),
    P2: sanitizeNodeSF(result.minSafetyFactors.P2),
    P3: sanitizeNodeSF(result.minSafetyFactors.P3),
  };

  return {
    material: MATERIAL,
    nodeCount: result.nodeCount,
    computeTimeSeconds: elapsed,
    minSafetyFactors: sanitizedMinSF,
    haighLines,
    haighPointsByComponent,
  };
}
