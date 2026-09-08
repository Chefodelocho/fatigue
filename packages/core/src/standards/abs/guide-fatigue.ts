import type { Result, SNCurve } from '@fatigue/types';
import { err } from '@fatigue/types';

import { assertSupportedNumericClass, buildTwoSlopeSNCurve } from '../common/sn-curve-factory';

const ABS_FAT_CLASSES = [40, 50, 63, 80, 100, 125, 160] as const;

type ABSEnvironment = 'air' | 'seawater' | 'seawater-cp';

interface ABSCurveOptions {
  readonly environment?: ABSEnvironment;
  readonly thicknessCorrection?: {
    readonly referenceThickness: number;
    readonly exponent: number;
  };
}

/**
 * Create an ABS Guide-style fatigue S-N curve from class.
 *
 * Phase-1 implementation focuses on deterministic class-based S-N curves for
 * time-domain damage workflows. Spectral fatigue methods are planned later.
 */
export function createABSCurve(
  fatClass: number,
  options: ABSCurveOptions = {},
): Result<SNCurve, string> {
  const supported = assertSupportedNumericClass({
    label: 'ABS fatigue class',
    value: fatClass,
    supported: ABS_FAT_CLASSES,
  });

  if (!supported.ok) {
    return err(supported.error);
  }

  const { environment = 'air', thicknessCorrection } = options;

  return buildTwoSlopeSNCurve({
    standard: 'ABS',
    id: `ABS-${environment}-FAT-${fatClass}`,
    name: `ABS ${environment} FAT ${fatClass}`,
    detailCategory: fatClass,
    environment,
    ...(thicknessCorrection !== undefined ? { thicknessCorrection } : {}),
  });
}

export function getABSFatClasses(): readonly number[] {
  return ABS_FAT_CLASSES;
}

export type { ABSEnvironment, ABSCurveOptions };
