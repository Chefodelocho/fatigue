import type { Result, SNCurve } from '@fatigue/types';
import { err } from '@fatigue/types';

import { assertSupportedNumericClass, buildTwoSlopeSNCurve } from '../common/sn-curve-factory';

const DNVGL_FAT_CLASSES = [36, 40, 45, 50, 56, 63, 71, 80, 90, 100, 112, 125, 140, 160] as const;

type DNVGLEnvironment = 'air' | 'seawater' | 'seawater-cp';

interface DNVGLCurveOptions {
  readonly environment?: DNVGLEnvironment;
  readonly thicknessCorrection?: {
    readonly referenceThickness: number;
    readonly exponent: number;
  };
}

/**
 * Create a DNVGL-RP-C203 S-N curve from FAT class.
 *
 * Phase-1 implementation: class-based curve creation with environment tagging
 * and optional thickness correction metadata.
 */
export function createDNVGLCurve(
  fatClass: number,
  options: DNVGLCurveOptions = {},
): Result<SNCurve, string> {
  const supported = assertSupportedNumericClass({
    label: 'DNVGL-RP-C203 FAT class',
    value: fatClass,
    supported: DNVGL_FAT_CLASSES,
  });

  if (!supported.ok) {
    return err(supported.error);
  }

  const { environment = 'air', thicknessCorrection } = options;

  return buildTwoSlopeSNCurve({
    standard: 'DNVGL-RP-C203',
    id: `DNVGL-${environment}-FAT-${fatClass}`,
    name: `DNVGL-RP-C203 ${environment} FAT ${fatClass}`,
    detailCategory: fatClass,
    environment,
    ...(thicknessCorrection !== undefined ? { thicknessCorrection } : {}),
  });
}

export function getDNVGLFatClasses(): readonly number[] {
  return DNVGL_FAT_CLASSES;
}

export type { DNVGLEnvironment, DNVGLCurveOptions };
