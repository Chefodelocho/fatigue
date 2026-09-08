import { describe, it, expect } from 'vitest';

import { createABSCurve, getABSFatClasses } from './guide-fatigue';

describe('ABS curve factory', () => {
  it('creates curve for supported class', () => {
    const result = createABSCurve(80);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.standard).toBe('ABS');
      expect(result.value.environment).toBe('air');
    }
  });

  it('supports seawater environment metadata', () => {
    const result = createABSCurve(100, { environment: 'seawater' });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.environment).toBe('seawater');
    }
  });

  it('rejects unsupported class', () => {
    const result = createABSCurve(77);

    expect(result.ok).toBe(false);
  });

  it('exposes non-empty class list', () => {
    expect(getABSFatClasses().length).toBeGreaterThan(0);
  });
});
