/**
 * API route for individual analysis operations (get + delete).
 *
 * GET    /api/analyses/[id]  — load full analysis data
 * DELETE /api/analyses/[id]  — delete a saved analysis
 *
 * @module api/analyses/[id]
 */

import { type NextRequest, NextResponse } from 'next/server';

import { getAnalysis, deleteAnalysis } from '@/lib/server-analysis-store';

/**
 * GET /api/analyses/[id]
 *
 * Returns a single saved analysis with full data.
 */
export async function GET(
  _request: NextRequest,
  { params }: { readonly params: { readonly id: string } },
): Promise<NextResponse> {
  try {
    const entry = await getAnalysis(params.id);

    if (!entry) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    return NextResponse.json(entry);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[api/analyses/[id]] GET error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/analyses/[id]
 *
 * Deletes a saved analysis from server-side storage.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { readonly params: { readonly id: string } },
): Promise<NextResponse> {
  try {
    const deleted = await deleteAnalysis(params.id);

    if (!deleted) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[api/analyses/[id]] DELETE error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
