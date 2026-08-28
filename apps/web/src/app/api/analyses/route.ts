/**
 * API route for managing saved analyses (list + save).
 *
 * GET  /api/analyses  — list all saved analysis metadata
 * POST /api/analyses  — save a new analysis (metadata + full data)
 *
 * @module api/analyses
 */

import { NextResponse } from 'next/server';

import {
  listAnalyses,
  saveAnalysis,
  type StoredAnalysisEntry,
} from '@/lib/server-analysis-store';

/**
 * GET /api/analyses
 *
 * Returns all saved analysis entries (metadata only, no full data).
 */
export async function GET(): Promise<NextResponse> {
  try {
    const entries = await listAnalyses();
    return NextResponse.json(entries);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[api/analyses] GET error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/analyses
 *
 * Saves a new analysis entry (metadata + full data) to server-side storage.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as StoredAnalysisEntry;

    if (!body.id || !body.name || !body.createdAt || !body.analysisData) {
      return NextResponse.json(
        { error: 'Missing required fields: id, name, createdAt, analysisData' },
        { status: 400 },
      );
    }

    await saveAnalysis(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[api/analyses] POST error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
