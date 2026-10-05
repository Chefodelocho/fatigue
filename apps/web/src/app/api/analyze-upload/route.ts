/**
 * API route for uploaded FEM fatigue analysis.
 *
 * Accepts multipart form data with:
 * - `baseFile`: Base case CSV file
 * - `loadFile`: Loading case CSV file
 * - `material`: JSON string with material properties
 * - `coordinatesFile`: (optional) Node coordinates CSV file for 3D visualization
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
 * When a coordinates file is provided, also pre-computes 3D visualization
 * data showing the worst 10,000 nodes per component, color-coded by
 * safety factor.
 *
 * The parsed FEM data is also cached (material-independent) so that
 * the `/api/recompute` endpoint can quickly re-run the analysis when
 * the user changes material properties.
 *
 * @module api/analyze-upload
 */

import { type NextRequest, NextResponse } from 'next/server';

import type { NodeCoordinates, StressComponent } from '@fatigue/types';

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
import { getOrCreateSessionId, applySessionCookie } from '@/lib/session-cookie';

// -- Configuration -----------------------------------------------------------

const MAX_SCATTER_POINTS = 10_000;
const MAX_3D_POINTS = 10_000;
const ALL_COMPONENTS: readonly StressComponent[] = ['VON', 'P1', 'P2', 'P3'] as const;

// -- POST Handler -------------------------------------------------------------

/**
 * POST /api/analyze-upload
 *
 * Accepts FormData with CSV files and material properties, runs analysis
 * for ALL stress components, and returns pre-computed results.
 * Results are cached per session based on the `fatigue-session-id` cookie.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = performance.now();

  try {
    // Resolve session ID from cookie (generates one if absent)
    const { sessionId, setCookieHeader } = getOrCreateSessionId(request);

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

      // Parse coordinates if provided
      let coordinates: readonly NodeCoordinates[] | null = null;
      if (coordsPath) {
        const coords = await parseCoordinatesCSV(coordsPath);
        console.log(`[api/analyze-upload] Loaded ${coords.length} node coordinates`);
        coordinates = coords;
      }

      // Cache parsed data for recompute (material-independent)
      setParsedData(sessionId, { nodes, coordinates });

      const result = analyzeFEMData(nodes, material);
      const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);

      // Cache the full result so /api/visualization3d-full can build the
      // HD (all-nodes) 3D dataset on demand without recomputing.
      setAnalysisResult(sessionId, result);

      // Generate Haigh diagram for VON to extract failure lines
      const firstHaigh = generateHaighDiagramData(result.material, result.safetyFactors.VON, 'VON');

      const haighLines: HaighLines = {
        goodmanLine: firstHaigh.goodmanLine,
        gerberLine: firstHaigh.gerberLine,
        soderbergLine: firstHaigh.soderbergLine,
        yieldLine: firstHaigh.yieldLine,
      };

      // Pre-compute worst scatter points for ALL components
      const haighPointsByComponent: Record<StressComponent, ComponentHaighData> = {} as Record<
        StressComponent,
        ComponentHaighData
      >;

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

      // Build 3D visualization data if coordinates were provided
      const coordMap = coordinates ? new Map(coordinates.map((c) => [c.nodeId, c])) : null;

      const visualization3D = coordMap
        ? buildVisualization3D(coordMap, result.safetyFactors, MAX_3D_POINTS)
        : null;

      if (visualization3D) {
        console.log(
          `[api/analyze-upload] 3D viz: ${visualization3D.matchedNodeCount} matched nodes, ` +
            `worst VON count: ${visualization3D.worstByComponent.VON.worstNodes.length}`,
        );
      }

      const responsePayload = {
        material,
        nodeCount: result.nodeCount,
        computeTimeSeconds: elapsed,
        minSafetyFactors: sanitizeAllMinSF(result.minSafetyFactors),
        haighLines,
        haighPointsByComponent,
        visualization3D,
      };

      const response = NextResponse.json(responsePayload);
      applySessionCookie(response, setCookieHeader);
      return response;
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
    return NextResponse.json({ error: 'Analysis failed', details: message }, { status: 500 });
  }
}
