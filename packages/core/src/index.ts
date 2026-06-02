/**
 * @fatigue/core — Core fatigue calculation engine.
 *
 * Pure functions implementing fatigue analysis algorithms.
 * No side effects, no I/O — only calculations.
 *
 * @module
 */

// -- Mean Stress Corrections & Safety Factors ---
export { computeStressPair } from './mean-stress/compute-stress-pair';
export { goodmanSafetyFactor } from './mean-stress/goodman';
export { gerberSafetyFactor } from './mean-stress/gerber';
export { soderbergSafetyFactor } from './mean-stress/soderberg';
export { computeSafetyFactors } from './mean-stress/safety-factor';
export { generateHaighDiagramData } from './mean-stress/haigh';
export { analyzeFEMData } from './mean-stress/fem-analysis';
