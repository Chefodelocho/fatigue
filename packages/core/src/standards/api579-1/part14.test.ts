import { describe, it, expect } from 'vitest';

import { api579Level1Screening, estimateParisLawCycles } from './part14';

describe('API 579-1 Part 14 phase-1 utilities', () => {
  it('passes level-1 screening when usage is below limit', () => {
    const result = api579Level1Screening({
      stressRange: 80,
      cycles: 5e5,
      allowableCycles: 2e6,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.acceptable).toBe(true);
      expect(result.value.usageFactor).toBeCloseTo(0.25);
    }
  });

  it('fails level-1 screening when usage exceeds limit', () => {
    const result = api579Level1Screening({
      stressRange: 80,
      cycles: 3e6,
      allowableCycles: 2e6,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.acceptable).toBe(false);
    }
  });

  it('estimates positive crack growth cycles with paris-law approximation', () => {
    const result = estimateParisLawCycles({
      c: 1e-11,
      m: 3,
      deltaK: 10,
      initialCrackSizeMm: 1,
      finalCrackSizeMm: 10,
      integrationSteps: 200,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBeGreaterThan(0);
      expect(Number.isFinite(result.value)).toBe(true);
    }
  });

  it('rejects invalid crack sizes', () => {
    const result = estimateParisLawCycles({
      c: 1e-11,
      m: 3,
      deltaK: 10,
      initialCrackSizeMm: 10,
      finalCrackSizeMm: 5,
    });

    expect(result.ok).toBe(false);
  });
});
