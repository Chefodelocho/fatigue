import { describe, expect, it } from 'vitest';

import { evaluateFkmPrototype } from './fatigue-prototype';

const referenceInput = {
  meanStress: 0,
  stressAmplitude: 100,
  ultimateStrength: 500,
  fatigueStrengthAtReferenceCycles: 250,
  targetCycles: 1_000_000,
};

describe('evaluateFkmPrototype', () => {
  it('computes utilization and accepts an amplitude below the allowable value', () => {
    const result = evaluateFkmPrototype(referenceInput);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.meanStressCorrectionFactor).toBeCloseTo(1);
    expect(result.value.correctedStressAmplitude).toBeCloseTo(100);
    expect(result.value.allowableStressAmplitude).toBeCloseTo(250);
    expect(result.value.utilization).toBeCloseTo(0.4);
    expect(result.value.acceptable).toBe(true);
  });

  it('applies the Goodman correction for tensile and compressive mean stress', () => {
    const tensileResult = evaluateFkmPrototype({ ...referenceInput, meanStress: 100 });
    const compressiveResult = evaluateFkmPrototype({ ...referenceInput, meanStress: -100 });

    expect(tensileResult.ok).toBe(true);
    expect(compressiveResult.ok).toBe(true);
    if (!tensileResult.ok || !compressiveResult.ok) return;

    expect(tensileResult.value.meanStressCorrectionFactor).toBeCloseTo(0.8);
    expect(tensileResult.value.correctedStressAmplitude).toBeCloseTo(125);
    expect(compressiveResult.value.meanStressCorrectionFactor).toBeCloseTo(1.2);
    expect(compressiveResult.value.correctedStressAmplitude).toBeCloseTo(100 / 1.2);
  });

  it('scales allowable amplitude with target cycles and reports non-acceptance', () => {
    const result = evaluateFkmPrototype({
      ...referenceInput,
      stressAmplitude: 150,
      targetCycles: 32_000_000,
      snSlope: 5,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.allowableStressAmplitude).toBeCloseTo(125);
    expect(result.value.utilization).toBeCloseTo(1.2);
    expect(result.value.acceptable).toBe(false);
  });

  it.each([
    ['non-finite mean stress', { meanStress: Number.NaN }, 'Mean stress must be finite'],
    [
      'negative amplitude',
      { stressAmplitude: -1 },
      'Stress amplitude must be finite and non-negative',
    ],
    [
      'zero ultimate strength',
      { ultimateStrength: 0 },
      'Ultimate strength must be finite and positive',
    ],
    [
      'zero reference fatigue strength',
      { fatigueStrengthAtReferenceCycles: 0 },
      'Fatigue strength at reference cycles must be finite and positive',
    ],
    ['zero target cycles', { targetCycles: 0 }, 'Target cycles must be finite and positive'],
    [
      'zero reference cycles',
      { referenceCycles: 0 },
      'Reference cycles must be finite and positive',
    ],
    ['zero S-N slope', { snSlope: 0 }, 'S-N slope must be finite and positive'],
    [
      'mean stress at ultimate strength',
      { meanStress: 500 },
      'Mean stress must be below ultimate strength',
    ],
  ])('rejects %s', (_caseName, overrides, expectedError) => {
    const result = evaluateFkmPrototype({ ...referenceInput, ...overrides });

    expect(result).toEqual({ ok: false, error: expectedError });
  });
});
