import type { SNCurve, Result } from '@fatigue/types';
import {
  ok,
  err,
  createCycles,
  createDimensionless,
  createMPa,
  createStressRange,
} from '@fatigue/types';

interface BuildCurveInput {
  readonly standard: string;
  readonly id: string;
  readonly name: string;
  readonly detailCategory: number;
  readonly m?: number;
  readonly referenceCycles?: number;
  readonly fatigueLimitCycles?: number;
  readonly cutOffCycles?: number;
  readonly environment?: 'air' | 'seawater' | 'seawater-cp';
  readonly thicknessCorrection?: {
    readonly referenceThickness: number;
    readonly exponent: number;
  };
}

/**
 * Build a two-slope welded-joint style S-N curve.
 */
export function buildTwoSlopeSNCurve(input: BuildCurveInput): Result<SNCurve, string> {
  const {
    standard,
    id,
    name,
    detailCategory,
    m = 3,
    referenceCycles = 2e6,
    fatigueLimitCycles = 5e6,
    cutOffCycles = 1e8,
    environment,
    thicknessCorrection,
  } = input;

  if (detailCategory <= 0) {
    return err('Detail category must be positive');
  }

  if (m <= 0) {
    return err('Primary slope m must be positive');
  }

  if (referenceCycles <= 0 || fatigueLimitCycles <= 0 || cutOffCycles <= 0) {
    return err('Cycle landmarks must be positive');
  }

  if (fatigueLimitCycles < referenceCycles) {
    return err('Fatigue limit cycles must be >= reference cycles');
  }

  if (cutOffCycles < fatigueLimitCycles) {
    return err('Cut-off cycles must be >= fatigue limit cycles');
  }

  if (thicknessCorrection !== undefined) {
    if (thicknessCorrection.referenceThickness <= 0) {
      return err('Thickness correction reference thickness must be positive');
    }

    if (thicknessCorrection.exponent < 0) {
      return err('Thickness correction exponent must be non-negative');
    }
  }

  const fatigueLimit = detailCategory * Math.pow(referenceCycles / fatigueLimitCycles, 1 / m);
  const cutOffLimit = fatigueLimit * Math.pow(fatigueLimitCycles / cutOffCycles, 1 / 5);
  const logA = Math.log10(referenceCycles) + m * Math.log10(detailCategory);

  const curve: SNCurve = {
    id,
    name,
    m: createDimensionless(m),
    logA: createDimensionless(logA),
    detailCategory: createMPa(detailCategory),
    fatigueLimit: createStressRange(fatigueLimit),
    cutOffLimit: createStressRange(cutOffLimit),
    referenceCycles: createCycles(referenceCycles),
    standard,
    ...(environment !== undefined ? { environment } : {}),
    ...(thicknessCorrection !== undefined ? { thicknessCorrection } : {}),
  };

  return ok(curve);
}

interface LookupInput {
  readonly label: string;
  readonly value: number;
  readonly supported: readonly number[];
}

/**
 * Validate a numeric detail class against a supported set.
 */
export function assertSupportedNumericClass(input: LookupInput): Result<number, string> {
  const { label, value, supported } = input;
  if (!supported.includes(value)) {
    return err(`Unsupported ${label}: ${value}`);
  }

  return ok(value);
}

export type { BuildCurveInput };
