/**
 * API route for individual analysis operations (get + delete).
 *
 * GET    /api/analyses/[id]  — load full analysis data owned by this session
 * DELETE /api/analyses/[id]  — delete a saved analysis owned by this session
 *
 * @module api/analyses/[id]
 */

import { type NextRequest, NextResponse } from 'next/server';

import { getAnalysis, deleteAnalysis } from '@/lib/server-analysis-store';
import { applySessionCookie, getOrCreateSessionId } from '@/lib/session-cookie';

/**
 * GET /api/analyses/[id]
 *
 * Returns a single saved analysis with full data if it belongs to the current session.
 */
export async function GET(
  request: NextRequest,
  { params }: { readonly params: { readonly id: string } },
): Promise<NextResponse> {
  try {
    const { sessionId, setCookieHeader } = getOrCreateSessionId(request);
    const entry = await getAnalysis(params.id);

    if (!entry || entry.sessionId !== sessionId) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    const response = NextResponse.json(entry);
    applySessionCookie(response, setCookieHeader);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[api/analyses/[id]] GET error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/analyses/[id]
 *
 * Deletes a saved analysis from server-side storage if it belongs to the current session.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { readonly params: { readonly id: string } },
): Promise<NextResponse> {
  try {
    const { sessionId, setCookieHeader } = getOrCreateSessionId(request);
    const deleted = await deleteAnalysis(sessionId, params.id);

    if (!deleted) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    const response = NextResponse.json({ ok: true });
    applySessionCookie(response, setCookieHeader);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[api/analyses/[id]] DELETE error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
