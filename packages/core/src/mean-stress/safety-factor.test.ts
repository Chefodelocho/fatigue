/**
 * Unit tests for computeSafetyFactors.
 *
 * Validates the combined safety factor computation that returns Goodman,
 * Gerber, and Soderberg safety factors simultaneously, along with the
 * governing minimum SF.
 *
 * Material: σu = 500 MPa, σy = 350 MPa, σe = 250 MPa
 *
 * @module mean-stress/safety-factor.test
 */

import { describe, it, expect } from 'vitest';

import type { FEMMaterialProperties } from '@fatigue/types';

import { computeSafetyFactors } from './safety-factor';

/** Standard test material: σu=500, σy=350, σe=250 MPa */
const MATERIAL: FEMMaterialProperties = {
  ultimateStrength: 500,
  yieldStrength: 350,
  enduranceLimit: 250,
};

/** Relative tolerance for safety factor comparisons: |expected − actual| / |expected| < 1e-4 */
const SF_RELATIVE_TOLERANCE = 1e-4;

describe('computeSafetyFactors', () => {
  // -- Returns all three SFs -----------------------------------------------

  it('should return all three safety factors for a given operating point', () => {
    const result = computeSafetyFactors(1, 'VON', 100, 200, MATERIAL);

    expect(result).toHaveProperty('goodmanSF');
    expect(result).toHaveProperty('gerberSF');
    expect(result).toHaveProperty('soderbergSF');
    expect(result).toHaveProperty('minSF');
    expect(result).toHaveProperty('nodeId');
    expect(result).toHaveProperty('stressComponent');
    expect(result).toHaveProperty('meanStress');
    expect(result).toHaveProperty('alternatingStress');
  });

  // -- Correct node ID and stress component --------------------------------

  it('should preserve nodeId and stressComponent in the result', () => {
    const result = computeSafetyFactors(42, 'P1', 100, 200, MATERIAL);

    expect(result.nodeId).toBe(42);
    expect(result.stressComponent).toBe('P1');
    expect(result.meanStress).toBe(200);
    expect(result.alternatingStress).toBe(100);
  });

  // -- Known analytical values (σa=100, σm=200) ----------------------------

  it('should compute correct Goodman SF for σa=100, σm=200', () => {
    const result = computeSafetyFactors(1, 'VON', 100, 200, MATERIAL);

    // Goodman: SF = 1 / (100/250 + 200/500) = 1 / 0.8 = 1.25
    const expected = 1 / 0.8;
    expect(Math.abs(expected - result.goodmanSF) / expected).toBeLessThan(SF_RELATIVE_TOLERANCE);
  });

  it('should compute correct Gerber SF for σa=100, σm=200', () => {
    const result = computeSafetyFactors(1, 'VON', 100, 200, MATERIAL);

    // Gerber: R=0.4, S=0.4, R²=0.16, disc=0.16+0.64=0.8
    // SF = (-0.4 + √0.8) / 0.32 ≈ 1.545
    const expected = (-0.4 + Math.sqrt(0.8)) / 0.32;
    expect(Math.abs(expected - result.gerberSF) / expected).toBeLessThan(SF_RELATIVE_TOLERANCE);
  });

  it('should compute correct Soderberg SF for σa=100, σm=200', () => {
    const result = computeSafetyFactors(1, 'VON', 100, 200, MATERIAL);

    // Soderberg: SF = 1 / (100/250 + 200/350) ≈ 1.0294
    const expected = 1 / (100 / 250 + 200 / 350);
    expect(Math.abs(expected - result.soderbergSF) / expected).toBeLessThan(SF_RELATIVE_TOLERANCE);
  });

  // -- minSF is the minimum of the three -----------------------------------

  it('should set minSF to the minimum of the three safety factors', () => {
    const result = computeSafetyFactors(1, 'VON', 100, 200, MATERIAL);

    const allSFs = [result.goodmanSF, result.gerberSF, result.soderbergSF];
    const expectedMin = Math.min(...allSFs);

    expect(result.minSF).toBeCloseTo(expectedMin, 10);
  });

  // -- Ordering: Soderberg ≤ Goodman ≤ Gerber for tensile σm > 0 ----------

  it('should satisfy SF_soderberg ≤ SF_goodman ≤ SF_gerber for tensile σm', () => {
    const result = computeSafetyFactors(1, 'VON', 100, 200, MATERIAL);

    expect(result.soderbergSF).toBeLessThanOrEqual(result.goodmanSF + 1e-10);
    expect(result.goodmanSF).toBeLessThanOrEqual(result.gerberSF + 1e-10);
  });

  // -- For σa=100, σm=200, Soderberg should govern (lowest SF) -------------

  it('should have Soderberg as the governing criterion when σm is high relative to σy', () => {
    const result = computeSafetyFactors(1, 'VON', 100, 200, MATERIAL);

    // Soderberg uses σy=350, so it's most conservative for this tensile case
    expect(result.minSF).toBeCloseTo(result.soderbergSF, 10);
  });

  // -- Pure alternating: all three should be equal -------------------------

  it('should give equal SFs for all three criteria when σm=0', () => {
    const result = computeSafetyFactors(1, 'VON', 100, 0, MATERIAL);

    // When σm=0, all reduce to SF = σe/σa = 2.5
    expect(result.goodmanSF).toBeCloseTo(2.5, 4);
    expect(result.gerberSF).toBeCloseTo(2.5, 4);
    expect(result.soderbergSF).toBeCloseTo(2.5, 4);
    expect(result.minSF).toBeCloseTo(2.5, 4);
  });

  // -- Failure regime: all SFs < 1 ----------------------------------------

  it('should report all SFs < 1 when operating point exceeds failure lines', () => {
    // σa=200, σm=400 — well beyond all failure boundaries
    const result = computeSafetyFactors(1, 'VON', 200, 400, MATERIAL);

    // Goodman: 1/(200/250 + 400/500) = 1/(0.8 + 0.8) = 0.625
    // Gerber: > Goodman but also < 1 for high loads
    // Soderberg: σm=400 >= σy=350 → SF=0
    expect(result.goodmanSF).toBeLessThan(1.0);
    expect(result.soderbergSF).toBe(0); // σm >= σy
    expect(result.minSF).toBeLessThan(1.0);
  });

  // -- Different stress components -----------------------------------------

  it('should accept all four stress components (VON, P1, P2, P3)', () => {
    const components = ['VON', 'P1', 'P2', 'P3'] as const;

    for (const comp of components) {
      const result = computeSafetyFactors(1, comp, 100, 200, MATERIAL);
      expect(result.stressComponent).toBe(comp);
    }
  });
});
