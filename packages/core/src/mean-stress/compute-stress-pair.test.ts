/**
 * Unit tests for computeStressPair.
 *
 * Validates the mean and alternating stress computation from two FEM load cases.
 * Formulas: σm = (σ_base + σ_load) / 2,  σa = |σ_load − σ_base| / 2
 *
 * @module mean-stress/compute-stress-pair.test
 */

import { describe, it, expect } from 'vitest';

import { computeStressPair } from './compute-stress-pair';

describe('computeStressPair', () => {
  it('should return correct mean and alternating for symmetric case (base=100, load=200)', () => {
    // σm = (100 + 200) / 2 = 150,  σa = |200 − 100| / 2 = 50
    const result = computeStressPair(100, 200);

    expect(result.mean).toBeCloseTo(150, 2);
    expect(result.alternating).toBeCloseTo(50, 2);
  });

  it('should return mean=50 and alternating=50 when base=0, load=100', () => {
    // σm = (0 + 100) / 2 = 50,  σa = |100 − 0| / 2 = 50
    const result = computeStressPair(0, 100);

    expect(result.mean).toBeCloseTo(50, 2);
    expect(result.alternating).toBeCloseTo(50, 2);
  });

  it('should return alternating=0 when base and load are equal (base=100, load=100)', () => {
    // σm = (100 + 100) / 2 = 100,  σa = |100 − 100| / 2 = 0
    const result = computeStressPair(100, 100);

    expect(result.mean).toBeCloseTo(100, 2);
    expect(result.alternating).toBeCloseTo(0, 2);
  });

  it('should return mean=0 and alternating=50 for symmetric loading (base=-50, load=50)', () => {
    // σm = (-50 + 50) / 2 = 0,  σa = |50 − (−50)| / 2 = 50
    const result = computeStressPair(-50, 50);

    expect(result.mean).toBeCloseTo(0, 2);
    expect(result.alternating).toBeCloseTo(50, 2);
  });

  it('should always return positive alternating when load < base (base=200, load=100)', () => {
    // σm = (200 + 100) / 2 = 150,  σa = |100 − 200| / 2 = 50
    const result = computeStressPair(200, 100);

    expect(result.mean).toBeCloseTo(150, 2);
    expect(result.alternating).toBeCloseTo(50, 2);
    expect(result.alternating).toBeGreaterThanOrEqual(0);
  });

  it('should handle large stress values (base=1e6, load=2e6)', () => {
    // σm = (1e6 + 2e6) / 2 = 1.5e6,  σa = |2e6 − 1e6| / 2 = 5e5
    const result = computeStressPair(1e6, 2e6);

    expect(result.mean).toBeCloseTo(1.5e6, 0);
    expect(result.alternating).toBeCloseTo(5e5, 0);
  });

  it('should handle negative compressive stresses (base=-100, load=-200)', () => {
    // σm = (-100 + (-200)) / 2 = -150,  σa = |−200 − (−100)| / 2 = 50
    const result = computeStressPair(-100, -200);

    expect(result.mean).toBeCloseTo(-150, 2);
    expect(result.alternating).toBeCloseTo(50, 2);
  });

  it('should return zero mean when base = -load', () => {
    // σm = (-200 + 200) / 2 = 0,  σa = |200 − (−200)| / 2 = 200
    const result = computeStressPair(-200, 200);

    expect(result.mean).toBeCloseTo(0, 2);
    expect(result.alternating).toBeCloseTo(200, 2);
  });
});
