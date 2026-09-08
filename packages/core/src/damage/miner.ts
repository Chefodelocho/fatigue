import type { DamageEntry, DamageResult, DamageRatio, Result, SNCurve, StressRange, Cycles } from '@fatigue/types';
import {
  ok,
  err,
  createDamageRatio,
  createDimensionless,
  createStressRange,
  createCycles,
} from '@fatigue/types';

import { evaluateCyclesToFailure } from '../sn-curve/evaluate';
import type { EvaluateSNCurveOptions } from '../sn-curve/evaluate';

/**
 * One block in a cycle spectrum.
 */
interface SpectrumEntry {
  readonly stressRange: StressRange;
  readonly cycles: Cycles;
}

/**
 * Options for Miner's damage accumulation.
 */
interface MinerDamageOptions extends EvaluateSNCurveOptions {
  /**
   * Critical damage threshold for utilization (defaults to 1.0).
   */
  readonly criticalDamage?: DamageRatio;

  /**
   * Reporting-only safety factor stored in the result.
   */
  readonly reportedSafetyFactor?: number;
}

/**
 * Compute cumulative damage using Palmgren-Miner linear damage rule.
 */
export function computeMinerDamage(
  curve: SNCurve,
  spectrum: readonly SpectrumEntry[],
  options: MinerDamageOptions = {},
): Result<DamageResult, string> {
  const { criticalDamage = createDamageRatio(1), reportedSafetyFactor = 1, ...snOptions } = options;

  if (criticalDamage <= 0) {
    return err('Critical damage must be positive');
  }

  if (reportedSafetyFactor <= 0) {
    return err('Reported safety factor must be positive');
  }

  const entries: DamageEntry[] = [];
  let totalDamage = 0;

  for (const item of spectrum) {
    if (item.stressRange <= 0) {
      return err('Stress range in spectrum must be positive');
    }

    if (item.cycles < 0) {
      return err('Cycles in spectrum must be non-negative');
    }

    const cyclesResult = evaluateCyclesToFailure(curve, item.stressRange, snOptions);
    if (!cyclesResult.ok) {
      return err(cyclesResult.error);
    }

    const failureCycles = cyclesResult.value;
    const damage = Number.isFinite(failureCycles) ? item.cycles / failureCycles : 0;

    totalDamage += damage;

    entries.push({
      stressRange: createStressRange(item.stressRange),
      appliedCycles: createCycles(item.cycles),
      failureCycles: createCycles(failureCycles),
      damage: createDamageRatio(damage),
    });
  }

  const utilization = totalDamage / criticalDamage;

  return ok({
    totalDamage: createDamageRatio(totalDamage),
    utilization: createDimensionless(utilization),
    entries,
    curve,
    safetyFactor: createDimensionless(reportedSafetyFactor),
    criticalDamage,
  });
}

export type { SpectrumEntry, MinerDamageOptions };
