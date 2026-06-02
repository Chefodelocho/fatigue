/**
 * Gerber mean stress correction and safety factor calculation.
 *
 * The Gerber criterion uses a parabolic failure line on the Haigh diagram,
 * which is less conservative than Goodman and better suited for ductile
 * materials.
 *
 * **Failure parabola:**  (σa/σe) + (σm/σu)² = 1
 *
 * At failure, the operating point (SF·σm, SF·σa) lies on the parabola.
 * Solving the resulting quadratic yields the safety factor.
 *
 * @module mean-stress/gerber
 */

import type { Result, FEMMaterialProperties } from '@fatigue/types';
import { ok, err } from '@fatigue/types';

/**
 * Compute the Gerber safety factor for a given operating point.
 *
 * The Gerber safety factor SF is found by solving the quadratic equation
 * obtained when the scaled operating point (SF·σm, SF·σa) lies on the
 * Gerber parabola:
 *
 * ```
 * (σm/σu)² · SF² + (σa/σe) · SF − 1 = 0
 * ```
 *
 * Using the quadratic formula and taking the positive root:
 *
 * ```
 * SF = [−(σa/σe) + √((σa/σe)² + 4·(σm/σu)²)] / [2·(σm/σu)²]
 * ```
 *
 * **Special cases:**
 * - σm = 0: Reduces to SF = σe / σa
 * - σa = 0: Reduces to SF = σu / |σm|
 * - σm < 0: Gerber parabola is symmetric, so the result is the same as for |σm|
 *
 * @param sigmaA    - Alternating stress amplitude in MPa (must be ≥ 0)
 * @param sigmaM    - Mean stress in MPa (can be negative)
 * @param material  - Material properties (σu, σy, σe)
 * @returns Result containing the safety factor or an error message
 *
 * @example
 * ```ts
 * const material = { ultimateStrength: 500, yieldStrength: 350, enduranceLimit: 250 };
 * const result = gerberSafetyFactor(100, 200, material);
 * if (result.ok) console.log(`Gerber SF = ${result.value.toFixed(3)}`);
 * // Gerber SF = 1.563
 * ```
 *
 * @see Shigley's Mechanical Engineering Design, Chapter 6
 */
export function gerberSafetyFactor(
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
    // Pure static loading: failure at σm = σu
    if (Math.abs(sigmaM) === 0) {
      return ok(Infinity);
    }
    return ok(sigmaU / Math.abs(sigmaM));
  }

  // Normalized ratios
  const R = sigmaM / sigmaU; // mean stress ratio (can be negative)
  const S = sigmaA / sigmaE; // alternating stress ratio (≥ 0)
  const R2 = R * R; // R² (always ≥ 0)

  // Special case: σm = 0 → parabola degenerates, SF = σe/σa
  if (R2 === 0) {
    return ok(1 / S);
  }

  // Quadratic: R²·SF² + S·SF − 1 = 0
  // Discriminant: S² + 4·R²
  const discriminant = S * S + 4 * R2;

  // Discriminant is always positive since R² ≥ 0 and S ≥ 0
  // Take the positive root: SF = (-S + √discriminant) / (2·R²)
  const sf = (-S + Math.sqrt(discriminant)) / (2 * R2);

  return ok(sf);
}
