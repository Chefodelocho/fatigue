/**
 * Branded types for physical units used throughout the fatigue analysis engine.
 *
 * These types prevent unit confusion at compile time — you cannot accidentally
 * pass a `MPa` value where `Cycles` is expected.
 *
 * @module units
 */

// -- Brand utility ------------------------------------------------------------

type Brand<T, B extends string> = T & { readonly __brand: B };

// -- Stress units -------------------------------------------------------------

/** Stress value in megapascals (MPa) */
type MPa = Brand<number, 'MPa'>;

/** Stress range in megapascals (MPa) — the difference between max and min stress */
type StressRange = Brand<number, 'StressRange_MPa'>;

/** Stress amplitude in megapascals (MPa) — half the stress range */
type StressAmplitude = Brand<number, 'StressAmplitude_MPa'>;

/** Mean stress in megapascals (MPa) */
type MeanStress = Brand<number, 'MeanStress_MPa'>;

// -- Cycle units --------------------------------------------------------------

/** Number of cycles (dimensionless count) */
type Cycles = Brand<number, 'Cycles'>;

// -- Damage units -------------------------------------------------------------

/** Damage ratio (dimensionless) — cumulative damage per Miner's rule (D = Σ ni/Ni) */
type DamageRatio = Brand<number, 'DamageRatio'>;

/** Dimensionless quantity (generic) */
type Dimensionless = Brand<number, 'Dimensionless'>;

// -- Geometric units ----------------------------------------------------------

/** Thickness in millimeters (mm) */
type Mm = Brand<number, 'Mm'>;

/** Dimensionless stress concentration factor */
type SCF = Brand<number, 'SCF'>;

// -- Temperature units --------------------------------------------------------

/** Temperature in degrees Celsius */
type Celsius = Brand<number, 'Celsius'>;

// -- Constructor helpers ------------------------------------------------------

/** Create an MPa branded value */
const createMPa = (value: number): MPa => value as MPa;

/** Create a StressRange branded value */
const createStressRange = (value: number): StressRange => value as StressRange;

/** Create a StressAmplitude branded value */
const createStressAmplitude = (value: number): StressAmplitude => value as StressAmplitude;

/** Create a MeanStress branded value */
const createMeanStress = (value: number): MeanStress => value as MeanStress;

/** Create a Cycles branded value */
const createCycles = (value: number): Cycles => value as Cycles;

/** Create a DamageRatio branded value */
const createDamageRatio = (value: number): DamageRatio => value as DamageRatio;

/** Create a Dimensionless branded value */
const createDimensionless = (value: number): Dimensionless => value as Dimensionless;

/** Create an Mm branded value */
const createMm = (value: number): Mm => value as Mm;

/** Create an SCF branded value */
const createSCF = (value: number): SCF => value as SCF;

/** Create a Celsius branded value */
const createCelsius = (value: number): Celsius => value as Celsius;

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
};

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
};
