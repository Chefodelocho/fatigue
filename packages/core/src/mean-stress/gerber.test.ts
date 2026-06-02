/**
 * Unit tests for gerberSafetyFactor.
 *
 * Validates the Gerber mean stress correction safety factor against
 * analytical solutions. The Gerber parabola:
 *   (σa/σe) + (σm/σu)² = 1
 * solved as: R²·SF² + S·SF − 1 = 0  where R = σm/σu, S = σa/σe
 *
 * Material: σu = 500 MPa, σy = 350 MPa, σe = 250 MPa
 *
 * @module mean-stress/gerber.test
 */

import { describe, it, expect } from 'vitest';

import type { FEMMaterialProperties } from '@fatigue/types';

import { gerberSafetyFactor } from './gerber';

/** Standard test material: σu=500, σy=350, σe=250 MPa */
const MATERIAL: FEMMaterialProperties = {
  ultimateStrength: 500,
  yieldStrength: 350,
  enduranceLimit: 250,
};

/** Relative tolerance for safety factor comparisons: |expected − actual| / |expected| < 1e-4 */
const SF_RELATIVE_TOLERANCE = 1e-4;

describe('gerberSafetyFactor', () => {
  // -- Pure alternating loading (σm = 0) ------------------------------------

  it('should return SF = σe/σa = 2.5 for pure alternating loading (σa=100, σm=0)', () => {
    // When R=0, the quadratic degenerates to SF = 1/S = σe/σa = 250/100 = 2.5
    const result = gerberSafetyFactor(100, 0, MATERIAL);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Math.abs(2.5 - result.value) / 2.5).toBeLessThan(SF_RELATIVE_TOLERANCE);
    }
  });

  // -- Pure mean loading (σa = 0) -------------------------------------------

  it('should return SF = σu/|σm| = 5.0 for pure static loading (σa=0, σm=100)', () => {
    // When σa=0, SF = σu/|σm| = 500/100 = 5.0
    const result = gerberSafetyFactor(0, 100, MATERIAL);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Math.abs(5.0 - result.value) / 5.0).toBeLessThan(SF_RELATIVE_TOLERANCE);
    }
  });

  it('should return Infinity when σa=0 and σm=0', () => {
    const result = gerberSafetyFactor(0, 0, MATERIAL);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(Infinity);
    }
  });

  // -- Symmetry: Gerber is symmetric about σm --------------------------------

  it('should give the same SF for σm=+100 and σm=-100 (Gerber is symmetric)', () => {
    // Gerber uses R² in the formula, so |σm| gives the same result
    const positive = gerberSafetyFactor(100, 100, MATERIAL);
    const negative = gerberSafetyFactor(100, -100, MATERIAL);

    expect(positive.ok).toBe(true);
    expect(negative.ok).toBe(true);
    if (positive.ok && negative.ok) {
      expect(Math.abs(positive.value - negative.value)).toBeLessThan(1e-10);
    }
  });

  // -- Known analytical solution --------------------------------------------

  it('should return SF ≈ 2.071 for σa=100, σm=100', () => {
    // R = 100/500 = 0.2, S = 100/250 = 0.4
    // R² = 0.04, discriminant = 0.16 + 0.16 = 0.32
    // SF = (-0.4 + √0.32) / (2·0.04) = (-0.4 + 0.565685) / 0.08 = 2.07107
    const expected = (-0.4 + Math.sqrt(0.32)) / 0.08;
    const result = gerberSafetyFactor(100, 100, MATERIAL);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Math.abs(expected - result.value) / expected).toBeLessThan(SF_RELATIVE_TOLERANCE);
    }
  });

  it('should return SF ≈ 1.236 for σa=125, σm=250', () => {
    // R = 250/500 = 0.5, S = 125/250 = 0.5
    // R² = 0.25, discriminant = 0.25 + 1.0 = 1.25
    // SF = (-0.5 + √1.25) / 0.5 = (-0.5 + 1.118034) / 0.5 = 1.23607
    const expected = (-0.5 + Math.sqrt(1.25)) / 0.5;
    const result = gerberSafetyFactor(125, 250, MATERIAL);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Math.abs(expected - result.value) / expected).toBeLessThan(SF_RELATIVE_TOLERANCE);
    }
  });

  // -- Gerber SF ≥ Goodman SF (less conservative) --------------------------

  it('should give SF ≥ Goodman SF for the same inputs (σa=100, σm=200)', () => {
    // Gerber is less conservative than Goodman for tensile mean stress
    // Goodman: SF = 1 / (100/250 + 200/500) = 1 / 0.8 = 1.25
    // Gerber: R=0.4, S=0.4, R²=0.16, disc=0.16+0.64=0.8
    //   SF = (-0.4 + √0.8) / 0.32 = 0.494427 / 0.32 = 1.54508
    const gerberResult = gerberSafetyFactor(100, 200, MATERIAL);

    // Goodman SF for same inputs
    const goodmanSF = 1 / (100 / 250 + 200 / 500);

    expect(gerberResult.ok).toBe(true);
    if (gerberResult.ok) {
      expect(gerberResult.value).toBeGreaterThanOrEqual(goodmanSF - 1e-10);
    }
  });

  // -- Validation: negative σa should error ---------------------------------

  it('should return error for negative σa', () => {
    const result = gerberSafetyFactor(-10, 100, MATERIAL);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('non-negative');
    }
  });

  // -- Validation: zero or negative material properties ----------------------

  it('should return error when ultimate strength is zero', () => {
    const badMaterial = { ultimateStrength: 0, yieldStrength: 350, enduranceLimit: 250 };
    const result = gerberSafetyFactor(100, 100, badMaterial);

    expect(result.ok).toBe(false);
  });

  it('should return error when endurance limit is zero', () => {
    const badMaterial = { ultimateStrength: 500, yieldStrength: 350, enduranceLimit: 0 };
    const result = gerberSafetyFactor(100, 100, badMaterial);

    expect(result.ok).toBe(false);
  });

  // -- Pure mean loading with negative σm (symmetric) -----------------------

  it('should return SF = σu/|σm| for pure static compressive loading (σa=0, σm=-100)', () => {
    // SF = 500 / |-100| = 5.0 (same as tensile due to symmetry)
    const result = gerberSafetyFactor(0, -100, MATERIAL);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Math.abs(5.0 - result.value) / 5.0).toBeLessThan(SF_RELATIVE_TOLERANCE);
    }
  });
});
