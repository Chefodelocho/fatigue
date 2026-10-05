/**
 * FEM analysis pipeline — orchestrates the complete fatigue safety analysis.
 *
 * Processes FEM node stress data from two load cases through the full pipeline:
 * 1. Compute mean and alternating stress for each node and component
 * 2. Compute safety factors (Goodman, Gerber, Soderberg)
 * 3. Find minimum safety factors across all nodes
 * 4. Generate Haigh diagram data
 *
 * @module mean-stress/fem-analysis
 */

import type {
  FEMNodeStress,
  FEMMaterialProperties,
  FEMAnalysisResult,
  NodeSafetyFactors,
  StressComponent,
} from '@fatigue/types';

import { computeStressPair } from './compute-stress-pair';
import { computeSafetyFactors } from './safety-factor';
import { generateHaighDiagramData } from './haigh';

/**
 * Stress component keys in FEMNodeStress, mapped to their base/load field names.
 */
const STRESS_COMPONENTS: readonly {
  readonly component: StressComponent;
  readonly baseKey: 'baseVON' | 'baseP1' | 'baseP2' | 'baseP3';
  readonly loadKey: 'loadVON' | 'loadP1' | 'loadP2' | 'loadP3';
}[] = [
  { component: 'VON', baseKey: 'baseVON', loadKey: 'loadVON' },
  { component: 'P1', baseKey: 'baseP1', loadKey: 'loadP1' },
  { component: 'P2', baseKey: 'baseP2', loadKey: 'loadP2' },
  { component: 'P3', baseKey: 'baseP3', loadKey: 'loadP3' },
] as const;

/**
 * Analyze FEM stress data for all nodes across all stress components.
 *
 * For each node and each stress component (VON, P1, P2, P3):
 * 1. Computes the mean stress σm = (σ_base + σ_load) / 2
 * 2. Computes the alternating stress σa = |σ_load − σ_base| / 2
 * 3. Evaluates Goodman, Gerber, and Soderberg safety factors
 * 4. Records the minimum safety factor across the three criteria
 *
 * After processing all nodes, the function identifies the node with the
 * lowest safety factor for each stress component and generates Haigh
 * diagram data for visualization.
 *
 * @param nodes    - Array of FEM node stress data (base + loading case)
 * @param material - Material properties (σu, σy, σe in MPa)
 * @returns Complete FEMAnalysisResult with safety factors and Haigh data
 *
 * @example
 * ```ts
 * const nodes: FEMNodeStress[] = [
 *   { nodeId: 1, baseVON: 50, baseP1: 40, baseP2: 10, baseP3: -5,
 *     loadVON: 200, loadP1: 180, loadP2: 50, loadP3: -20 },
 *   // ... more nodes
 * ];
 * const material = { ultimateStrength: 500, yieldStrength: 350, enduranceLimit: 250 };
 * const result = analyzeFEMData(nodes, material);
 *
 * console.log(`Min VON SF: ${result.minSafetyFactors.VON.minSF.toFixed(3)}`);
 * console.log(`Critical node: ${result.minSafetyFactors.VON.nodeId}`);
 * ```
 */
export function analyzeFEMData(
  nodes: readonly FEMNodeStress[],
  material: FEMMaterialProperties,
): FEMAnalysisResult {
  // Accumulate safety factors per component using explicit arrays
  const vonFactors: NodeSafetyFactors[] = [];
  const p1Factors: NodeSafetyFactors[] = [];
  const p2Factors: NodeSafetyFactors[] = [];
  const p3Factors: NodeSafetyFactors[] = [];

  const buckets: Record<StressComponent, NodeSafetyFactors[]> = {
    VON: vonFactors,
    P1: p1Factors,
    P2: p2Factors,
    P3: p3Factors,
  };

  for (const node of nodes) {
    for (const { component, baseKey, loadKey } of STRESS_COMPONENTS) {
      const baseStress = node[baseKey];
      const loadStress = node[loadKey];

      // Compute mean and alternating stress
      const pair = computeStressPair(baseStress, loadStress);

      // Compute all three safety factors
      const sf = computeSafetyFactors(
        node.nodeId,
        component,
        pair.alternating,
        pair.mean,
        material,
      );

      const bucket = buckets[component];
      if (bucket === undefined) {
        throw new Error(`No result bucket configured for stress component ${component}`);
      }
      bucket.push(sf);
    }
  }

  // Find minimum safety factor node for each component
  const minVON = findMinSF(vonFactors);
  const minP1 = findMinSF(p1Factors);
  const minP2 = findMinSF(p2Factors);
  const minP3 = findMinSF(p3Factors);

  // Generate Haigh diagram data using the VON component as default scatter
  // (can be regenerated for other components via generateHaighDiagramData)
  const haighData = generateHaighDiagramData(material, vonFactors, 'VON');

  return {
    material,
    nodeCount: nodes.length,
    safetyFactors: {
      VON: vonFactors,
      P1: p1Factors,
      P2: p2Factors,
      P3: p3Factors,
    },
    minSafetyFactors: {
      VON: minVON,
      P1: minP1,
      P2: minP2,
      P3: minP3,
    },
    haighData,
  };
}

/**
 * Find the node with the minimum finite safety factor from an array.
 *
 * Filters out NaN and Infinity values to find the most critical node
 * (lowest actual safety factor indicating highest risk of failure).
 *
 * @param factors - Array of per-node safety factors
 * @returns The NodeSafetyFactors with the lowest finite minSF
 */
function findMinSF(factors: readonly NodeSafetyFactors[]): NodeSafetyFactors {
  const firstFactor = factors[0];
  if (firstFactor === undefined) {
    throw new Error('Cannot find minimum safety factor for an empty node list');
  }

  const finiteFactors = factors.filter((f) => !Number.isNaN(f.minSF) && Number.isFinite(f.minSF));

  if (finiteFactors.length === 0) {
    // All nodes have infinite safety (no cyclic loading) — return the first
    return firstFactor;
  }

  let min = finiteFactors[0] ?? firstFactor;
  for (const current of finiteFactors.slice(1)) {
    if (current.minSF < min.minSF) {
      min = current;
    }
  }

  return min;
}
