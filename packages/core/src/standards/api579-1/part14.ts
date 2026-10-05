import type { Result } from '@fatigue/types';
import { ok, err } from '@fatigue/types';

interface API579Level1Input {
  /** Equivalent stress range in MPa from the loading histogram. */
  readonly stressRange: number;

  /** Expected operating cycles over the assessment interval. */
  readonly cycles: number;

  /** Allowable cycles at the same stress range from approved fatigue data. */
  readonly allowableCycles: number;

  /** Optional screening limit for utilization ratio (default 1.0). */
  readonly limit?: number;
}

interface API579Level1Result {
  readonly usageFactor: number;
  readonly limit: number;
  readonly acceptable: boolean;
}

interface ParisCrackGrowthInput {
  /** Paris-law coefficient C (units depend on DeltaK convention). */
  readonly c: number;

  /** Paris-law exponent m. */
  readonly m: number;

  /** Stress intensity factor range DeltaK in MPa*sqrt(m). */
  readonly deltaK: number;

  /** Initial crack size in mm. */
  readonly initialCrackSizeMm: number;

  /** Final crack size in mm. */
  readonly finalCrackSizeMm: number;

  /** Optional number of integration steps (default 200). */
  readonly integrationSteps?: number;
}

/**
 * API 579-1 Part 14 Level-1 style fatigue screening.
 *
 * Phase-1 implementation provides a deterministic usage-factor check that can
 * be used while full FFS detail procedures are incrementally added.
 */
export function api579Level1Screening(
  input: API579Level1Input,
): Result<API579Level1Result, string> {
  const { stressRange, cycles, allowableCycles, limit = 1 } = input;

  if (stressRange <= 0) {
    return err('Stress range must be positive');
  }

  if (cycles < 0) {
    return err('Cycles must be non-negative');
  }

  if (allowableCycles <= 0) {
    return err('Allowable cycles must be positive');
  }

  if (limit <= 0) {
    return err('Limit must be positive');
  }

  const usageFactor = cycles / allowableCycles;

  return ok({
    usageFactor,
    limit,
    acceptable: usageFactor <= limit,
  });
}

/**
 * Estimate cycles to grow a crack from a0 to af using a constant DeltaK
 * Paris-law approximation.
 */
export function estimateParisLawCycles(input: ParisCrackGrowthInput): Result<number, string> {
  const { c, m, deltaK, initialCrackSizeMm, finalCrackSizeMm, integrationSteps = 200 } = input;

  if (c <= 0) {
    return err('Paris-law coefficient C must be positive');
  }

  if (m <= 0) {
    return err('Paris-law exponent m must be positive');
  }

  if (deltaK <= 0) {
    return err('DeltaK must be positive');
  }

  if (initialCrackSizeMm <= 0 || finalCrackSizeMm <= 0) {
    return err('Crack sizes must be positive');
  }

  if (finalCrackSizeMm <= initialCrackSizeMm) {
    return err('Final crack size must be greater than initial crack size');
  }

  if (integrationSteps < 10) {
    return err('Integration steps must be >= 10');
  }

  const da = (finalCrackSizeMm - initialCrackSizeMm) / integrationSteps;
  let totalCycles = 0;

  for (let i = 0; i < integrationSteps; i += 1) {
    const crackSize = initialCrackSizeMm + da * i;
    const growthPerCycle = c * Math.pow(deltaK, m);

    if (growthPerCycle <= 0) {
      return err('Invalid crack growth rate computed from Paris-law inputs');
    }

    totalCycles += da / growthPerCycle;

    if (!Number.isFinite(totalCycles)) {
      return err('Computed crack growth cycles are not finite');
    }

    if (crackSize > finalCrackSizeMm) {
      break;
    }
  }

  return ok(totalCycles);
}

export type { API579Level1Input, API579Level1Result, ParisCrackGrowthInput };
