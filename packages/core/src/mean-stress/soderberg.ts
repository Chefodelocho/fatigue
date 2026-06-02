/**
 * Soderberg mean stress correction and safety factor calculation.
 *
 * The Soderberg criterion is the most conservative of the three common
 * mean stress corrections. It uses the yield strength instead of ultimate
 * strength in the denominator, preventing both fatigue failure and yielding.
 *
 * **Failure line:**  σa/σe + σm/σy = 1
 *
 * @module mean-stress/soderberg
 */

import type { Result, FEMMaterialProperties } from '@fatigue/types';
import { ok, err } from '@fatigue/types';

/**
 * Compute the Soderberg safety factor for a given operating point.
 *
 * The safety factor SF is the scaling factor that, when applied to the
 * operating point (σa, σm), causes it to intersect the Soderberg failure line:
 *
 * ```
 * SF = 1 / (σa/σe + σm/σy)
 * ```
 *
 * This is identical in form to Goodman but substitutes σy for σu, making
 * it more conservative since σy < σu for all engineering metals.
 *
 * **Edge cases:**
 * - σa = 0: No cyclic loading → SF = Infinity
 * - σm ≥ σy: Mean stress at or above yield → SF = 0 (yielding)
 * - σm < 0: Compressive mean stress increases SF (beneficial)
 *
 * @param sigmaA    - Alternating stress amplitude in MPa (must be ≥ 0)
 * @param sigmaM    - Mean stress in MPa (can be negative)
 * @param material  - Material properties (σu, σy, σe)
 * @returns Result containing the safety factor or an error message
 *
 * @example
 * ```ts
 * const material = { ultimateStrength: 500, yieldStrength: 350, enduranceLimit: 250 };
 * const result = soderbergSafetyFactor(100, 200, material);
 * if (result.ok) console.log(`Soderberg SF = ${result.value.toFixed(3)}`);
 * // Soderberg SF = 1.029
 * ```
 *
 * @see Shigley's Mechanical Engineering Design, Chapter 6
 */
export function soderbergSafetyFactor(
  sigmaA: number,
  sigmaM: number,
  material: FEMMaterialProperties,
): Result<number, string> {
  const { yieldStrength: sigmaY, enduranceLimit: sigmaE } = material;

  // Validate inputs
  if (sigmaY <= 0) {
    return err('Yield strength must be positive');
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

  // Yielding: mean stress at or above yield
  if (sigmaM >= sigmaY) {
    return ok(0);
  }

  // Soderberg formula: SF = 1 / (σa/σe + σm/σy)
  const denominator = sigmaA / sigmaE + sigmaM / sigmaY;

  // Compressive mean stress dominates → effectively infinite safety
  if (denominator <= 0) {
    return ok(Infinity);
  }

  const sf = 1 / denominator;

  return ok(sf);
}
