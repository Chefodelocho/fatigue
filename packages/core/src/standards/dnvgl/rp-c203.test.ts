import { describe, it, expect } from 'vitest';

import { createDNVGLCurve, getDNVGLFatClasses } from './rp-c203';

describe('DNVGL-RP-C203 curve factory', () => {
  it('creates air curve for supported FAT class', () => {
    const result = createDNVGLCurve(80);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.standard).toBe('DNVGL-RP-C203');
      expect(result.value.environment).toBe('air');
    }
  });

  it('creates seawater-cp curve with thickness metadata', () => {
    const result = createDNVGLCurve(90, {
      environment: 'seawater-cp',
      thicknessCorrection: {
        referenceThickness: 25,
        exponent: 0.15,
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.environment).toBe('seawater-cp');
      expect(result.value.thicknessCorrection?.referenceThickness).toBe(25);
    }
  });

  it('rejects unsupported FAT class', () => {
    const result = createDNVGLCurve(77);

    expect(result.ok).toBe(false);
  });

  it('exposes non-empty class list', () => {
    expect(getDNVGLFatClasses().length).toBeGreaterThan(0);
  });
});
