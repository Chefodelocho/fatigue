import { describe, it, expect } from 'vitest';

import { assertSupportedNumericClass, buildTwoSlopeSNCurve } from './sn-curve-factory';

describe('buildTwoSlopeSNCurve', () => {
  it('creates a valid curve with expected landmarks', () => {
    const result = buildTwoSlopeSNCurve({
      standard: 'TEST',
      id: 'test-fat-80',
      name: 'Test FAT 80',
      detailCategory: 80,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.detailCategory).toBe(80);
      expect(result.value.fatigueLimit).toBeLessThan(80);
      expect(result.value.cutOffLimit).toBeLessThan(result.value.fatigueLimit);
    }
  });

  it('returns error for invalid cycles ordering', () => {
    const result = buildTwoSlopeSNCurve({
      standard: 'TEST',
      id: 'invalid',
      name: 'Invalid',
      detailCategory: 80,
      referenceCycles: 5e6,
      fatigueLimitCycles: 2e6,
    });

    expect(result.ok).toBe(false);
  });
});

describe('assertSupportedNumericClass', () => {
  it('accepts supported class', () => {
    const result = assertSupportedNumericClass({ label: 'class', value: 80, supported: [71, 80, 90] });

    expect(result.ok).toBe(true);
  });

  it('rejects unsupported class', () => {
    const result = assertSupportedNumericClass({ label: 'class', value: 77, supported: [71, 80, 90] });

    expect(result.ok).toBe(false);
  });
});
