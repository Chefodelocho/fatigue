import { describe, it, expect } from 'vitest';

import { createEN1993Curve, getEN1993DetailCategories } from './en-1993-1-9';

describe('EN 1993-1-9 curve factory', () => {
  it('creates a valid curve for supported detail category', () => {
    const result = createEN1993Curve(80);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.standard).toBe('DIN EN 1993-1-9');
      expect(result.value.detailCategory).toBe(80);
      expect(result.value.fatigueLimit).toBeLessThan(result.value.detailCategory);
      expect(result.value.cutOffLimit).toBeLessThan(result.value.fatigueLimit);
    }
  });

  it('returns error for unsupported detail category', () => {
    const result = createEN1993Curve(77);

    expect(result.ok).toBe(false);
  });

  it('exposes non-empty baseline categories', () => {
    expect(getEN1993DetailCategories().length).toBeGreaterThan(0);
  });
});
