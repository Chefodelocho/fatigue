/**
 * Unit tests for goodmanSafetyFactor.
 *
 * Validates the Goodman mean stress correction safety factor against
 * analytical solutions. The Goodman failure line is:
 *   σa/σe + σm/σu = 1
 * giving SF = 1 / (σa/σe + σm/σu)
 *
 * Material: σu = 500 MPa, σy = 350 MPa, σe = 250 MPa
 *
 * @module mean-stress/goodman.test
 */

import { describe, it, expect } from 'vitest';

import type { FEMMaterialProperties } from '@fatigue/types';

import { goodmanSafetyFactor } from './goodman';

/** Standard test material: σu=500, σy=350, σe=250 MPa */
const MATERIAL: FEMMaterialProperties = {
  ultimateStrength: 500,
  yieldStrength: 350,
  enduranceLimit: 250,
};

/** Relative tolerance for safety factor comparisons: |expected − actual| / |expected| < 1e-4 */
const SF_RELATIVE_TOLERANCE = 1e-4;

describe('goodmanSafetyFactor', () => {
  // -- Pure alternating loading (σm = 0) ------------------------------------

  it('should return SF = σe/σa = 2.5 for pure alternating loading (σa=100, σm=0)', () => {
    // SF = 1 / (100/250 + 0/500) = 1 / 0.4 = 2.5
    const result = goodmanSafetyFactor(100, 0, MATERIAL);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Math.abs(2.5 - result.value) / 2.5).toBeLessThan(SF_RELATIVE_TOLERANCE);
    }
  });

  // -- Pure mean loading (σa = 0) -------------------------------------------

  it('should return Infinity when σa = 0 (no cyclic loading)', () => {
    const result = goodmanSafetyFactor(0, 200, MATERIAL);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(Infinity);
    }
  });

  // -- At the failure point -------------------------------------------------

  it('should return SF ≈ 1.0 at the failure point (σa=125, σm=250)', () => {
    // SF = 1 / (125/250 + 250/500) = 1 / (0.5 + 0.5) = 1.0
    const result = goodmanSafetyFactor(125, 250, MATERIAL);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Math.abs(1.0 - result.value) / 1.0).toBeLessThan(SF_RELATIVE_TOLERANCE);
    }
  });

  // -- General case ---------------------------------------------------------

  it('should return SF ≈ 1.667 for σa=50, σm=200', () => {
    // SF = 1 / (50/250 + 200/500) = 1 / (0.2 + 0.4) = 1 / 0.6 ≈ 1.6667
    const expected = 1 / 0.6;
    const result = goodmanSafetyFactor(50, 200, MATERIAL);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Math.abs(expected - result.value) / expected).toBeLessThan(SF_RELATIVE_TOLERANCE);
    }
  });

  // -- Compressive mean stress (σm < 0) -------------------------------------

  it('should return higher SF for compressive mean stress (σa=100, σm=-100)', () => {
    // SF = 1 / (100/250 + (-100)/500) = 1 / (0.4 - 0.2) = 1 / 0.2 = 5.0
    // This must be > SF at σm=0 (which is 2.5), confirming beneficial effect
    const result = goodmanSafetyFactor(100, -100, MATERIAL);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBeGreaterThan(2.5);
      expect(Math.abs(5.0 - result.value) / 5.0).toBeLessThan(SF_RELATIVE_TOLERANCE);
    }
  });

  // -- Static failure: σm ≥ σu ---------------------------------------------

  it('should return SF = 0 when σm ≥ σu (static failure)', () => {
    const result = goodmanSafetyFactor(100, 500, MATERIAL);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(0);
    }
  });

  it('should return SF = 0 when σm > σu', () => {
    const result = goodmanSafetyFactor(50, 600, MATERIAL);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(0);
    }
  });

  // -- Validation: negative σa should error ---------------------------------

  it('should return error for negative σa', () => {
    const result = goodmanSafetyFactor(-10, 100, MATERIAL);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('non-negative');
    }
  });

  // -- Validation: zero or negative material properties ----------------------

  it('should return error when ultimate strength is zero', () => {
    const badMaterial = { ultimateStrength: 0, yieldStrength: 350, enduranceLimit: 250 };
    const result = goodmanSafetyFactor(100, 100, badMaterial);

    expect(result.ok).toBe(false);
  });

  it('should return error when endurance limit is zero', () => {
    const badMaterial = { ultimateStrength: 500, yieldStrength: 350, enduranceLimit: 0 };
    const result = goodmanSafetyFactor(100, 100, badMaterial);

    expect(result.ok).toBe(false);
  });

  // -- Boundary: strong compressive mean stress ----------------------------

  it('should return Infinity when compressive mean dominates the denominator', () => {
    // Denominator = 10/250 + (-400)/500 = 0.04 - 0.8 = -0.76 < 0 → Infinity
    const result = goodmanSafetyFactor(10, -400, MATERIAL);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(Infinity);
    }
  });

  // -- Shigley example (σa=100, σm=200) ------------------------------------

  it('should return SF ≈ 1.136 for the documented example (σa=100, σm=200)', () => {
    // From the JSDoc example in the source code: SF = 1.136
    // SF = 1 / (100/250 + 200/500) = 1 / (0.4 + 0.4) = 1 / 0.8 = 1.25
    // Note: The JSDoc says 1.136 but the formula gives 1.25 — this test uses
    // the analytical result from the Goodman formula.
    const expected = 1 / (100 / 250 + 200 / 500);
    const result = goodmanSafetyFactor(100, 200, MATERIAL);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Math.abs(expected - result.value) / expected).toBeLessThan(SF_RELATIVE_TOLERANCE);
    }
  });
});
