import { describe, it, expect } from 'vitest';

import { createCycles, createDimensionless, createMPa, createStressRange } from '@fatigue/types';
import type { SNCurve } from '@fatigue/types';

import { computeMinerDamage } from './miner';

const CURVE: SNCurve = {
  id: 'test-damage-curve',
  name: 'Test damage curve',
  m: createDimensionless(3),
  logA: createDimensionless(Math.log10(2e6) + 3 * Math.log10(100)),
  detailCategory: createMPa(100),
  fatigueLimit: createStressRange(74),
  cutOffLimit: createStressRange(40),
  referenceCycles: createCycles(2e6),
  standard: 'TEST',
};

describe('computeMinerDamage', () => {
  it('computes linear cumulative damage', () => {
    const result = computeMinerDamage(CURVE, [
      { stressRange: createStressRange(100), cycles: createCycles(1e6) },
      { stressRange: createStressRange(80), cycles: createCycles(1e6) },
    ]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.totalDamage).toBeGreaterThan(0);
      expect(result.value.entries).toHaveLength(2);
    }
  });

  it('treats cycles below cut-off as zero damage contribution', () => {
    const result = computeMinerDamage(CURVE, [
      { stressRange: createStressRange(35), cycles: createCycles(5e6) },
    ]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.totalDamage).toBe(0);
      expect(result.value.entries[0]?.damage).toBe(0);
    }
  });

  it('returns error for invalid spectrum entry', () => {
    const result = computeMinerDamage(CURVE, [
      { stressRange: createStressRange(90), cycles: createCycles(-100) },
    ]);

    expect(result.ok).toBe(false);
  });
});
