/**
 * Combined safety factor computation for all mean stress correction criteria.
 *
 * Provides a single entry point to compute Goodman, Gerber, and Soderberg
 * safety factors simultaneously for a FEM node.
 *
 * @module mean-stress/safety-factor
 */

import type { NodeSafetyFactors, StressComponent, FEMMaterialProperties } from '@fatigue/types';

import { goodmanSafetyFactor } from './goodman';
import { gerberSafetyFactor } from './gerber';
import { soderbergSafetyFactor } from './soderberg';

/**
 * Compute all three safety factors (Goodman, Gerber, Soderberg) for a single
 * operating point and return the minimum.
 *
 * Each individual safety factor computation returns a `Result`. If any
 * computation fails, the error is reflected as SF = NaN for that criterion,
 * and a warning could be logged upstream. The minSF is computed from valid
 * (finite, non-NaN) values only.
 *
 * @param nodeId          - FEM node identifier
 * @param stressComponent - Which stress component (VON, P1, P2, P3)
 * @param sigmaA          - Alternating stress in MPa
 * @param sigmaM          - Mean stress in MPa
 * @param material        - Material properties
 * @returns NodeSafetyFactors with all three SF values and the minimum
 *
 * @example
 * ```ts
 * const material = { ultimateStrength: 500, yieldStrength: 350, enduranceLimit: 250 };
 * const result = computeSafetyFactors(42, 'VON', 100, 200, material);
 * console.log(`Min SF = ${result.minSF.toFixed(3)} (Soderberg governs)`);
 * ```
 */
export function computeSafetyFactors(
  nodeId: number,
  stressComponent: StressComponent,
  sigmaA: number,
  sigmaM: number,
  material: FEMMaterialProperties,
): NodeSafetyFactors {
  const goodmanResult = goodmanSafetyFactor(sigmaA, sigmaM, material);
  const gerberResult = gerberSafetyFactor(sigmaA, sigmaM, material);
  const soderbergResult = soderbergSafetyFactor(sigmaA, sigmaM, material);

  const goodmanSF = goodmanResult.ok ? goodmanResult.value : NaN;
  const gerberSF = gerberResult.ok ? gerberResult.value : NaN;
  const soderbergSF = soderbergResult.ok ? soderbergResult.value : NaN;

  // Minimum of valid, finite safety factors
  const validSFs = [goodmanSF, gerberSF, soderbergSF].filter(
    (v) => !Number.isNaN(v) && Number.isFinite(v),
  );

  const minSF =
    validSFs.length > 0 ? Math.min(...validSFs) : NaN;

  return {
    nodeId,
    stressComponent,
    meanStress: sigmaM,
    alternatingStress: sigmaA,
    goodmanSF,
    gerberSF,
    soderbergSF,
    minSF,
  } as const;
}
