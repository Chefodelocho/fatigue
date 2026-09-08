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

// -- S-N Curves & Damage Accumulation ---
export { evaluateCyclesToFailure } from './sn-curve/evaluate';
export { computeMinerDamage } from './damage/miner';

// -- Standards (Phase 1) ---
export { createEN1993Curve, getEN1993DetailCategories } from './standards/eurocode3/en-1993-1-9';
export { createIIWCurve, getIIWFatClasses } from './standards/iiw/recommendations';
export { createDNVGLCurve, getDNVGLFatClasses } from './standards/dnvgl/rp-c203';
export { createABSCurve, getABSFatClasses } from './standards/abs/guide-fatigue';
export { api579Level1Screening, estimateParisLawCycles } from './standards/api579-1/part14';
