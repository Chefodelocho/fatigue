import { describe, it, expect } from 'vitest';

import { createIIWCurve, getIIWFatClasses } from './recommendations';

describe('IIW curve factory', () => {
  it('creates a valid curve for supported FAT class', () => {
    const result = createIIWCurve(90);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.standard).toBe('IIW');
      expect(result.value.detailCategory).toBe(90);
      expect(result.value.fatigueLimit).toBeLessThan(result.value.detailCategory);
      expect(result.value.cutOffLimit).toBeLessThan(result.value.fatigueLimit);
    }
  });

  it('returns error for unsupported FAT class', () => {
    const result = createIIWCurve(77);

    expect(result.ok).toBe(false);
  });

  it('exposes non-empty baseline classes', () => {
    expect(getIIWFatClasses().length).toBeGreaterThan(0);
  });
});
