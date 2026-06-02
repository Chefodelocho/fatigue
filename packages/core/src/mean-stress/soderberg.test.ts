/**
 * Unit tests for soderbergSafetyFactor.
 *
 * Validates the Soderberg mean stress correction safety factor against
 * analytical solutions. The Soderberg failure line:
 *   σa/σe + σm/σy = 1
 * giving SF = 1 / (σa/σe + σm/σy)
 *
 * Material: σu = 500 MPa, σy = 350 MPa, σe = 250 MPa
 *
 * @module mean-stress/soderberg.test
 */

import { describe, it, expect } from 'vitest';

import type { FEMMaterialProperties } from '@fatigue/types';

import { soderbergSafetyFactor } from './soderberg';

/** Standard test material: σu=500, σy=350, σe=250 MPa */
const MATERIAL: FEMMaterialProperties = {
  ultimateStrength: 500,
  yieldStrength: 350,
  enduranceLimit: 250,
};

/** Relative tolerance for safety factor comparisons: |expected − actual| / |expected| < 1e-4 */
const SF_RELATIVE_TOLERANCE = 1e-4;

describe('soderbergSafetyFactor', () => {
  // -- Pure alternating loading (σm = 0) ------------------------------------

  it('should return SF = σe/σa = 2.5 for pure alternating loading (σa=100, σm=0)', () => {
    // SF = 1 / (100/250 + 0/350) = 1 / 0.4 = 2.5
    // Same as Goodman when σm = 0 (both reduce to σe/σa)
    const result = soderbergSafetyFactor(100, 0, MATERIAL);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Math.abs(2.5 - result.value) / 2.5).toBeLessThan(SF_RELATIVE_TOLERANCE);
    }
  });

  // -- Pure mean loading (σa = 0) -------------------------------------------

  it('should return Infinity when σa = 0 (no cyclic loading)', () => {
    const result = soderbergSafetyFactor(0, 200, MATERIAL);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(Infinity);
    }
  });

  // -- General case ---------------------------------------------------------

  it('should return SF ≈ 1.296 for σa=50, σm=200', () => {
    // SF = 1 / (50/250 + 200/350) = 1 / (0.2 + 0.57143) ≈ 1.2963
    const expected = 1 / (50 / 250 + 200 / 350);
    const result = soderbergSafetyFactor(50, 200, MATERIAL);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Math.abs(expected - result.value) / expected).toBeLessThan(SF_RELATIVE_TOLERANCE);
    }
  });

  // -- At or above yield (σm ≥ σy) -----------------------------------------

  it('should return SF = 0 when σm = σy (σa=125, σm=350)', () => {
    // At yield: σm >= σy → SF = 0
    const result = soderbergSafetyFactor(125, 350, MATERIAL);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(0);
    }
  });

  it('should return SF = 0 when σm > σy', () => {
    const result = soderbergSafetyFactor(50, 400, MATERIAL);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(0);
    }
  });

  // -- Just below yield: verify SF is < 1.0 --------------------------------

  it('should return SF < 1.0 when σm is just below σy (σa=125, σm=349)', () => {
    // SF = 1 / (125/250 + 349/350) = 1 / (0.5 + 0.99714) ≈ 0.668
    const result = soderbergSafetyFactor(125, 349, MATERIAL);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBeLessThan(1.0);
    }
  });

  // -- Soderberg is more conservative than Goodman (SF ≤ Goodman) ----------

  it('should give SF ≤ Goodman SF for tensile mean stress (σa=100, σm=200)', () => {
    // Soderberg uses σy=350, Goodman uses σu=500, so σy < σu → Soderberg SF < Goodman SF
    const soderbergResult = soderbergSafetyFactor(100, 200, MATERIAL);
    const goodmanSF = 1 / (100 / 250 + 200 / 500); // 1.25

    expect(soderbergResult.ok).toBe(true);
    if (soderbergResult.ok) {
      expect(soderbergResult.value).toBeLessThanOrEqual(goodmanSF + 1e-10);
    }
  });

  // -- Compressive mean stress (σm < 0) -------------------------------------

  it('should return higher SF for compressive mean stress (σa=100, σm=-100)', () => {
    // SF = 1 / (100/250 + (-100)/350) = 1 / (0.4 - 0.28571) = 1 / 0.11429 ≈ 8.75
    const expected = 1 / (100 / 250 + -100 / 350);
    const result = soderbergSafetyFactor(100, -100, MATERIAL);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBeGreaterThan(2.5); // Higher than pure alternating
      expect(Math.abs(expected - result.value) / expected).toBeLessThan(SF_RELATIVE_TOLERANCE);
    }
  });

  // -- Validation: negative σa should error ---------------------------------

  it('should return error for negative σa', () => {
    const result = soderbergSafetyFactor(-10, 100, MATERIAL);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('non-negative');
    }
  });

  // -- Validation: zero or negative material properties ----------------------

  it('should return error when yield strength is zero', () => {
    const badMaterial = { ultimateStrength: 500, yieldStrength: 0, enduranceLimit: 250 };
    const result = soderbergSafetyFactor(100, 100, badMaterial);

    expect(result.ok).toBe(false);
  });

  it('should return error when endurance limit is zero', () => {
    const badMaterial = { ultimateStrength: 500, yieldStrength: 350, enduranceLimit: 0 };
    const result = soderbergSafetyFactor(100, 100, badMaterial);

    expect(result.ok).toBe(false);
  });
});
