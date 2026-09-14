/**
 * @fatigue/types — Shared TypeScript types, interfaces, and branded units.
 *
 * This package has ZERO dependencies on other @fatigue packages.
 * All other packages depend on this one for type definitions.
 *
 * @module
 */

// -- Units & Branded Types ---
export type {
  Brand,
  MPa,
  StressRange,
  StressAmplitude,
  MeanStress,
  Cycles,
  DamageRatio,
  Dimensionless,
  Mm,
  SCF,
  Celsius,
} from './units';

export {
  createMPa,
  createStressRange,
  createStressAmplitude,
  createMeanStress,
  createCycles,
  createDamageRatio,
  createDimensionless,
  createMm,
  createSCF,
  createCelsius,
} from './units';

// -- Result Type ---
export type { Result } from './result';
export { ok, err } from './result';

// -- S-N Curve Types ---
export type { SNCurve, SNPoint } from './sn-curve';

// -- Rainflow Types ---
export type { RainflowCycle, RainflowResult, CycleMatrix } from './rainflow';

// -- Damage Types ---
export type { DamageEntry, DamageResult, MeanStressMethod, MaterialProperties } from './damage';

// -- FEM Analysis Types ---
export type {
  StressComponent,
  FEMNodeStress,
  StressPair,
  FEMMaterialProperties,
  NodeSafetyFactors,
  HaighPoint,
  HaighLinePoint,
  HaighDiagramData,
  FEMAnalysisResult,
} from './fem-analysis';

// -- Coordinate & 3D Visualization Types ---
export type {
  NodeCoordinates,
  Node3DVizPoint,
  Component3DData,
  BoundingBox3D,
  Visualization3DData,
  Visualization3DFullData,
} from './coordinates';
