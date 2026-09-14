/**
 * Session cookie utilities for cookie-dependent result caching.
 *
 * Each browser session gets its own analysis cache keyed by a
 * `fatigue-session-id` cookie. This prevents cross-session data
 * leaks when the app is deployed behind Docker with multiple
 * users sharing the same server process.
 *
 * Usage in route handlers:
 *
 * ```ts
 * import { getOrCreateSessionId, applySessionCookie } from '@/lib/session-cookie';
 *
 * export async function GET(request: NextRequest): Promise<NextResponse> {
 *   const { sessionId, setCookieHeader } = getOrCreateSessionId(request);
 *   const response = NextResponse.json(data);
 *   applySessionCookie(response, setCookieHeader);
 *   return response;
 * }
 * ```
 *
 * @module lib/session-cookie
 */

import type { NextRequest, NextResponse } from 'next/server';

// -- Constants -----------------------------------------------------------------

/** Cookie name for session identification. */
export const SESSION_COOKIE_NAME = 'fatigue-session-id';

/** Cookie max age: 24 hours (in seconds). */
const SESSION_MAX_AGE = 60 * 60 * 24;

/** Inactivity timeout: auto-invalidate cache after 2 hours (ms). */
const SESSION_CACHE_TTL = 2 * 60 * 60 * 1000;

// -- Types ---------------------------------------------------------------------

export interface SessionCookieResult {
  /** The session ID (existing or newly generated). */
  readonly sessionId: string;
  /**
   * A `Set-Cookie` header value, or `null` if the session cookie
   * already existed. Pass to `applySessionCookie()`.
   */
  readonly setCookieHeader: string | null;
}

// -- Session-scoped cache store ------------------------------------------------

interface CacheEntry<V> {
  value: V;
  timestamp: number;
}

/**
 * Next.js compiles each API route handler as its own separate bundle. That
 * means a plain module-scope singleton (e.g. `const cache = new Map()`
 * defined in a shared `lib/*.ts` file) gets a SEPARATE instance baked into
 * every route that imports it — even though all routes run inside the same
 * Node.js process. Two different routes reading/writing "the same" cache
 * would silently talk to two different Maps, so cross-route caches (e.g.
 * `/api/analyze` writing parsed data that `/api/recompute` reads) would
 * never see each other's data.
 *
 * Storing the backing Map on `globalThis`, keyed by a unique cache name,
 * sidesteps this: `globalThis` is the actual process-wide global object, so
 * every route bundle resolves to the exact same Map regardless of which
 * compiled copy of this module instantiated it.
 */
function getGlobalStore<V>(name: string): Map<string, CacheEntry<V>> {
  const globalForCache = globalThis as unknown as {
    __fatigueSessionCaches__?: Map<string, Map<string, CacheEntry<unknown>>>;
  };

  if (!globalForCache.__fatigueSessionCaches__) {
    globalForCache.__fatigueSessionCaches__ = new Map();
  }

  let store = globalForCache.__fatigueSessionCaches__.get(name);
  if (!store) {
    store = new Map<string, CacheEntry<unknown>>();
    globalForCache.__fatigueSessionCaches__.set(name, store);
  }

  return store as Map<string, CacheEntry<V>>;
}

/**
 * A simple in-memory cache keyed by session ID.
 *
 * Used to avoid recomputing the expensive FEM analysis on every
 * request while still isolating results per browser session.
 * Entries older than {@link SESSION_CACHE_TTL} are evicted lazily.
 */
class SessionCache<V> {
  private readonly _store: Map<string, CacheEntry<V>>;

  constructor(name: string) {
    this._store = getGlobalStore<V>(name);
  }

  /**
   * Retrieves a cached value for the given session ID.
   * Returns `undefined` if missing or expired.
   */
  get(sessionId: string): V | undefined {
    const entry = this._store.get(sessionId);
    if (!entry) return undefined;

    if (Date.now() - entry.timestamp > SESSION_CACHE_TTL) {
      this._store.delete(sessionId);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Stores a value for the given session ID.
   */
  set(sessionId: string, value: V): void {
    this._evictStale();
    this._store.set(sessionId, { value, timestamp: Date.now() });
  }

  /** Removes entries older than SESSION_CACHE_TTL. */
  private _evictStale(): void {
    const now = Date.now();
    for (const [key, entry] of this._store) {
      if (now - entry.timestamp > SESSION_CACHE_TTL) {
        this._store.delete(key);
      }
    }
  }
}

// -- Public API ----------------------------------------------------------------

/**
 * Creates a session-scoped cache instance backed by a process-wide store.
 *
 * @param name - Unique cache domain name (e.g. `'parsed-data'`,
 *   `'analysis-result'`). Must be unique per logical cache — reusing a name
 *   across unrelated caches would make them share the same backing Map.
 */
export function createSessionCache<V>(name: string): SessionCache<V> {
  return new SessionCache<V>(name);
}

/**
 * Reads the session cookie from the incoming request.
 *
 * If the cookie is absent, a new UUID-based session ID is generated
 * and a `Set-Cookie` header value is returned so the caller can
 * attach it to the response.
 *
 * @param request - The incoming NextRequest
 * @returns Session ID and optional Set-Cookie header
 */
export function getOrCreateSessionId(request: NextRequest): SessionCookieResult {
  const existing = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (existing) {
    return { sessionId: existing, setCookieHeader: null };
  }

  const sessionId = generateSessionId();
  const cookieStr = serializeCookie(SESSION_COOKIE_NAME, sessionId);

  return { sessionId, setCookieHeader: cookieStr };
}

/**
 * Builds a session-aware cache key from the given prefix and session ID.
 *
 * @param prefix    - Cache key prefix (e.g., `'analyze'` or `'analyze-upload'`)
 * @param sessionId - The session ID from `getOrCreateSessionId`
 * @returns A unique cache key string scoped to the session
 */
export function buildCacheKey(prefix: string, sessionId: string): string {
  return `${prefix}:${sessionId}`;
}

/**
 * Attaches a `Set-Cookie` header to a NextResponse if a new cookie
 * was generated.
 *
 * @param response        - The response to attach the cookie to
 * @param setCookieHeader - The header value from `SessionCookieResult`, or `null`
 */
export function applySessionCookie(
  response: NextResponse,
  setCookieHeader: string | null,
): void {
  if (setCookieHeader) {
    response.headers.set('Set-Cookie', setCookieHeader);
  }
}

// -- Internal Helpers ----------------------------------------------------------

/**
 * Generates a cryptographically-random session ID using `crypto.randomUUID()`.
 * Available in all modern Node.js (v20+).
 */
function generateSessionId(): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const crypto = require('crypto');
  return crypto.randomUUID();
}

/**
 * Serializes a cookie name/value pair into a `Set-Cookie` header string.
 */
function serializeCookie(name: string, value: string): string {
  const parts: string[] = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`];

  parts.push(`Max-Age=${SESSION_MAX_AGE}`);
  parts.push('Path=/');
  parts.push('HttpOnly');

  if (process.env.NODE_ENV === 'production') {
    parts.push('Secure');
  }

  parts.push('SameSite=Lax');

  return parts.join('; ');
}
