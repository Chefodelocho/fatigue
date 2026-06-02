/**
 * Compute mean and alternating stress from two FEM load cases.
 *
 * @module mean-stress/compute-stress-pair
 */

import type { StressPair } from '@fatigue/types';

/**
 * Compute the mean and alternating stress pair from base-case and
 * loading-case stress values.
 *
 * **Formulas:**
 * - Mean stress:      σm = (σ_base + σ_load) / 2
 * - Alternating stress: σa = |σ_load − σ_base| / 2
 *
 * The alternating stress is always non-negative by definition (absolute
 * difference divided by 2). The mean stress retains its sign — positive
 * for tensile-dominant loading, negative for compressive-dominant.
 *
 * @param baseStress  - Stress from the base (unloaded) FEM case, in MPa
 * @param loadStress  - Stress from the loading FEM case, in MPa
 * @returns StressPair with mean and alternating components in MPa
 *
 * @example
 * ```ts
 * const pair = computeStressPair(100, 200);
 * // pair.mean === 150, pair.alternating === 50
 *
 * const compressive = computeStressPair(-50, -150);
 * // compressive.mean === -100, compressive.alternating === 50
 * ```
 */
export function computeStressPair(baseStress: number, loadStress: number): StressPair {
  const mean = (baseStress + loadStress) / 2;
  const alternating = Math.abs(loadStress - baseStress) / 2;

  return { mean, alternating } as const;
}
