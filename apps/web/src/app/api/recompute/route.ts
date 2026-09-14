/**
 * API route for recomputing fatigue analysis with a different material.
 *
 * Accepts new material properties and re-runs only the material-dependent
 * part of the analysis (safety factors, Haigh diagram, 3D visualization)
 * using the cached parsed FEM data from the previous analysis run.
 *
 * This avoids re-parsing CSV files and is near-instant compared to the
 * initial analysis. Requires an active session with cached parsed data.
 *
 * @module api/recompute
 */

import { type NextRequest, NextResponse } from 'next/server';

import type { StressComponent } from '@fatigue/types';

import { analyzeFEMData, generateHaighDiagramData } from '@fatigue/core';

import {
  buildVisualization3D,
  selectWorstPoints,
  sanitizeAllMinSF,
  type HaighLines,
  type ComponentHaighData,
} from '@/lib/analysis-helpers';
import { getParsedData } from '@/lib/parsed-data-cache';
import { setAnalysisResult } from '@/lib/analysis-result-cache';
import {
  applySessionCookie,
  getOrCreateSessionId,
} from '@/lib/session-cookie';

// -- Configuration -----------------------------------------------------------

const MAX_SCATTER_POINTS = 10_000;
const MAX_3D_POINTS = 10_000;
const ALL_COMPONENTS: readonly StressComponent[] = ['VON', 'P1', 'P2', 'P3'] as const;

// -- POST Handler ------------------------------------------------------------

/**
 * POST /api/recompute
 *
 * Recomputes fatigue analysis with a new material using cached parsed data.
 *
 * Request body:
 * ```json
 * { "material": { "ultimateStrength": 500, "yieldStrength": 350, "enduranceLimit": 250 } }
 * ```
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = performance.now();

  try {
    const { sessionId, setCookieHeader } = getOrCreateSessionId(request);

    // Look up cached parsed data for this session
    const parsed = getParsedData(sessionId);

    if (!parsed) {
      return NextResponse.json(
        {
          error: 'No cached analysis data found',
          details:
            'Your session data has expired or no analysis has been run yet. ' +
            'Please run a new analysis first.',
        },
        { status: 404 },
      );
    }

    // Parse new material from request body
    const body = (await request.json()) as {
      material?: {
        ultimateStrength?: number;
        yieldStrength?: number;
        enduranceLimit?: number;
      };
    };

    if (!body.material) {
      return NextResponse.json({ error: 'Missing material properties' }, { status: 400 });
    }

    const { ultimateStrength, yieldStrength, enduranceLimit } = body.material;

    if (
      !ultimateStrength ||
      !yieldStrength ||
      !enduranceLimit ||
      ultimateStrength <= 0 ||
      yieldStrength < 0 ||
      enduranceLimit <= 0
    ) {
      return NextResponse.json(
        { error: 'Invalid material properties. Ensure σu > 0, σy ≥ 0, σe > 0.' },
        { status: 400 },
      );
    }

    const material = { ultimateStrength, yieldStrength, enduranceLimit };

    console.log(
      `[api/recompute] Session ${sessionId.slice(0, 8)}… — ` +
        `recomputing with σu=${ultimateStrength}, σy=${yieldStrength}, σe=${enduranceLimit}`,
    );

    // Run analysis with new material (fast — no CSV parsing)
    const result = analyzeFEMData(parsed.nodes, material);

    // Cache the full result so /api/visualization3d-full can build the
    // HD (all-nodes) 3D dataset on demand without recomputing.
    setAnalysisResult(sessionId, result);

    // Build response (same format as analyze/analyze-upload)
    const firstHaigh = generateHaighDiagramData(result.material, result.safetyFactors.VON, 'VON');

    const haighLines: HaighLines = {
      goodmanLine: firstHaigh.goodmanLine,
      gerberLine: firstHaigh.gerberLine,
      soderbergLine: firstHaigh.soderbergLine,
      yieldLine: firstHaigh.yieldLine,
    };

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

    // Build 3D visualization if coordinates were cached
    const visualization3D = parsed.coordinates
      ? buildVisualization3D(
          new Map(parsed.coordinates.map((c) => [c.nodeId, c])),
          result.safetyFactors,
          MAX_3D_POINTS,
        )
      : null;

    const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);

    const responsePayload = {
      material,
      nodeCount: result.nodeCount,
      computeTimeSeconds: elapsed,
      minSafetyFactors: sanitizeAllMinSF(result.minSafetyFactors),
      haighLines,
      haighPointsByComponent,
      visualization3D,
    };

    console.log(`[api/recompute] Recomputed in ${elapsed}s`);

    const response = NextResponse.json(responsePayload);
    applySessionCookie(response, setCookieHeader);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[api/recompute] Error:', message);
    return NextResponse.json(
      { error: 'Recomputation failed', details: message },
      { status: 500 },
    );
  }
}
