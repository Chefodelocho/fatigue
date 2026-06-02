/**
 * Core domain interfaces for S-N curve definitions.
 *
 * @module sn-curve
 */

import type { MPa, StressRange, Cycles, Dimensionless } from './units';

/**
 * S-N curve representation using log-log parameters.
 *
 * The S-N curve is defined by the equation:
 *   log N = log a - m × log Δσ
 *
 * @see DIN EN 1993-1-9, Section 7.1
 */
interface SNCurve {
  /** Unique identifier for this S-N curve */
  readonly id: string;

  /** Human-readable name (e.g., "EC3 Detail 160") */
  readonly name: string;

  /** Slope of the S-N curve on log-log scale (typically 3 or 4) */
  readonly m: Dimensionless;

  /** Intercept constant: log(a) in the equation log N = log a - m × log Δσ */
  readonly logA: Dimensionless;

  /** Detail category / FAT class — reference stress range at 2×10⁶ cycles (MPa) */
  readonly detailCategory: MPa;

  /** Constant amplitude fatigue limit (CAFL) stress range in MPa */
  readonly fatigueLimit: StressRange;

  /** Cut-off limit stress range in MPa (below this, no damage is accumulated) */
  readonly cutOffLimit: StressRange;

  /** Reference number of cycles for the detail category */
  readonly referenceCycles: Cycles;

  /** Standard this curve belongs to (e.g., "EC3", "DNVGL", "IIW") */
  readonly standard: string;

  /** Optional environmental condition (e.g., "air", "seawater", "seawater-cp") */
  readonly environment?: 'air' | 'seawater' | 'seawater-cp';

  /** Optional thickness correction parameters */
  readonly thicknessCorrection?: {
    readonly referenceThickness: number;
    readonly exponent: number;
  };
}

/**
 * A single point on an S-N curve (stress range vs. cycles to failure).
 */
interface SNPoint {
  readonly stressRange: StressRange;
  readonly cycles: Cycles;
}

export type { SNCurve, SNPoint };
