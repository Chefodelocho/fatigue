/**
 * Health check endpoint for Docker container orchestration.
 *
 * Returns a lightweight 200 OK response that load balancers and
 * container orchestrators (Docker, Kubernetes) can poll to verify
 * the application is running and responsive.
 *
 * @module api/health
 */

import { NextResponse } from 'next/server';

/** Uptime tracking — set when the module first loads. */
const startedAt = Date.now();

/**
 * GET /api/health
 *
 * @returns JSON with service status and uptime
 */
export async function GET(): Promise<NextResponse> {
  const uptimeSeconds = Math.floor((Date.now() - startedAt) / 1000);

  return NextResponse.json(
    {
      status: 'ok',
      service: 'fatigue-analysis',
      version: process.env['npm_package_version'] ?? '0.1.0',
      uptimeSeconds,
      timestamp: new Date().toISOString(),
    },
    { status: 200 },
  );
}
