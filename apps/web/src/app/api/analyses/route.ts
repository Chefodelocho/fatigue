/**
 * API route for managing saved analyses (list + save).
 *
 * GET  /api/analyses  — list this session's saved analysis metadata
 * POST /api/analyses  — save a new analysis owned by this session
 *
 * @module api/analyses
 */

import { type NextRequest, NextResponse } from 'next/server';

import {
  listAnalyses,
  saveAnalysis,
  type StoredAnalysisEntry,
} from '@/lib/server-analysis-store';
import {
  applySessionCookie,
  getOrCreateSessionId,
} from '@/lib/session-cookie';

/**
 * GET /api/analyses
 *
 * Returns the current session's saved analysis entries (metadata only, no full data).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { sessionId, setCookieHeader } = getOrCreateSessionId(request);
    const entries = await listAnalyses(sessionId);
    const response = NextResponse.json(entries);
    applySessionCookie(response, setCookieHeader);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[api/analyses] GET error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/analyses
 *
 * Saves a new analysis entry (metadata + full data) to server-side storage,
 * stamped with the current session ID on the server.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { sessionId, setCookieHeader } = getOrCreateSessionId(request);
    const body = (await request.json()) as StoredAnalysisEntry;

    if (!body.id || !body.name || !body.createdAt || !body.analysisData) {
      return NextResponse.json(
        { error: 'Missing required fields: id, name, createdAt, analysisData' },
        { status: 400 },
      );
    }

    await saveAnalysis(sessionId, body);
    const response = NextResponse.json({ ok: true });
    applySessionCookie(response, setCookieHeader);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[api/analyses] POST error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
