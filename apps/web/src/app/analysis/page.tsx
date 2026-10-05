/**
 * Fatigue Analysis Page — Configure, Run, and View Results.
 *
 * Three-step workflow:
 * 1. Configure: Select material and upload CSV files (+ optional coordinates)
 * 2. Analyze: Run the fatigue analysis
 * 3. Results: View Haigh diagram, safety factors, and optional 3D visualization
 *    — Change material and recompute without re-uploading files
 *
 * Visiting `/analysis?demo=true` (linked from the home page's "Run Demo &
 * See Results" button) skips the configure step entirely and loads the
 * pre-computed reference example results immediately — the reference
 * dataset is cached process-wide server-side, so this is fast even on a
 * fresh session (see `/api/analyze` and `demo-analysis-cache.ts`).
 *
 * The API pre-computes Haigh diagram data for ALL four stress components
 * (VON, P1, P2, P3) in a single request. Switching components is instant
 * — no re-fetch required.
 *
 * When a coordinates file is uploaded, the API also returns 3D visualization
 * data showing the spatial distribution of safety factors.
 *
 * Includes analysis history sidebar for reloading past analyses. Saved
 * analyses persist server-side via `/api/analyses`, but are scoped to the
 * current browser session using an HTTP-only session cookie.
 *
 * @module app/analysis/page
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  api579Level1Screening,
  evaluateFkmPrototype,
  createABSCurve,
  createDNVGLCurve,
  createEN1993Curve,
  createIIWCurve,
  evaluateCyclesToFailure,
  getABSFatClasses,
  getDNVGLFatClasses,
  getEN1993DetailCategories,
  getIIWFatClasses,
} from '@fatigue/core';

import { createStressRange } from '@fatigue/types';

import type {
  HaighDiagramData,
  HaighLinePoint,
  HaighPoint,
  NodeSafetyFactors,
  StressComponent,
  Visualization3DData,
  Visualization3DFullData,
} from '@fatigue/types';

import type { MaterialConfig, AnalysisHistoryEntry } from '@/lib/analysis-store';
import { saveToHistory, fetchAnalysisData, generateAnalysisId } from '@/lib/analysis-store';

import AnalysisHistory from '@/components/AnalysisHistory';
import FileUpload from '@/components/FileUpload';
import HaighDiagram from '@/components/HaighDiagram';
import MaterialSelector from '@/components/MaterialSelector';
import SafetyFactorTable from '@/components/SafetyFactorTable';
import Scatter3DChart from '@/components/Scatter3DChart';

// -- Types --------------------------------------------------------------------

interface UploadedFiles {
  readonly base: File;
  readonly load: File;
  readonly coordinates?: File;
}

/** Haigh failure lines (same for all components — depend only on material). */
interface HaighLines {
  readonly goodmanLine: readonly HaighLinePoint[];
  readonly gerberLine: readonly HaighLinePoint[];
  readonly soderbergLine: readonly HaighLinePoint[];
  readonly yieldLine: readonly HaighLinePoint[];
}

/** Pre-computed scatter points for one stress component. */
interface ComponentHaighData {
  readonly points: readonly HaighPoint[];
  readonly totalPoints: number;
}

/** Full analysis response from the API. */
interface AnalysisData {
  readonly material: {
    readonly ultimateStrength: number;
    readonly yieldStrength: number;
    readonly enduranceLimit: number;
  };
  readonly nodeCount: number;
  readonly computeTimeSeconds: string;
  readonly minSafetyFactors: Record<StressComponent, NodeSafetyFactors>;
  readonly haighLines: HaighLines;
  readonly haighPointsByComponent: Record<StressComponent, ComponentHaighData>;
  readonly visualization3D: Visualization3DData | null;
}

type PageStep = 'configure' | 'loading' | 'results';
type StandardKey =
  | 'DIN EN 1993-1-9'
  | 'DNVGL-RP-C203'
  | 'ABS'
  | 'API 579-1'
  | 'IIW'
  | 'FKM prototype';

interface StandardOption {
  readonly key: StandardKey;
  readonly label: string;
  readonly defaultClass: number;
  readonly getClasses: () => readonly number[];
  readonly createCurve?: (classValue: number) => ReturnType<typeof createEN1993Curve>;
}

const STANDARD_OPTIONS: readonly StandardOption[] = [
  {
    key: 'DIN EN 1993-1-9',
    label: 'DIN EN 1993-1-9',
    defaultClass: 80,
    getClasses: getEN1993DetailCategories,
    createCurve: (classValue: number) => createEN1993Curve(classValue),
  },
  {
    key: 'DNVGL-RP-C203',
    label: 'DNVGL-RP-C203',
    defaultClass: 80,
    getClasses: getDNVGLFatClasses,
    createCurve: (classValue: number) => createDNVGLCurve(classValue),
  },
  {
    key: 'ABS',
    label: 'ABS',
    defaultClass: 80,
    getClasses: getABSFatClasses,
    createCurve: (classValue: number) => createABSCurve(classValue),
  },
  {
    key: 'IIW',
    label: 'IIW',
    defaultClass: 80,
    getClasses: getIIWFatClasses,
    createCurve: (classValue: number) => createIIWCurve(classValue),
  },
  {
    key: 'API 579-1',
    label: 'API 579-1',
    defaultClass: 1,
    getClasses: () => [1],
    createCurve: () => ({ ok: true, value: undefined as never }),
  },
  {
    key: 'FKM prototype',
    label: 'FKM prototype (not FKM-compliant)',
    defaultClass: 1,
    getClasses: () => [],
  },
] as const;

/** Steel (default material) config used for the reference example. */
const REFERENCE_MATERIAL: MaterialConfig = {
  id: 'steel-default',
  name: 'Steel (Default)',
  ultimateStrength: 500,
  yieldStrength: 350,
  enduranceLimit: 250,
  isCustom: false,
};

// -- Component ----------------------------------------------------------------

export default function AnalysisPage(): JSX.Element {
  // Configuration state
  const [material, setMaterial] = useState<MaterialConfig | null>(null);
  const [files, setFiles] = useState<UploadedFiles | null>(null);
  const [component, setComponent] = useState<StressComponent>('VON');
  const [sfThreshold, setSfThreshold] = useState<number>(10);

  // Analysis state
  const [step, setStep] = useState<PageStep>('configure');
  const [data, setData] = useState<AnalysisData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedStandard, setSelectedStandard] = useState<StandardKey>('DIN EN 1993-1-9');
  const [selectedStandardClass, setSelectedStandardClass] = useState<number>(80);
  const [fkmTargetCycles, setFkmTargetCycles] = useState<number>(1_000_000);

  // Material recomputation state
  const [recomputeMaterial, setRecomputeMaterial] = useState<MaterialConfig | null>(null);
  const [isRecomputing, setIsRecomputing] = useState(false);

  // HD / Detail 3D visualization state — loads ALL matched nodes for the
  // current component on demand (opt-in, since it can be 500K+ nodes).
  // Cached per component so switching back and forth doesn't re-fetch.
  const [hdMode, setHdMode] = useState(false);
  const [hdCache, setHdCache] = useState<Partial<Record<StressComponent, Visualization3DFullData>>>(
    {},
  );
  const [hdLoading, setHdLoading] = useState(false);
  const [hdError, setHdError] = useState<string | null>(null);

  // Derived: can we run the analysis?
  const canAnalyze = material !== null && files !== null;

  const selectedStandardDef = STANDARD_OPTIONS.find(
    (standard) => standard.key === selectedStandard,
  );

  if (!selectedStandardDef) {
    throw new Error('No standard options configured');
  }

  useEffect(() => {
    const classes = selectedStandardDef.getClasses();
    if (!classes.includes(selectedStandardClass)) {
      setSelectedStandardClass(classes[0] ?? 1);
    }
  }, [selectedStandardDef, selectedStandardClass]);

  // Reconstruct HaighDiagramData for the currently selected component,
  // filtered by the SF threshold slider
  const currentHaighData: HaighDiagramData | null = useMemo(() => {
    if (!data) return null;
    const compData = data.haighPointsByComponent[component];
    if (!compData) return null;
    const filteredPoints = compData.points.filter((p) => p.goodmanSF <= sfThreshold);
    return {
      goodmanLine: data.haighLines.goodmanLine,
      gerberLine: data.haighLines.gerberLine,
      soderbergLine: data.haighLines.soderbergLine,
      yieldLine: data.haighLines.yieldLine,
      points: filteredPoints,
    };
  }, [data, component, sfThreshold]);

  // Filtered 3D worst nodes by SF threshold
  const filtered3DData = useMemo(() => {
    if (!data?.visualization3D) return null;
    const compData = data.visualization3D.worstByComponent[component];
    const filteredNodes = compData.worstNodes.filter((n) => n.minSF <= sfThreshold);
    return {
      worstNodes: filteredNodes,
      totalMatchedNodes: compData.totalMatchedNodes,
    };
  }, [data, component, sfThreshold]);

  // HD dataset for the current component, split by the SF threshold slider:
  // nodes at/below the threshold are the color-coded "critical" set (same as
  // before); nodes above it are kept as a translucent grey "background" set
  // so the user can still see the full model shape — just like the default
  // (non-HD) view's sampled background trace, except this includes EVERY
  // above-threshold node instead of a 40K sample.
  const { hdCriticalData, hdBackgroundData } = useMemo((): {
    hdCriticalData: Visualization3DFullData | null;
    hdBackgroundData: Visualization3DFullData | null;
  } => {
    const raw = hdCache[component];
    if (!raw) return { hdCriticalData: null, hdBackgroundData: null };

    const critical = {
      nodeIds: [] as number[],
      x: [] as number[],
      y: [] as number[],
      z: [] as number[],
      minSF: [] as number[],
    };
    const background = {
      nodeIds: [] as number[],
      x: [] as number[],
      y: [] as number[],
      z: [] as number[],
      minSF: [] as number[],
    };

    for (let i = 0; i < raw.minSF.length; i++) {
      const sf = raw.minSF[i];
      const nodeId = raw.nodeIds[i];
      const px = raw.x[i];
      const py = raw.y[i];
      const pz = raw.z[i];
      if (
        sf === undefined ||
        nodeId === undefined ||
        px === undefined ||
        py === undefined ||
        pz === undefined
      ) {
        continue;
      }
      const bucket = sf <= sfThreshold ? critical : background;
      bucket.nodeIds.push(nodeId);
      bucket.x.push(px);
      bucket.y.push(py);
      bucket.z.push(pz);
      bucket.minSF.push(sf);
    }

    return {
      hdCriticalData: {
        component: raw.component,
        totalMatchedNodes: critical.nodeIds.length,
        ...critical,
      },
      hdBackgroundData: {
        component: raw.component,
        totalMatchedNodes: background.nodeIds.length,
        ...background,
      },
    };
  }, [hdCache, component, sfThreshold]);

  // Current component's total point count (for display)
  const currentTotalPoints = data?.haighPointsByComponent[component]?.totalPoints ?? 0;
  const currentPointCount = currentHaighData?.points.length ?? 0;
  const current3DPointCount =
    hdMode && hdCriticalData
     
      ? hdCriticalData.totalMatchedNodes
     
      : ((filtered3DData?.worstNodes.length ?? 0));

  const standardAssessment = useMemo(() => {
    if (!data || !material) {
      return null;
    }

    const overallWorstSF = Math.min(
      data.minSafetyFactors.VON.minSF,
      data.minSafetyFactors.P1.minSF,
      data.minSafetyFactors.P2.minSF,
      data.minSafetyFactors.P3.minSF,
    );

    const representativeStressRange = createStressRange(
      Math.max(material.enduranceLimit / overallWorstSF, 1),
    );

    if (selectedStandard === 'API 579-1') {
      const screening = api579Level1Screening({
        stressRange: representativeStressRange,
        cycles: 1_000_000,
        allowableCycles: 2_000_000,
        limit: 1,
      });

      if (!screening.ok) {
        return {
          title: 'API 579-1',
          status: 'Invalid inputs',
          classLabel: 'Screening',
          detail: screening.error,
        };
      }

      return {
        title: 'API 579-1',
        status: screening.value.acceptable ? 'Pass' : 'Review',
        classLabel: 'Screening',
        detail: `Usage factor ${screening.value.usageFactor.toFixed(3)} against limit ${screening.value.limit.toFixed(3)} at ${representativeStressRange.toFixed(1)} MPa`,
      };
    }

    if (selectedStandard === 'FKM prototype') {
      const criticalNode = Object.values(data.minSafetyFactors).reduce((worst, current) =>
        current.minSF < worst.minSF ? current : worst,
      );
      const assessment = evaluateFkmPrototype({
        meanStress: criticalNode.meanStress,
        stressAmplitude: criticalNode.alternatingStress,
        ultimateStrength: material.ultimateStrength,
        fatigueStrengthAtReferenceCycles: material.enduranceLimit,
        targetCycles: fkmTargetCycles,
      });

      if (!assessment.ok) {
        return {
          title: 'FKM prototype (not FKM-compliant)',
          status: 'Invalid inputs',
          classLabel: 'Nominal stress prototype',
          detail: assessment.error,
        };
      }

      return {
        title: 'FKM prototype (not FKM-compliant)',
        status: assessment.value.acceptable ? 'Pass' : 'Review',
        classLabel: 'Nominal stress prototype',
        detail: `Exploratory Goodman and single-slope S-N estimate: utilization ${assessment.value.utilization.toFixed(3)} at ${fkmTargetCycles.toLocaleString()} cycles. This is not an FKM guideline assessment.`,
      };
    }

    if (!selectedStandardDef.createCurve) {
      return {
        title: selectedStandard,
        status: 'Unsupported method',
        classLabel: `${selectedStandardClass}`,
        detail: 'No S-N curve method is configured for this selection.',
      };
    }

    const curveResult = selectedStandardDef.createCurve(selectedStandardClass);

    if (!curveResult.ok) {
      return {
        title: selectedStandard,
        status: 'Unsupported class',
        classLabel: `${selectedStandardClass}`,
        detail: curveResult.error,
      };
    }

    const lifeResult = evaluateCyclesToFailure(curveResult.value, representativeStressRange, {
      safetyFactor: 1,
    });

    if (!lifeResult.ok) {
      return {
        title: selectedStandard,
        status: 'Evaluation failed',
        classLabel: `${selectedStandardClass}`,
        detail: lifeResult.error,
      };
    }

    const lifeCycles = Number(lifeResult.value);
    const isInfinite = !Number.isFinite(lifeCycles);

    return {
      title: selectedStandard,
      status: isInfinite || lifeCycles >= 1_000_000 ? 'Pass' : 'Review',
      classLabel: `${selectedStandardClass}`,
      detail: `${isInfinite ? 'Infinite life' : `${lifeCycles.toLocaleString()} cycles`} at ${representativeStressRange.toFixed(1)} MPa. Worst SF = ${overallWorstSF.toFixed(2)}.`,
    };
  }, [
    data,
    fkmTargetCycles,
    material,
    selectedStandard,
    selectedStandardClass,
    selectedStandardDef,
  ]);

  // -- Handlers ---------------------------------------------------------------

  /**
   * Fetches the full-detail ("HD") 3D dataset for one stress component —
   * every matched node, color-coded by safety factor. Cached client-side
   * per component so re-toggling or switching back doesn't re-fetch.
   */
  const fetchHDData = useCallback(async (comp: StressComponent) => {
    setHdLoading(true);
    setHdError(null);

    try {
      const response = await fetch(`/api/visualization3d-full?component=${comp}`);

      if (!response.ok) {
        const body = (await response.json()) as { error?: string; details?: string };
        throw new Error(body.details ?? body.error ?? `HTTP ${response.status}`);
      }

      const result = (await response.json()) as Visualization3DFullData;
      setHdCache((prev) => ({ ...prev, [comp]: result }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setHdError(message);
      setHdMode(false);
    } finally {
      setHdLoading(false);
    }
  }, []);

  /** Toggles HD / Detail mode, fetching the dataset for the current component if needed. */
  const handleToggleHD = useCallback(() => {
    setHdMode((prev) => {
      const next = !prev;
      if (next && !hdCache[component]) {
        void fetchHDData(component);
      }
      return next;
    });
  }, [hdCache, component, fetchHDData]);

  // While HD mode is on, fetch the dataset whenever the user switches to a
  // component that hasn't been loaded yet.
  useEffect(() => {
    if (hdMode && data?.visualization3D && !hdCache[component] && !hdLoading) {
      void fetchHDData(component);
    }
  }, [hdMode, component, hdCache, data, hdLoading, fetchHDData]);

  /** Clears HD mode/cache — called whenever a fresh analysis result is loaded. */
  const resetHDState = useCallback(() => {
    setHdMode(false);
    setHdCache({});
    setHdError(null);
  }, []);

  const handleRunAnalysis = useCallback(async () => {
    if (!material || !files) return;

    setStep('loading');
    setError(null);

    try {
      const formData = new FormData();
      formData.append('baseFile', files.base);
      formData.append('loadFile', files.load);
      formData.append('material', JSON.stringify(material));
      if (files.coordinates) {
        formData.append('coordinatesFile', files.coordinates);
      }

      const response = await fetch('/api/analyze-upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string; details?: string };
        throw new Error(body.details ?? body.error ?? `HTTP ${response.status}`);
      }

      const result = (await response.json()) as AnalysisData;
      setData(result);
      setRecomputeMaterial(material);
      setStep('results');
      resetHDState();

      // Save to server-side history
      const historyId = generateAnalysisId();
      await saveToHistory({
        id: historyId,
        name: `Analysis — ${material.name}`,
        createdAt: new Date().toISOString(),
        material,
        baseFileName: files.base.name,
        loadFileName: files.load.name,
        nodeCount: result.nodeCount,
        computeTimeSeconds: result.computeTimeSeconds,
        minSafetyFactors: result.minSafetyFactors,
        analysisData: result,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setStep('configure');
    }
  }, [material, files]);

  /**
   * Load reference example from the server (pre-computed dataset).
   * Sets the material to the default steel properties.
   */
  const handleLoadReference = useCallback(async () => {
    setStep('loading');
    setError(null);

    try {
      const response = await fetch('/api/analyze');

      if (!response.ok) {
        const body = (await response.json()) as { error?: string; details?: string };
        throw new Error(body.details ?? body.error ?? `HTTP ${response.status}`);
      }

      const result = (await response.json()) as AnalysisData;
      setMaterial(REFERENCE_MATERIAL);
      setRecomputeMaterial(REFERENCE_MATERIAL);
      setData(result);
      setStep('results');
      resetHDState();

      // Save to server-side history
      const historyId = generateAnalysisId();
      await saveToHistory({
        id: historyId,
        name: 'Reference Example — Lower Control Arm',
        createdAt: new Date().toISOString(),
        material: REFERENCE_MATERIAL,
        baseFileName: 'Base_Case.csv',
        loadFileName: 'Running_Ex_CD.csv',
        nodeCount: result.nodeCount,
        computeTimeSeconds: result.computeTimeSeconds,
        minSafetyFactors: result.minSafetyFactors,
        analysisData: result,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setStep('configure');
    }
  }, []);

  // Auto-load the demo results when arriving via `/analysis?demo=true`
  // (the home page's "Run Demo & See Results" button) — skips the configure
  // step entirely instead of requiring a second click on this page. Guarded
  // by a ref so it only fires once per page load, even if the user later
  // clicks "New Analysis" and `step` resets to 'configure'.
  const demoAutoLoadTriggered = useRef(false);
  useEffect(() => {
    if (demoAutoLoadTriggered.current) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get('demo') === 'true') {
      demoAutoLoadTriggered.current = true;
      void handleLoadReference();
    }
  }, [handleLoadReference]);

  /**
   * Load a past analysis from server-side history.
   */
  const handleLoadHistory = useCallback(async (entry: AnalysisHistoryEntry) => {
    const savedData = await fetchAnalysisData(entry.id);
    if (savedData) {
      setMaterial(entry.material);
      setRecomputeMaterial(entry.material);
      setData(savedData as AnalysisData);
      setStep('results');
      resetHDState();
    }
  }, []);

  const handleNewAnalysis = () => {
    setStep('configure');
    setData(null);
    setError(null);
    setFiles(null);
    setMaterial(null);
    setRecomputeMaterial(null);
    resetHDState();
  };

  /** Switch component instantly — all data is pre-computed. */
  const handleComponentChange = (comp: StressComponent) => {
    setComponent(comp);
  };

  /**
   * Recompute analysis with a new material using the cached parsed data.
   */
  const handleRecompute = useCallback(async () => {
    if (!recomputeMaterial) return;

    setIsRecomputing(true);
    setError(null);

    try {
      const response = await fetch('/api/recompute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material: {
            ultimateStrength: recomputeMaterial.ultimateStrength,
            yieldStrength: recomputeMaterial.yieldStrength,
            enduranceLimit: recomputeMaterial.enduranceLimit,
          },
        }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string; details?: string };
        throw new Error(body.details ?? body.error ?? `HTTP ${response.status}`);
      }

      const result = (await response.json()) as AnalysisData;
      setMaterial(recomputeMaterial);
      setData(result);
      resetHDState();

      // Save recomputed result as new history entry
      const historyId = generateAnalysisId();
      await saveToHistory({
        id: historyId,
        name: `Analysis — ${recomputeMaterial.name}`,
        createdAt: new Date().toISOString(),
        material: recomputeMaterial,
        baseFileName: 'recomputed',
        loadFileName: 'recomputed',
        nodeCount: result.nodeCount,
        computeTimeSeconds: result.computeTimeSeconds,
        minSafetyFactors: result.minSafetyFactors,
        analysisData: result,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsRecomputing(false);
    }
  }, [recomputeMaterial]);

  // -- Render -----------------------------------------------------------------

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Fatigue Analysis</h1>
          <p className="mt-2 text-sm text-gray-600">
            Upload FEM data from SolidWorks Simulation, select a material, and run
            Goodman/Gerber/Soderberg analysis.
          </p>
        </div>
        {step === 'results' && (
          <button
            onClick={handleNewAnalysis}
            className="rounded-md bg-fatigue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-fatigue-500"
          >
            New Analysis
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Step 1: Configure */}
          {step === 'configure' && (
            <>
              {/* SolidWorks Export Instructions */}
              <div className="rounded-lg border border-fatigue-100 bg-gradient-to-br from-fatigue-50 to-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <svg
                    className="h-5 w-5 text-fatigue-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
                    />
                  </svg>
                  <h3 className="text-sm font-semibold text-gray-700">
                    How to Export CSVs from SolidWorks Simulation
                  </h3>
                </div>
                <ol className="mt-3 space-y-1.5 text-xs text-gray-500">
                  <li>
                    1. Run a <strong>Static Study</strong> → right-click <strong>Results</strong> →{' '}
                    <strong>List Stress</strong>
                  </li>
                  <li>
                    2. Select stress components (VON, P1, P2, P3) for each node → click{' '}
                    <strong>Save</strong> as CSV
                  </li>
                  <li>3. Apply loading-case boundary conditions, re-run, export second CSV</li>
                  <li>
                    4. (Optional) <strong>List Displacement</strong> → Save as CSV for 3D
                    visualization
                  </li>
                </ol>
                <p className="mt-2 text-xs text-gray-400">
                  Supported CAD tools: <strong>SolidWorks Simulation</strong> ✅ &nbsp;|&nbsp;
                  ANSYS, Abaqus, Nastran, SimScale — <em>coming soon</em>
                </p>
              </div>

              {/* File Upload */}
              <FileUpload files={files} onFilesSelected={setFiles} />

              {/* Material Selector */}
              <MaterialSelector value={material} onChange={setMaterial} />

              {/* Run Analysis Button */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => void handleRunAnalysis()}
                  disabled={!canAnalyze}
                  className={`rounded-md px-6 py-3 text-sm font-semibold shadow-sm transition-colors ${
                    canAnalyze
                      ? 'bg-fatigue-600 text-white hover:bg-fatigue-500'
                      : 'cursor-not-allowed bg-gray-300 text-gray-500'
                  }`}
                >
                  Run Fatigue Analysis
                </button>
                {!canAnalyze && (
                  <span className="text-xs text-gray-400">
                    {!files ? 'Upload CSV files' : 'Select a material'} to continue
                  </span>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </>
          )}

          {/* Loading State */}
          {step === 'loading' && (
            <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-white py-24 shadow-sm">
              <div className="text-center">
                <LoadingSpinner />
                <p className="mt-4 text-sm text-gray-600">
                  Parsing CSV files and computing safety factors…
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  This may take 10–60 seconds depending on file size.
                </p>
              </div>
            </div>
          )}

          {/* Results */}
          {step === 'results' && data && (
            <div className="space-y-6">
              {/* Stress Component Selector */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Stress Component
                </label>
                <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
                  {(['VON', 'P1', 'P2', 'P3'] as const).map((comp) => (
                    <button
                      key={comp}
                      onClick={() => handleComponentChange(comp)}
                      className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                        component === comp
                          ? 'bg-fatigue-600 text-white shadow-sm'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {comp}
                    </button>
                  ))}
                </div>
                <span className="ml-3 text-xs text-gray-400">
                  Showing {currentPointCount.toLocaleString()} of{' '}
                  {currentTotalPoints.toLocaleString()} pre-computed points
                </span>
              </div>

              {/* Safety Factor Threshold Slider */}
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-4">
                  <label
                    htmlFor="sf-threshold"
                    className="text-sm font-medium text-gray-700 whitespace-nowrap"
                  >
                    Max Safety Factor
                  </label>
                  <input
                    id="sf-threshold"
                    type="range"
                    min={0.5}
                    max={10}
                    step={0.1}
                    value={sfThreshold}
                    onChange={(e) => setSfThreshold(parseFloat(e.target.value))}
                    className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-gray-200 accent-fatigue-600"
                  />
                  <span className="min-w-[3rem] text-right text-sm font-semibold text-fatigue-600">
                    {sfThreshold.toFixed(1)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  Filter nodes with SF ≤ {sfThreshold.toFixed(1)}: showing{' '}
                  {currentPointCount.toLocaleString()} Haigh points ·{' '}
                  {current3DPointCount.toLocaleString()} 3D nodes
                </p>
              </div>

              <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Standard Assessment</h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={selectedStandard}
                      onChange={(event) => setSelectedStandard(event.target.value as StandardKey)}
                      className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-fatigue-500 focus:outline-none"
                    >
                      {STANDARD_OPTIONS.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {selectedStandard !== 'API 579-1' && selectedStandard !== 'FKM prototype' && (
                      <select
                        value={selectedStandardClass}
                        onChange={(event) => setSelectedStandardClass(Number(event.target.value))}
                        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-fatigue-500 focus:outline-none"
                      >
                        {selectedStandardDef.getClasses().map((classValue) => (
                          <option key={classValue} value={classValue}>
                            FAT {classValue}
                          </option>
                        ))}
                      </select>
                    )}
                    {selectedStandard === 'FKM prototype' && (
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        Target cycles
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={fkmTargetCycles}
                          onChange={(event) => setFkmTargetCycles(Number(event.target.value))}
                          className="w-32 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-fatigue-500 focus:outline-none"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {standardAssessment ? (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Standard
                      </div>
                      <div className="mt-1 text-sm font-semibold text-gray-900">
                        {standardAssessment.title}
                      </div>
                    </div>
                    <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Class
                      </div>
                      <div className="mt-1 text-sm font-semibold text-gray-900">
                        {standardAssessment.classLabel}
                      </div>
                    </div>
                    <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Status
                      </div>
                      <div className="mt-1 text-sm font-semibold text-gray-900">
                        {standardAssessment.status}
                      </div>
                    </div>
                  </div>
                ) : null}

                <p className="mt-3 text-sm text-gray-600">
                  {standardAssessment?.detail ??
                    'Select a standard to evaluate the current worst-case stress range against the active code curve.'}
                </p>
              </section>

              {/* Haigh Diagram */}
              {currentHaighData && (
                <section>
                  <h2 className="mb-4 text-lg font-semibold text-gray-900">Haigh Diagram</h2>
                  <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                    <HaighDiagram data={currentHaighData} component={component} />
                  </div>
                </section>
              )}

              {/* 3D Safety Factor Visualization */}
              {data.visualization3D && (
                <section>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold text-gray-900">3D Safety Factor Map</h2>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleToggleHD}
                        disabled={hdLoading}
                        title="Load and render every matched node (500K+), color-coded by safety factor. Slower to fetch and render than the default view."
                        className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                          hdMode
                            ? 'bg-fatigue-600 text-white hover:bg-fatigue-500'
                            : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {hdLoading ? (
                          <>
                            <svg
                              className="h-3.5 w-3.5 animate-spin"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                              />
                            </svg>
                            Loading…
                          </>
                        ) : (
                          <>{hdMode ? '✓ HD / Detail' : 'HD / Detail Mode'}</>
                        )}
                      </button>
                    </div>
                  </div>
                  {hdError && (
                    <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      Could not load HD dataset: {hdError}
                    </p>
                  )}
                  {hdMode && (
                    <p className="mb-3 text-xs text-amber-600">
                      HD / Detail mode renders every matched node (
                      {data.visualization3D.matchedNodeCount.toLocaleString()} total) instead of the
                      default worst-10K + sampled-background view. Fetching and rotating may be
                      noticeably slower, especially on lower-end devices.
                    </p>
                  )}
                  <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                    <Scatter3DChart
                      data={filtered3DData ?? data.visualization3D.worstByComponent[component]}
                      bounds={data.visualization3D.bounds}
                      component={component}
                      matchedNodeCount={data.visualization3D.matchedNodeCount}
                      backgroundCoordinates={data.visualization3D.backgroundCoordinates}
                      hdMode={hdMode}
                      hdData={hdMode ? hdCriticalData : null}
                      hdBackgroundData={hdMode ? hdBackgroundData : null}
                      hdLoading={hdMode && hdLoading}
                    />
                  </div>
                </section>
              )}

              {/* Safety Factor Table */}
              <section>
                <h2 className="mb-4 text-lg font-semibold text-gray-900">
                  Safety Factor Summary (Critical Nodes)
                </h2>
                <SafetyFactorTable minSafetyFactors={data.minSafetyFactors} />
              </section>

              {/* Summary Card */}
              <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
                  Analysis Summary
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                  <PropertyBadge label="Material" value={material?.name ?? 'Unknown'} />
                  <PropertyBadge label="Nodes Analyzed" value={data.nodeCount.toLocaleString()} />
                  <PropertyBadge label="Compute Time" value={`${data.computeTimeSeconds}s`} />
                  <PropertyBadge
                    label="Worst Min SF"
                    value={Math.min(
                      data.minSafetyFactors.VON.minSF,
                      data.minSafetyFactors.P1.minSF,
                      data.minSafetyFactors.P2.minSF,
                      data.minSafetyFactors.P3.minSF,
                    ).toFixed(3)}
                  />
                </div>
                <div className="mt-3 flex gap-4 text-xs text-gray-500">
                  <span>σu = {data.material.ultimateStrength} MPa</span>
                  <span>σy = {data.material.yieldStrength} MPa</span>
                  <span>σe = {data.material.enduranceLimit} MPa</span>
                </div>
              </div>

              {/* Material Change Card */}
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <svg
                    className="h-5 w-5 text-blue-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
                    />
                  </svg>
                  <h3 className="text-sm font-semibold text-gray-700">
                    Change Material & Recompute
                  </h3>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  Select a different material to instantly recompute safety factors without
                  re-uploading files.
                </p>
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <MaterialSelector value={recomputeMaterial} onChange={setRecomputeMaterial} />
                  </div>
                  <button
                    onClick={() => void handleRecompute()}
                    disabled={isRecomputing || !recomputeMaterial}
                    className={`rounded-md px-5 py-2.5 text-sm font-semibold shadow-sm transition-colors whitespace-nowrap ${
                      isRecomputing
                        ? 'cursor-not-allowed bg-gray-300 text-gray-500'
                        : 'bg-blue-600 text-white hover:bg-blue-500'
                    }`}
                  >
                    {isRecomputing ? 'Recomputing…' : 'Update Analysis'}
                  </button>
                </div>
                {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Analysis History */}
        <div className="lg:col-span-1">
          <AnalysisHistory
            onLoad={handleLoadHistory}
            disabled={step === 'loading' || isRecomputing}
          />
        </div>
      </div>
    </main>
  );
}

// -- Sub-components -----------------------------------------------------------

function PropertyBadge({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}): JSX.Element {
  return (
    <div className="rounded-md bg-gray-50 px-4 py-3">
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-lg font-semibold text-gray-900">{value}</dd>
    </div>
  );
}

function LoadingSpinner(): JSX.Element {
  return (
    <svg
      className="mx-auto h-10 w-10 animate-spin text-fatigue-600"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
