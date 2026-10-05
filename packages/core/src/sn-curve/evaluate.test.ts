import { describe, it, expect } from 'vitest';

import { createCycles, createDimensionless, createMPa, createStressRange } from '@fatigue/types';
import type { SNCurve } from '@fatigue/types';

import { evaluateCyclesToFailure } from './evaluate';

const CURVE: SNCurve = {
  id: 'test-curve',
  name: 'Test curve',
  m: createDimensionless(3),
  logA: createDimensionless(Math.log10(2e6) + 3 * Math.log10(100)),
  detailCategory: createMPa(100),
  fatigueLimit: createStressRange(74),
  cutOffLimit: createStressRange(40),
  referenceCycles: createCycles(2e6),
  standard: 'TEST',
};

describe('evaluateCyclesToFailure', () => {
  it('returns reference cycles at detail category stress range', () => {
    const result = evaluateCyclesToFailure(CURVE, createStressRange(100));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBeCloseTo(2e6, -2);
    }
  });

  it('returns infinity below cut-off limit', () => {
    const result = evaluateCyclesToFailure(CURVE, createStressRange(35));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(Infinity);
    }
  });

  it('reduces life when safety factor is applied', () => {
    const noFactor = evaluateCyclesToFailure(CURVE, createStressRange(90));
    const withFactor = evaluateCyclesToFailure(CURVE, createStressRange(90), {
      safetyFactor: 1.35,
    });

    expect(noFactor.ok).toBe(true);
    expect(withFactor.ok).toBe(true);

    if (noFactor.ok && withFactor.ok) {
      expect(withFactor.value).toBeLessThan(noFactor.value);
    }
  });

  it('applies thickness correction when above reference thickness', () => {
    const curveWithThickness: SNCurve = {
      ...CURVE,
      thicknessCorrection: {
        referenceThickness: 25,
        exponent: 0.2,
      },
    };

    const thinResult = evaluateCyclesToFailure(curveWithThickness, createStressRange(90), {
      thicknessMm: 25,
    });

    const thickResult = evaluateCyclesToFailure(curveWithThickness, createStressRange(90), {
      thicknessMm: 50,
    });

    expect(thinResult.ok).toBe(true);
    expect(thickResult.ok).toBe(true);

    if (thinResult.ok && thickResult.ok) {
      expect(thickResult.value).toBeLessThan(thinResult.value);
    }
  });

  it('returns error for invalid safety factor', () => {
    const result = evaluateCyclesToFailure(CURVE, createStressRange(90), { safetyFactor: 0.9 });

    expect(result.ok).toBe(false);
  });
});
