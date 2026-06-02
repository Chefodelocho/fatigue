/**
 * Core domain interfaces for FEM-based fatigue analysis.
 *
 * These types support the analysis of stress data from two FEM simulation
 * load cases (base case + loading case) to produce Haigh diagrams and
 * safety factors using Goodman, Gerber, and Soderberg criteria.
 *
 * @module fem-analysis
 */

// -- Stress Component Type -----------------------------------------------------

/**
 * Stress components available for FEM fatigue analysis.
 *
 * - `VON` — Von Mises equivalent stress (always ≥ 0)
 * - `P1`  — First principal stress (signed, most tensile)
 * - `P2`  — Second principal stress (signed)
 * - `P3`  — Third principal stress (signed, most compressive)
 */
type StressComponent = 'VON' | 'P1' | 'P2' | 'P3';

// -- FEM Node Stress Data ------------------------------------------------------

/**
 * FEM stress data for a single node, containing both base-case and
 * loading-case stresses for all components.
 *
 * All stress values are in MPa (converted from the original N/m² in the CSV).
 */
interface FEMNodeStress {
  /** Unique FEM mesh node identifier */
  readonly nodeId: number;

  // -- Base case stresses (MPa) --
  /** Von Mises equivalent stress — base case */
  readonly baseVON: number;
  /** First principal stress — base case */
  readonly baseP1: number;
  /** Second principal stress — base case */
  readonly baseP2: number;
  /** Third principal stress — base case */
  readonly baseP3: number;

  // -- Loading case stresses (MPa) --
  /** Von Mises equivalent stress — loading case */
  readonly loadVON: number;
  /** First principal stress — loading case */
  readonly loadP1: number;
  /** Second principal stress — loading case */
  readonly loadP2: number;
  /** Third principal stress — loading case */
  readonly loadP3: number;
}

// -- Stress Pair ---------------------------------------------------------------

/**
 * Mean and alternating stress pair derived from two load cases.
 *
 * - Mean stress:      σm = (σ_base + σ_load) / 2
 * - Alternating stress: σa = |σ_load − σ_base| / 2
 */
interface StressPair {
  /** Mean stress in MPa */
  readonly mean: number;
  /** Alternating (cyclic) stress amplitude in MPa (always ≥ 0) */
  readonly alternating: number;
}

// -- Material Properties -------------------------------------------------------

/**
 * Material properties required for FEM fatigue safety factor calculations.
 *
 * Note: This is distinct from the general `MaterialProperties` in `damage.ts`
 * which is used for S-N curve damage accumulation. This interface includes
 * the endurance limit needed for mean stress correction diagrams.
 */
interface FEMMaterialProperties {
  /** Ultimate tensile strength σu in MPa */
  readonly ultimateStrength: number;
  /** Yield strength σy in MPa */
  readonly yieldStrength: number;
  /** Endurance limit σe in MPa (fully reversed fatigue limit) */
  readonly enduranceLimit: number;
}

// -- Safety Factors ------------------------------------------------------------

/**
 * Safety factors for a single FEM node and stress component.
 *
 * A node fails when its minimum safety factor ≤ 1.0.
 */
interface NodeSafetyFactors {
  /** Unique FEM mesh node identifier */
  readonly nodeId: number;
  /** Which stress component was analyzed */
  readonly stressComponent: StressComponent;
  /** Mean stress σm in MPa */
  readonly meanStress: number;
  /** Alternating stress σa in MPa */
  readonly alternatingStress: number;
  /** Safety factor per Goodman criterion */
  readonly goodmanSF: number;
  /** Safety factor per Gerber criterion */
  readonly gerberSF: number;
  /** Safety factor per Soderberg criterion */
  readonly soderbergSF: number;
  /** Minimum of the three safety factors */
  readonly minSF: number;
}

// -- Haigh Diagram Data --------------------------------------------------------

/**
 * A single data point on the Haigh (σm vs σa) diagram.
 */
interface HaighPoint {
  /** FEM node this point corresponds to */
  readonly nodeId: number;
  /** Mean stress coordinate in MPa */
  readonly mean: number;
  /** Alternating stress coordinate in MPa */
  readonly alternating: number;
  /** Which stress component this point represents */
  readonly stressComponent: StressComponent;
  /** Goodman safety factor for this point (used for sorting worst-first and coloring) */
  readonly goodmanSF: number;
}

/**
 * A point on a failure or boundary line in the Haigh diagram.
 */
interface HaighLinePoint {
  /** Mean stress coordinate in MPa */
  readonly mean: number;
  /** Alternating stress coordinate in MPa */
  readonly alternating: number;
}

/**
 * Complete Haigh diagram data including failure lines and scatter points.
 */
interface HaighDiagramData {
  /** Goodman failure line: from (0, σe) to (σu, 0), extended for negative σm */
  readonly goodmanLine: readonly HaighLinePoint[];
  /** Gerber parabola: σa = σe × (1 − (σm/σu)²) */
  readonly gerberLine: readonly HaighLinePoint[];
  /** Soderberg failure line: from (0, σe) to (σy, 0) */
  readonly soderbergLine: readonly HaighLinePoint[];
  /** Yield boundary: σa = σy − |σm| */
  readonly yieldLine: readonly HaighLinePoint[];
  /** All node (σm, σa) data points for a given stress component */
  readonly points: readonly HaighPoint[];
}

// -- Complete FEM Analysis Result ----------------------------------------------

/**
 * Complete result of a FEM fatigue analysis across all nodes and stress components.
 */
interface FEMAnalysisResult {
  /** Material properties used for the analysis */
  readonly material: FEMMaterialProperties;
  /** Total number of FEM nodes analyzed */
  readonly nodeCount: number;
  /** Safety factors per stress component (array of per-node results) */
  readonly safetyFactors: {
    readonly VON: readonly NodeSafetyFactors[];
    readonly P1: readonly NodeSafetyFactors[];
    readonly P2: readonly NodeSafetyFactors[];
    readonly P3: readonly NodeSafetyFactors[];
  };
  /** Node with the minimum safety factor for each stress component */
  readonly minSafetyFactors: {
    readonly VON: NodeSafetyFactors;
    readonly P1: NodeSafetyFactors;
    readonly P2: NodeSafetyFactors;
    readonly P3: NodeSafetyFactors;
  };
  /** Haigh diagram data (failure lines + node scatter points) */
  readonly haighData: HaighDiagramData;
}

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
};
