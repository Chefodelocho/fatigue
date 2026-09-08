import type { Result, SNCurve, StressRange, Cycles } from '@fatigue/types';
import { ok, err, createCycles } from '@fatigue/types';

/**
 * Options for S-N curve evaluation.
 */
interface EvaluateSNCurveOptions {
  /**
   * Partial safety factor applied to stress range (>= 1.0).
   *
   * A value > 1.0 increases design stress and therefore reduces fatigue life.
   */
  readonly safetyFactor?: number;

  /**
   * Plate thickness in mm for optional thickness correction.
   */
  readonly thicknessMm?: number;
}

/**
 * Evaluate cycles to failure for a stress range using a two-slope S-N model.
 *
 * High-stress branch uses curve.m and curve.logA.
 * Below the fatigue limit, the implementation uses a continuation slope m = 5
 * until cut-off, matching common welded-joint practice.
 */
export function evaluateCyclesToFailure(
  curve: SNCurve,
  stressRange: StressRange,
  options: EvaluateSNCurveOptions = {},
): Result<Cycles, string> {
  const { safetyFactor = 1, thicknessMm } = options;

  if (safetyFactor < 1) {
    return err('Safety factor must be >= 1.0');
  }

  if (stressRange <= 0) {
    return err('Stress range must be positive');
  }

  if (thicknessMm !== undefined && thicknessMm <= 0) {
    return err('Thickness must be positive when provided');
  }

  const correctedStressRange = applyCorrections(curve, stressRange, safetyFactor, thicknessMm);

  if (correctedStressRange < curve.cutOffLimit) {
    return ok(createCycles(Infinity));
  }

  if (correctedStressRange >= curve.fatigueLimit) {
    const cycles = cyclesOnPrimarySlope(curve, correctedStressRange);
    return ok(createCycles(cycles));
  }

  const cyclesAtFatigueLimit = cyclesOnPrimarySlope(curve, curve.fatigueLimit);
  const cycles = cyclesAtFatigueLimit * Math.pow(curve.fatigueLimit / correctedStressRange, 5);

  return ok(createCycles(cycles));
}

function applyCorrections(
  curve: SNCurve,
  stressRange: StressRange,
  safetyFactor: number,
  thicknessMm?: number,
): number {
  let corrected = stressRange * safetyFactor;

  if (
    thicknessMm !== undefined &&
    curve.thicknessCorrection !== undefined &&
    thicknessMm > curve.thicknessCorrection.referenceThickness
  ) {
    const { referenceThickness, exponent } = curve.thicknessCorrection;
    corrected *= Math.pow(thicknessMm / referenceThickness, exponent);
  }

  return corrected;
}

function cyclesOnPrimarySlope(curve: SNCurve, stressRange: number): number {
  const logN = curve.logA - curve.m * Math.log10(stressRange);
  return Math.pow(10, logN);
}

export type { EvaluateSNCurveOptions };
