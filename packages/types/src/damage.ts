/**
 * Core domain interfaces for fatigue damage accumulation.
 *
 * @module damage
 */

import type { StressRange, Cycles, DamageRatio, Dimensionless } from './units';
import type { SNCurve } from './sn-curve';

/**
 * A single damage calculation entry: one stress range level and its contribution to total damage.
 */
interface DamageEntry {
  /** Stress range in MPa */
  readonly stressRange: StressRange;

  /** Number of applied cycles at this stress range */
  readonly appliedCycles: Cycles;

  /** Number of cycles to failure at this stress range (from S-N curve) */
  readonly failureCycles: Cycles;

  /** Damage contribution: ni / Ni */
  readonly damage: DamageRatio;
}

/**
 * Complete result of a cumulative fatigue damage analysis.
 */
interface DamageResult {
  /** Total cumulative damage ratio (D = Σ ni/Ni) */
  readonly totalDamage: DamageRatio;

  /** Fatigue life utilization factor (D / D_critical) */
  readonly utilization: Dimensionless;

  /** Individual damage entries per stress range level */
  readonly entries: readonly DamageEntry[];

  /** S-N curve used for the analysis */
  readonly curve: SNCurve;

  /** Safety factor applied */
  readonly safetyFactor: Dimensionless;

  /** Critical damage threshold (typically 1.0) */
  readonly criticalDamage: DamageRatio;
}

/**
 * Mean stress correction method to use before damage calculation.
 */
type MeanStressMethod = 'goodman' | 'gerber' | 'soderberg' | 'morrow' | 'none';

/**
 * Material properties needed for mean stress correction.
 */
interface MaterialProperties {
  /** Ultimate tensile strength in MPa */
  readonly ultimateStrength: number;

  /** Yield strength in MPa */
  readonly yieldStrength: number;

  /** Fatigue strength coefficient (σf') in MPa */
  readonly fatigueStrengthCoeff?: number;
}

export type { DamageEntry, DamageResult, MeanStressMethod, MaterialProperties };
