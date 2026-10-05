import type { Result } from '@fatigue/types';
import { err, ok } from '@fatigue/types';

interface FkmPrototypeInput {
  readonly meanStress: number;
  readonly stressAmplitude: number;
  readonly ultimateStrength: number;
  readonly fatigueStrengthAtReferenceCycles: number;
  readonly targetCycles: number;
  readonly referenceCycles?: number;
  readonly snSlope?: number;
}

interface FkmPrototypeResult {
  readonly meanStressCorrectionFactor: number;
  readonly correctedStressAmplitude: number;
  readonly allowableStressAmplitude: number;
  readonly utilization: number;
  readonly acceptable: boolean;
}

/**
 * Exploratory FKM-inspired estimate. This intentionally does not implement
 * the FKM guideline and must not be used as a standards-compliant assessment.
 * It applies a Goodman mean-stress correction to a single-slope S-N estimate.
 */
export function evaluateFkmPrototype(input: FkmPrototypeInput): Result<FkmPrototypeResult, string> {
  const {
    meanStress,
    stressAmplitude,
    ultimateStrength,
    fatigueStrengthAtReferenceCycles,
    targetCycles,
    referenceCycles = 1_000_000,
    snSlope = 5,
  } = input;

  if (!Number.isFinite(meanStress)) {
    return err('Mean stress must be finite');
  }

  if (!Number.isFinite(stressAmplitude) || stressAmplitude < 0) {
    return err('Stress amplitude must be finite and non-negative');
  }

  if (!Number.isFinite(ultimateStrength) || ultimateStrength <= 0) {
    return err('Ultimate strength must be finite and positive');
  }

  if (!Number.isFinite(fatigueStrengthAtReferenceCycles) || fatigueStrengthAtReferenceCycles <= 0) {
    return err('Fatigue strength at reference cycles must be finite and positive');
  }

  if (!Number.isFinite(targetCycles) || targetCycles <= 0) {
    return err('Target cycles must be finite and positive');
  }

  if (!Number.isFinite(referenceCycles) || referenceCycles <= 0) {
    return err('Reference cycles must be finite and positive');
  }

  if (!Number.isFinite(snSlope) || snSlope <= 0) {
    return err('S-N slope must be finite and positive');
  }

  const meanStressCorrectionFactor = 1 - meanStress / ultimateStrength;
  if (meanStressCorrectionFactor <= 0) {
    return err('Mean stress must be below ultimate strength');
  }

  const correctedStressAmplitude = stressAmplitude / meanStressCorrectionFactor;
  const allowableStressAmplitude =
    fatigueStrengthAtReferenceCycles * Math.pow(referenceCycles / targetCycles, 1 / snSlope);
  const utilization = correctedStressAmplitude / allowableStressAmplitude;

  return ok({
    meanStressCorrectionFactor,
    correctedStressAmplitude,
    allowableStressAmplitude,
    utilization,
    acceptable: utilization <= 1,
  });
}

export type { FkmPrototypeInput, FkmPrototypeResult };
