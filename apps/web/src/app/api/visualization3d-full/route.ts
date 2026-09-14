/**
 * API route for the "HD / Detail" full-node 3D visualization.
 *
 * Unlike the default 3D visualization (worst 10,000 nodes + a 40,000-node
 * random background sample, embedded in the main analyze/recompute
 * responses), this endpoint returns EVERY matched node for a single stress
 * component, color-coded by its own safety factor.
 *
 * It's a separate, on-demand endpoint because the full dataset can contain
 * 500K+ entries and meaningfully increases payload size and client-side
 * rendering cost — the frontend only fetches it when the user explicitly
 * opts into "HD / Detail" mode.
 *
 * Reads from the session-scoped analysis result cache (populated by
 * `/api/analyze`, `/api/analyze-upload`, and `/api/recompute`) and the
 * parsed-data cache (for node coordinates), so it never re-parses CSVs and
 * only re-runs the (cheap) coordinate join — no fatigue analysis is
 * recomputed.
 *
 * The columnar payload is still tens of MB for large models. Next.js's
 * built-in gzip compression does not reliably apply to streamed Route
 * Handler responses, so this route gzips the JSON itself (when the client
 * sends `Accept-Encoding: gzip`) — typically a ~3-4x size reduction for
 * this kind of repetitive numeric data.
 *
 * @module api/visualization3d-full
 */

import { gzip } from 'node:zlib';
import { promisify } from 'node:util';

import { type NextRequest, NextResponse } from 'next/server';

import type { StressComponent } from '@fatigue/types';

import { buildFullComponent3DData } from '@/lib/analysis-helpers';
import { getAnalysisResult } from '@/lib/analysis-result-cache';
import { getParsedData } from '@/lib/parsed-data-cache';
import { applySessionCookie, getOrCreateSessionId } from '@/lib/session-cookie';

const gzipAsync = promisify(gzip);

// -- Configuration -----------------------------------------------------------

const VALID_COMPONENTS: readonly StressComponent[] = ['VON', 'P1', 'P2', 'P3'] as const;

function isStressComponent(value: string | null): value is StressComponent {
  return value !== null && (VALID_COMPONENTS as readonly string[]).includes(value);
}

// -- GET Handler ---------------------------------------------------------------

/**
 * GET /api/visualization3d-full?component=VON|P1|P2|P3
 *
 * Returns the full-detail (all matched nodes) 3D visualization dataset for
 * a single stress component, using the session's cached analysis result
 * and parsed coordinates.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = performance.now();

  try {
    const { sessionId, setCookieHeader } = getOrCreateSessionId(request);

    const componentParam = request.nextUrl.searchParams.get('component');
    if (!isStressComponent(componentParam)) {
      return NextResponse.json(
        { error: 'Invalid or missing "component" query parameter. Expected VON, P1, P2, or P3.' },
        { status: 400 },
      );
    }
    const component = componentParam;

    const result = getAnalysisResult(sessionId);
    if (!result) {
      return NextResponse.json(
        {
          error: 'No cached analysis result found',
          details:
            'Your session data has expired or no analysis has been run yet. ' +
            'Please run or reload an analysis first.',
        },
        { status: 404 },
      );
    }

    const parsed = getParsedData(sessionId);
    if (!parsed?.coordinates) {
      return NextResponse.json(
        {
          error: 'No coordinate data available',
          details: 'This analysis was run without a node coordinates file.',
        },
        { status: 400 },
      );
    }

    console.log(
      `[api/visualization3d-full] Session ${sessionId.slice(0, 8)}… — ` +
        `building full 3D dataset for ${component} (${parsed.coordinates.length} coords)`,
    );

    const coordMap = new Map(parsed.coordinates.map((c) => [c.nodeId, c]));
    const data = buildFullComponent3DData(coordMap, result.safetyFactors[component], component);

    if (!data) {
      return NextResponse.json(
        { error: 'No matching nodes found between stress data and coordinates' },
        { status: 404 },
      );
    }

    const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
    console.log(
      `[api/visualization3d-full] Built ${data.totalMatchedNodes} nodes for ${component} in ${elapsed}s`,
    );

    const acceptsGzip = (request.headers.get('accept-encoding') ?? '').includes('gzip');
    const jsonBody = JSON.stringify(data);

    let response: NextResponse;
    if (acceptsGzip) {
      const compressed = await gzipAsync(jsonBody);
      console.log(
        `[api/visualization3d-full] Gzipped payload: ${jsonBody.length} → ${compressed.length} bytes`,
      );
      response = new NextResponse(compressed, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Encoding': 'gzip',
        },
      });
    } else {
      response = new NextResponse(jsonBody, {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    applySessionCookie(response, setCookieHeader);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[api/visualization3d-full] Error:', message);

    return NextResponse.json(
      { error: 'Failed to build full 3D visualization', details: message },
      { status: 500 },
    );
  }
}
