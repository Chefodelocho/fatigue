/**
 * Haigh diagram data generation for mean stress correction visualization.
 *
 * Generates the failure lines (Goodman, Gerber, Soderberg) and yield
 * boundary for plotting on a Haigh (σm vs σa) diagram, along with
 * scatter points from FEM node data.
 *
 * @module mean-stress/haigh
 */

import type {
  FEMMaterialProperties,
  HaighLinePoint,
  HaighPoint,
  HaighDiagramData,
  StressComponent,
  NodeSafetyFactors,
} from '@fatigue/types';

/**
 * Number of interpolation points along each failure line.
 */
const LINE_RESOLUTION = 50;

/**
 * Generate the Goodman failure line points.
 *
 * The Goodman line is linear: σa = σe × (1 − σm/σu)
 *
 * Extended into the compressive region (σm < 0) where the line
 * rises, reflecting the beneficial effect of compressive mean stress.
 *
 * @param material - Material properties
 * @returns Array of (σm, σa) points along the Goodman line
 */
function generateGoodmanLine(material: FEMMaterialProperties): readonly HaighLinePoint[] {
  const { ultimateStrength: sigmaU, enduranceLimit: sigmaE } = material;
  const points: HaighLinePoint[] = [];

  // Extend from −σu to +σu
  const sigmaMMin = -sigmaU;
  const sigmaMMax = sigmaU;
  const step = (sigmaMMax - sigmaMMin) / LINE_RESOLUTION;

  for (let i = 0; i <= LINE_RESOLUTION; i++) {
    const sigmaM = sigmaMMin + i * step;
    const sigmaA = sigmaE * (1 - sigmaM / sigmaU);

    // Only include points where σa ≥ 0 (physical constraint)
    if (sigmaA >= 0) {
      points.push({ mean: sigmaM, alternating: sigmaA });
    }
  }

  return points;
}

/**
 * Generate the Gerber parabola points.
 *
 * The Gerber criterion: σa = σe × (1 − (σm/σu)²)
 *
 * This is symmetric about σm = 0, so it gives the same safety factor
 * for tensile and compressive mean stress of the same magnitude.
 *
 * @param material - Material properties
 * @returns Array of (σm, σa) points along the Gerber parabola
 */
function generateGerberLine(material: FEMMaterialProperties): readonly HaighLinePoint[] {
  const { ultimateStrength: sigmaU, enduranceLimit: sigmaE } = material;
  const points: HaighLinePoint[] = [];

  // From −σu to +σu
  const sigmaMMin = -sigmaU;
  const sigmaMMax = sigmaU;
  const step = (sigmaMMax - sigmaMMin) / LINE_RESOLUTION;

  for (let i = 0; i <= LINE_RESOLUTION; i++) {
    const sigmaM = sigmaMMin + i * step;
    const ratio = sigmaM / sigmaU;
    const sigmaA = sigmaE * (1 - ratio * ratio);

    if (sigmaA >= 0) {
      points.push({ mean: sigmaM, alternating: sigmaA });
    }
  }

  return points;
}

/**
 * Generate the Soderberg failure line points.
 *
 * The Soderberg line: σa = σe × (1 − σm/σy)
 *
 * This is the most conservative criterion, using yield strength instead
 * of ultimate tensile strength.
 *
 * @param material - Material properties
 * @returns Array of (σm, σa) points along the Soderberg line
 */
function generateSoderbergLine(material: FEMMaterialProperties): readonly HaighLinePoint[] {
  const { yieldStrength: sigmaY, enduranceLimit: sigmaE } = material;
  const points: HaighLinePoint[] = [];

  // Extend from −σy to +σy
  const sigmaMMin = -sigmaY;
  const sigmaMMax = sigmaY;
  const step = (sigmaMMax - sigmaMMin) / LINE_RESOLUTION;

  for (let i = 0; i <= LINE_RESOLUTION; i++) {
    const sigmaM = sigmaMMin + i * step;
    const sigmaA = sigmaE * (1 - sigmaM / sigmaY);

    if (sigmaA >= 0) {
      points.push({ mean: sigmaM, alternating: sigmaA });
    }
  }

  return points;
}

/**
 * Generate the yield boundary line.
 *
 * The yield boundary defines the elastic region: the combination of mean
 * and alternating stress must not cause gross yielding.
 *
 * σa = σy − |σm|  for |σm| ≤ σy
 *
 * This forms a triangle on the Haigh diagram with vertices at
 * (−σy, 0), (0, σy), and (σy, 0).
 *
 * @param material - Material properties
 * @returns Array of (σm, σa) points along the yield boundary
 */
function generateYieldLine(material: FEMMaterialProperties): readonly HaighLinePoint[] {
  const { yieldStrength: sigmaY } = material;
  const points: HaighLinePoint[] = [];

  // Yield boundary: σa = σy − |σm| for |σm| ≤ σy
  // Forms a triangle from (−σy, 0) → (0, σy) → (σy, 0)
  const sigmaMMin = -sigmaY;
  const sigmaMMax = sigmaY;
  const step = (sigmaMMax - sigmaMMin) / LINE_RESOLUTION;

  for (let i = 0; i <= LINE_RESOLUTION; i++) {
    const sigmaM = sigmaMMin + i * step;
    const sigmaA = sigmaY - Math.abs(sigmaM);

    if (sigmaA >= 0) {
      points.push({ mean: sigmaM, alternating: sigmaA });
    }
  }

  return points;
}

/**
 * Convert per-node safety factor results into Haigh diagram scatter points
 * for the specified stress component.
 *
 * @param safetyFactors - Array of per-node safety factors
 * @param component     - Which stress component to extract
 * @returns Array of Haigh diagram points (one per node)
 */
function generateNodePoints(
  safetyFactors: readonly NodeSafetyFactors[],
  component: StressComponent,
): readonly HaighPoint[] {
  return safetyFactors
    .filter((sf) => sf.stressComponent === component)
    .map((sf) => ({
      nodeId: sf.nodeId,
      mean: sf.meanStress,
      alternating: sf.alternatingStress,
      stressComponent: component,
      goodmanSF: sf.goodmanSF,
    }));
}

/**
 * Generate complete Haigh diagram data including failure lines and
 * node scatter points.
 *
 * @param material      - Material properties
 * @param safetyFactors - Per-node safety factors for the selected component
 * @param component     - Stress component to plot
 * @returns Complete HaighDiagramData for visualization
 *
 * @example
 * ```ts
 * const haighData = generateHaighDiagramData(material, vonSafetyFactors, 'VON');
 * // haighData.goodmanLine — the Goodman failure boundary
 * // haighData.points      — all FEM node operating points
 * ```
 */
export function generateHaighDiagramData(
  material: FEMMaterialProperties,
  safetyFactors: readonly NodeSafetyFactors[],
  component: StressComponent,
): HaighDiagramData {
  return {
    goodmanLine: generateGoodmanLine(material),
    gerberLine: generateGerberLine(material),
    soderbergLine: generateSoderbergLine(material),
    yieldLine: generateYieldLine(material),
    points: generateNodePoints(safetyFactors, component),
  };
}
