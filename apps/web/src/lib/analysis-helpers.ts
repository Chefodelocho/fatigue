/**
 * Shared helpers for building analysis API responses.
 *
 * Extracted from the analyze routes to avoid duplication between
 * `/api/analyze`, `/api/analyze-upload`, and `/api/recompute`.
 *
 * @module lib/analysis-helpers
 */

import type {
  BoundingBox3D,
  Component3DData,
  HaighLinePoint,
  HaighPoint,
  Node3DVizPoint,
  NodeCoordinates,
  NodeSafetyFactors,
  StressComponent,
  Visualization3DData,
} from '@fatigue/types';

// -- Types -------------------------------------------------------------------

export interface HaighLines {
  readonly goodmanLine: readonly HaighLinePoint[];
  readonly gerberLine: readonly HaighLinePoint[];
  readonly soderbergLine: readonly HaighLinePoint[];
  readonly yieldLine: readonly HaighLinePoint[];
}

export interface ComponentHaighData {
  readonly points: readonly HaighPoint[];
  readonly totalPoints: number;
}

// -- Constants ---------------------------------------------------------------

const MAX_BACKGROUND_POINTS = 40_000;

// -- Haigh / SF helpers ------------------------------------------------------

/**
 * Select the worst (lowest Goodman SF) Haigh points up to `maxSize`.
 *
 * Filters out non-finite Goodman SF values before sorting.
 */
export function selectWorstPoints(
  points: readonly HaighPoint[],
  maxSize: number,
): readonly HaighPoint[] {
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
 * Replaces NaN / Infinity values with a finite fallback.
 */
export function sanitizeNodeSF(sf: NodeSafetyFactors): NodeSafetyFactors {
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

/**
 * Sanitize all min safety factors for JSON response.
 */
export function sanitizeAllMinSF(
  minSF: Record<StressComponent, NodeSafetyFactors>,
): Record<StressComponent, NodeSafetyFactors> {
  return {
    VON: sanitizeNodeSF(minSF.VON),
    P1: sanitizeNodeSF(minSF.P1),
    P2: sanitizeNodeSF(minSF.P2),
    P3: sanitizeNodeSF(minSF.P3),
  };
}

// -- 3D Visualization Builder ------------------------------------------------

const ALL_COMPONENTS: readonly StressComponent[] = ['VON', 'P1', 'P2', 'P3'] as const;

/**
 * Build 3D visualization data from coordinates and safety factors.
 *
 * Joins node coordinates with safety factor data, then creates per-component
 * worst-node lists capped at `maxPoints`. Background coordinates are sampled
 * using deterministic stride-based sampling for context rendering.
 *
 * @param coordinates - Map of nodeId → spatial coordinates
 * @param safetyFactors - Per-component arrays of node safety factors
 * @param maxPoints - Maximum number of worst nodes per component
 * @returns 3D visualization data, or `null` if no nodes matched
 */
export function buildVisualization3D(
  coordinates: ReadonlyMap<number, NodeCoordinates>,
  safetyFactors: {
    readonly VON: readonly NodeSafetyFactors[];
    readonly P1: readonly NodeSafetyFactors[];
    readonly P2: readonly NodeSafetyFactors[];
    readonly P3: readonly NodeSafetyFactors[];
  },
  maxPoints: number,
): Visualization3DData | null {
  const worstByComponent: Record<StressComponent, Component3DData> =
    {} as Record<StressComponent, Component3DData>;

  let totalMatchedNodes = 0;
  const allMatchedCoords: NodeCoordinates[] = [];

  for (const comp of ALL_COMPONENTS) {
    const factors = safetyFactors[comp];
    const joined: Node3DVizPoint[] = [];

    for (const sf of factors) {
      const coord = coordinates.get(sf.nodeId);
      if (!coord) continue;

      const fin = (v: number) => (Number.isFinite(v) ? v : 9999.99);

      joined.push({
        nodeId: sf.nodeId,
        x: coord.x,
        y: coord.y,
        z: coord.z,
        minSF: fin(sf.minSF),
        goodmanSF: fin(sf.goodmanSF),
        gerberSF: fin(sf.gerberSF),
        soderbergSF: fin(sf.soderbergSF),
        meanStress: sf.meanStress,
        alternatingStress: sf.alternatingStress,
      });
    }

    if (comp === 'VON') {
      totalMatchedNodes = joined.length;
      for (const p of joined) {
        allMatchedCoords.push({ nodeId: p.nodeId, x: p.x, y: p.y, z: p.z });
      }
    }

    const sorted = [...joined].sort((a, b) => a.minSF - b.minSF);
    const worstNodes = sorted.slice(0, maxPoints);

    worstByComponent[comp] = {
      worstNodes,
      totalMatchedNodes: joined.length,
    };
  }

  if (totalMatchedNodes === 0) {
    return null;
  }

  const initialBounds: BoundingBox3D = {
    minX: Infinity,
    maxX: -Infinity,
    minY: Infinity,
    maxY: -Infinity,
    minZ: Infinity,
    maxZ: -Infinity,
  };

  const bounds: BoundingBox3D = allMatchedCoords.reduce(
    (acc, c) => ({
      minX: Math.min(acc.minX, c.x),
      maxX: Math.max(acc.maxX, c.x),
      minY: Math.min(acc.minY, c.y),
      maxY: Math.max(acc.maxY, c.y),
      minZ: Math.min(acc.minZ, c.z),
      maxZ: Math.max(acc.maxZ, c.z),
    }),
    initialBounds,
  );

  const totalCoords = allMatchedCoords.length;
  let backgroundCoordinates: readonly NodeCoordinates[];
  if (totalCoords <= MAX_BACKGROUND_POINTS) {
    backgroundCoordinates = allMatchedCoords;
  } else {
    const stride = totalCoords / MAX_BACKGROUND_POINTS;
    const sampled: NodeCoordinates[] = [];
    for (let i = 0; i < MAX_BACKGROUND_POINTS; i++) {
      const idx = Math.floor(i * stride);
      const point = allMatchedCoords[idx];
      if (point !== undefined) {
        sampled.push(point);
      }
    }
    backgroundCoordinates = sampled;
  }

  return {
    coordinateNodeCount: coordinates.size,
    matchedNodeCount: totalMatchedNodes,
    bounds,
    backgroundCoordinates,
    worstByComponent,
  };
}
