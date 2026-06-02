/**
 * Core domain interfaces for rainflow cycle counting results.
 *
 * @module rainflow
 */

import type { StressRange, MeanStress, Cycles } from './units';

/**
 * A single fatigue cycle extracted by rainflow counting.
 */
interface RainflowCycle {
  /** Stress range of the cycle (Δσ = σmax - σmin) in MPa */
  readonly range: StressRange;

  /** Mean stress of the cycle (σm = (σmax + σmin) / 2) in MPa */
  readonly mean: MeanStress;

  /** Number of occurrences of this cycle */
  readonly count: Cycles;

  /** Minimum stress value in the cycle */
  readonly minimum: number;

  /** Maximum stress value in the cycle */
  readonly maximum: number;
}

/**
 * Complete result of a rainflow cycle counting analysis.
 */
interface RainflowResult {
  /** All extracted cycles */
  readonly cycles: readonly RainflowCycle[];

  /** Residual (unclosed) points after rainflow counting */
  readonly residuals: readonly number[];

  /** Total number of cycles extracted */
  readonly totalCycles: Cycles;

  /** Maximum stress in the original time series */
  readonly maxStress: number;

  /** Minimum stress in the original time series */
  readonly minStress: number;

  /** Number of data points in the original time series */
  readonly dataPoints: number;
}

/**
 * 2D cycle matrix (Markov matrix) — binned by range and mean.
 */
interface CycleMatrix {
  /** Bin edges for stress ranges */
  readonly rangeBins: readonly number[];

  /** Bin edges for mean stresses */
  readonly meanBins: readonly number[];

  /** 2D array of cycle counts [rangeBin][meanBin] */
  readonly counts: readonly (readonly Cycles[])[];
}

export type { RainflowCycle, RainflowResult, CycleMatrix };
