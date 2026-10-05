/**
 * Unit tests for generateHaighDiagramData.
 *
 * Validates the Haigh diagram data generation, including failure lines
 * (Goodman, Gerber, Soderberg), yield boundary, and scatter point extraction.
 *
 * Material: σu = 500 MPa, σy = 350 MPa, σe = 250 MPa
 *
 * @module mean-stress/haigh.test
 */

import { describe, it, expect } from 'vitest';

import type { FEMMaterialProperties, NodeSafetyFactors } from '@fatigue/types';

import { generateHaighDiagramData } from './haigh';

/** Standard test material: σu=500, σy=350, σe=250 MPa */
const MATERIAL: FEMMaterialProperties = {
  ultimateStrength: 500,
  yieldStrength: 350,
  enduranceLimit: 250,
};

/** Absolute tolerance for stress values: |expected − actual| < 0.01 MPa */
const STRESS_TOLERANCE = 0.01;

/**
 * Helper: find a point in the line array closest to a given mean stress.
 */
function findPointNearMean(
  points: readonly { readonly mean: number; readonly alternating: number }[],
  targetMean: number,
): { mean: number; alternating: number } | undefined {
  return points.reduce<{ mean: number; alternating: number } | undefined>((best, pt) => {
    if (best === undefined) return pt;
    return Math.abs(pt.mean - targetMean) < Math.abs(best.mean - targetMean) ? pt : best;
  }, undefined);
}

function requireDefined<T>(value: T | undefined): T {
  if (value === undefined) {
    throw new Error('Expected value to be defined');
  }

  return value;
}

/**
 * Helper: create a minimal NodeSafetyFactors object for testing.
 */
function makeNodeSF(
  nodeId: number,
  component: string,
  sigmaA: number,
  sigmaM: number,
): NodeSafetyFactors {
  return {
    nodeId,
    stressComponent: component as 'VON' | 'P1' | 'P2' | 'P3',
    meanStress: sigmaM,
    alternatingStress: sigmaA,
    goodmanSF: 1.0,
    gerberSF: 1.0,
    soderbergSF: 1.0,
    minSF: 1.0,
  };
}

describe('generateHaighDiagramData', () => {
  // -- Basic structure -------------------------------------------------------

  it('should return all required diagram data fields', () => {
    const result = generateHaighDiagramData(MATERIAL, [], 'VON');

    expect(result).toHaveProperty('goodmanLine');
    expect(result).toHaveProperty('gerberLine');
    expect(result).toHaveProperty('soderbergLine');
    expect(result).toHaveProperty('yieldLine');
    expect(result).toHaveProperty('points');
  });

  // -- Goodman line ----------------------------------------------------------

  describe('Goodman line', () => {
    it('should start at (0, σe) = (0, 250)', () => {
      const result = generateHaighDiagramData(MATERIAL, [], 'VON');
      const pt = requireDefined(findPointNearMean(result.goodmanLine, 0));

      expect(Math.abs(pt.mean)).toBeLessThan(1); // Near σm = 0
      expect(pt.alternating).toBeCloseTo(250, 1);
    });

    it('should end at (σu, 0) = (500, 0)', () => {
      const result = generateHaighDiagramData(MATERIAL, [], 'VON');
      const pt = requireDefined(findPointNearMean(result.goodmanLine, 500));

      expect(Math.abs(pt.mean - 500)).toBeLessThan(STRESS_TOLERANCE * 100);
      expect(pt.alternating).toBeCloseTo(0, 1);
    });

    it('should have σa > 0 at σm = -σu (compressive region)', () => {
      // Goodman line: σa = σe × (1 - σm/σu) = 250 × (1 - (-500)/500) = 250 × 2 = 500
      const result = generateHaighDiagramData(MATERIAL, [], 'VON');
      const pt = requireDefined(findPointNearMean(result.goodmanLine, -500));

      expect(pt.alternating).toBeCloseTo(500, 1);
    });

    it('should be linear (constant slope between endpoints)', () => {
      const result = generateHaighDiagramData(MATERIAL, [], 'VON');
      const line = result.goodmanLine;

      // Check linearity: σa + (σe/σu)·σm should be constant = σe for all points
      for (const pt of line) {
        const value = pt.alternating + (250 / 500) * pt.mean;
        expect(Math.abs(value - 250)).toBeLessThan(0.1);
      }
    });
  });

  // -- Gerber parabola -------------------------------------------------------

  describe('Gerber parabola', () => {
    it('should peak at (0, σe) = (0, 250)', () => {
      const result = generateHaighDiagramData(MATERIAL, [], 'VON');
      const pt = requireDefined(findPointNearMean(result.gerberLine, 0));

      expect(Math.abs(pt.mean)).toBeLessThan(1);
      expect(pt.alternating).toBeCloseTo(250, 1);
    });

    it('should touch zero at σm = ±σu', () => {
      const result = generateHaighDiagramData(MATERIAL, [], 'VON');

      const atPlusU = requireDefined(findPointNearMean(result.gerberLine, 500));
      const atMinusU = requireDefined(findPointNearMean(result.gerberLine, -500));

      expect(atPlusU.alternating).toBeCloseTo(0, 1);
      expect(atMinusU.alternating).toBeCloseTo(0, 1);
    });

    it('should be symmetric about σm = 0', () => {
      const result = generateHaighDiagramData(MATERIAL, [], 'VON');
      const line = result.gerberLine;

      // For each point with positive σm, find the corresponding negative σm point
      for (const pt of line) {
        if (pt.mean > 0) {
          const mirror = findPointNearMean(line, -pt.mean);
          if (mirror) {
            expect(Math.abs(pt.alternating - mirror.alternating)).toBeLessThan(0.5);
          }
        }
      }
    });

    it('should satisfy the parabola equation σa = σe × (1 − (σm/σu)²)', () => {
      const result = generateHaighDiagramData(MATERIAL, [], 'VON');
      const { ultimateStrength: sigmaU, enduranceLimit: sigmaE } = MATERIAL;

      for (const pt of result.gerberLine) {
        const expected = sigmaE * (1 - (pt.mean / sigmaU) ** 2);
        expect(Math.abs(expected - pt.alternating)).toBeLessThan(0.5);
      }
    });
  });

  // -- Soderberg line --------------------------------------------------------

  describe('Soderberg line', () => {
    it('should start at (0, σe) = (0, 250)', () => {
      const result = generateHaighDiagramData(MATERIAL, [], 'VON');
      const pt = requireDefined(findPointNearMean(result.soderbergLine, 0));

      expect(Math.abs(pt.mean)).toBeLessThan(1);
      expect(pt.alternating).toBeCloseTo(250, 1);
    });

    it('should end at (σy, 0) = (350, 0)', () => {
      const result = generateHaighDiagramData(MATERIAL, [], 'VON');
      const pt = requireDefined(findPointNearMean(result.soderbergLine, 350));

      expect(Math.abs(pt.mean - 350)).toBeLessThan(STRESS_TOLERANCE * 100);
      expect(pt.alternating).toBeCloseTo(0, 1);
    });

    it('should not extend beyond ±σy on the σm axis', () => {
      const result = generateHaighDiagramData(MATERIAL, [], 'VON');

      for (const pt of result.soderbergLine) {
        expect(Math.abs(pt.mean)).toBeLessThanOrEqual(350 + 1); // Within rounding
      }
    });
  });

  // -- Yield boundary --------------------------------------------------------

  describe('Yield boundary', () => {
    it('should peak at (0, σy) = (0, 350)', () => {
      const result = generateHaighDiagramData(MATERIAL, [], 'VON');
      const pt = requireDefined(findPointNearMean(result.yieldLine, 0));

      expect(Math.abs(pt.mean)).toBeLessThan(1);
      expect(pt.alternating).toBeCloseTo(350, 1);
    });

    it('should touch zero at σm = ±σy', () => {
      const result = generateHaighDiagramData(MATERIAL, [], 'VON');

      const atPlusY = requireDefined(findPointNearMean(result.yieldLine, 350));
      const atMinusY = requireDefined(findPointNearMean(result.yieldLine, -350));

      expect(atPlusY.alternating).toBeCloseTo(0, 1);
      expect(atMinusY.alternating).toBeCloseTo(0, 1);
    });

    it('should form a triangle with vertices at (−σy, 0), (0, σy), (σy, 0)', () => {
      const result = generateHaighDiagramData(MATERIAL, [], 'VON');

      // Verify the yield boundary: σa = σy − |σm|
      for (const pt of result.yieldLine) {
        const expected = 350 - Math.abs(pt.mean);
        expect(Math.abs(expected - pt.alternating)).toBeLessThan(1.0);
      }
    });
  });

  // -- Scatter points --------------------------------------------------------

  describe('Scatter points', () => {
    it('should return empty points when no safety factors are provided', () => {
      const result = generateHaighDiagramData(MATERIAL, [], 'VON');

      expect(result.points).toHaveLength(0);
    });

    it('should filter points by stress component', () => {
      const nodeData: NodeSafetyFactors[] = [
        makeNodeSF(1, 'VON', 100, 200),
        makeNodeSF(2, 'P1', 80, 150),
        makeNodeSF(3, 'VON', 120, 250),
      ];

      const result = generateHaighDiagramData(MATERIAL, nodeData, 'VON');

      expect(result.points).toHaveLength(2);
      expect(requireDefined(result.points[0]).nodeId).toBe(1);
      expect(requireDefined(result.points[1]).nodeId).toBe(3);
    });

    it('should preserve mean and alternating stress in scatter points', () => {
      const nodeData: NodeSafetyFactors[] = [makeNodeSF(1, 'VON', 100, 200)];

      const result = generateHaighDiagramData(MATERIAL, nodeData, 'VON');

      expect(result.points).toHaveLength(1);
      const point = requireDefined(result.points[0]);
      expect(point.mean).toBe(200);
      expect(point.alternating).toBe(100);
      expect(point.stressComponent).toBe('VON');
    });
  });

  // -- Relative positions of failure lines ----------------------------------

  describe('Failure line ordering', () => {
    it('should have Soderberg line below Goodman line at positive σm', () => {
      const result = generateHaighDiagramData(MATERIAL, [], 'VON');

      // At σm = 100:
      const soderbergPt = findPointNearMean(result.soderbergLine, 100);
      const goodmanPt = findPointNearMean(result.goodmanLine, 100);

      if (soderbergPt && goodmanPt) {
        expect(soderbergPt.alternating).toBeLessThan(goodmanPt.alternating + 1);
      }
    });

    it('should have Goodman line below Gerber parabola at positive σm', () => {
      const result = generateHaighDiagramData(MATERIAL, [], 'VON');

      // At σm = 200:
      const goodmanPt = findPointNearMean(result.goodmanLine, 200);
      const gerberPt = findPointNearMean(result.gerberLine, 200);

      if (goodmanPt && gerberPt) {
        expect(goodmanPt.alternating).toBeLessThan(gerberPt.alternating + 1);
      }
    });
  });
});
