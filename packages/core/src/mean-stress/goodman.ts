/**
 * Goodman mean stress correction and safety factor calculation.
 *
 * The Goodman criterion is a linear failure line on the Haigh diagram
 * connecting (0, σe) to (σu, 0). It is conservative and well-suited
 * for brittle materials or when limited fatigue data is available.
 *
 * **Failure line:**  σa/σe + σm/σu = 1
 *
 * For compressive mean stress (σm < 0), the Goodman line extends upward,
 * reflecting that compressive residual stresses are beneficial for fatigue.
 *
 * @module mean-stress/goodman
 */

import type { Result, FEMMaterialProperties } from '@fatigue/types';
import { ok, err } from '@fatigue/types';

/**
 * Compute the Goodman safety factor for a given operating point.
 *
 * The safety factor SF is the scaling factor that, when applied to the
 * operating point (σa, σm), causes it to intersect the Goodman failure line:
 *
 * ```
 * SF = 1 / (σa/σe + σm/σu)
 * ```
 *
 * **Interpretation:**
 * - SF > 1.0: Safe — the operating point lies below the failure line
 * - SF = 1.0: Margin — the operating point lies on the failure line
 * - SF < 1.0: Failure — the operating point exceeds the failure line
 *
 * **Edge cases:**
 * - σa = 0: No cyclic loading → SF = Infinity (infinite life)
 * - σm ≥ σu: Mean stress at or above UTS → SF = 0 (static failure)
 * - σm < 0 (compressive): Denominator decreases → SF increases (beneficial)
 *
 * @param sigmaA    - Alternating stress amplitude in MPa (must be ≥ 0)
 * @param sigmaM    - Mean stress in MPa (can be negative)
 * @param material  - Material properties (σu, σy, σe)
 * @returns Result containing the safety factor or an error message
 *
 * @example
 * ```ts
 * const material = { ultimateStrength: 500, yieldStrength: 350, enduranceLimit: 250 };
 * const result = goodmanSafetyFactor(100, 200, material);
 * if (result.ok) console.log(`Goodman SF = ${result.value.toFixed(3)}`);
 * // Goodman SF = 1.136
 * ```
 *
 * @see Shigley's Mechanical Engineering Design, Chapter 6
 */
export function goodmanSafetyFactor(
  sigmaA: number,
  sigmaM: number,
  material: FEMMaterialProperties,
): Result<number, string> {
  const { ultimateStrength: sigmaU, enduranceLimit: sigmaE } = material;

  // Validate inputs
  if (sigmaU <= 0) {
    return err('Ultimate tensile strength must be positive');
  }
  if (sigmaE <= 0) {
    return err('Endurance limit must be positive');
  }
  if (sigmaA < 0) {
    return err('Alternating stress must be non-negative');
  }

  // No cyclic loading → infinite life
  if (sigmaA === 0) {
    return ok(Infinity);
  }

  // Static failure: mean stress at or above UTS
  if (sigmaM >= sigmaU) {
    return ok(0);
  }

  // Goodman formula: SF = 1 / (σa/σe + σm/σu)
  // Note: when σm < 0, the term σm/σu is negative, reducing the denominator
  // and increasing SF — this correctly reflects the beneficial effect of
  // compressive mean stress.
  const denominator = sigmaA / sigmaE + sigmaM / sigmaU;

  // If denominator ≤ 0, the operating point is in the safe zone (compressive
  // mean stress dominates) → effectively infinite safety factor
  if (denominator <= 0) {
    return ok(Infinity);
  }

  const sf = 1 / denominator;

  return ok(sf);
}
