/**
 * Fatigue Analysis Page — Configure, Run, and View Results.
 *
 * Three-step workflow:
 * 1. Configure: Select material and upload CSV files (+ optional coordinates)
 *    — Or click "Load Reference Example" to skip straight to pre-computed results
 * 2. Analyze: Run the fatigue analysis
 * 3. Results: View Haigh diagram, safety factors, and optional 3D visualization
 *    — Change material and recompute without re-uploading files
 *
 * The API pre-computes Haigh diagram data for ALL four stress components
 * (VON, P1, P2, P3) in a single request. Switching components is instant
 * — no re-fetch required.
 *
 * When a coordinates file is uploaded, the API also returns 3D visualization
 * data showing the spatial distribution of safety factors.
 *
 * Includes analysis history sidebar for reloading past analyses (server-side
 * persistence via `/api/analyses`).
 *
 * @module app/analysis/page
 */

'use client';

import { useCallback, useMemo, useState } from 'react';

import type {
  HaighDiagramData,
  HaighLinePoint,
  HaighPoint,
  NodeSafetyFactors,
  StressComponent,
  Visualization3DData,
} from '@fatigue/types';

import type { MaterialConfig, AnalysisHistoryEntry } from '@/lib/analysis-store';
import {
  saveToHistory,
  fetchAnalysisData,
  generateAnalysisId,
} from '@/lib/analysis-store';

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

  // Material recomputation state
  const [recomputeMaterial, setRecomputeMaterial] = useState<MaterialConfig | null>(null);
  const [isRecomputing, setIsRecomputing] = useState(false);

  // Derived: can we run the analysis?
  const canAnalyze = material !== null && files !== null;

  // Reconstruct HaighDiagramData for the currently selected component,
  // filtered by the SF threshold slider
  const currentHaighData: HaighDiagramData | null = useMemo(() => {
    if (!data) return null;
    const compData = data.haighPointsByComponent[component];
    if (!compData) return null;
    const filteredPoints = compData.points.filter(
      (p) => p.goodmanSF <= sfThreshold,
    );
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
    const filteredNodes = compData.worstNodes.filter(
      (n) => n.minSF <= sfThreshold,
    );
    return {
      worstNodes: filteredNodes,
      totalMatchedNodes: compData.totalMatchedNodes,
    };
  }, [data, component, sfThreshold]);

  // Current component's total point count (for display)
  const currentTotalPoints = data?.haighPointsByComponent[component]?.totalPoints ?? 0;
  const currentPointCount = currentHaighData?.points.length ?? 0;
  const current3DPointCount = filtered3DData?.worstNodes.length ?? 0;

  // -- Handlers ---------------------------------------------------------------

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
    }
  }, []);

  const handleNewAnalysis = () => {
    setStep('configure');
    setData(null);
    setError(null);
    setFiles(null);
    setMaterial(null);
    setRecomputeMaterial(null);
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
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Fatigue Analysis
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Upload FEM data from SolidWorks Simulation, select a material, and run
            Goodman/Gerber/Soderberg analysis. Or try the pre-computed reference example.
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
                  <svg className="h-5 w-5 text-fatigue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                  </svg>
                  <h3 className="text-sm font-semibold text-gray-700">
                    How to Export CSVs from SolidWorks Simulation
                  </h3>
                </div>
                <ol className="mt-3 space-y-1.5 text-xs text-gray-500">
                  <li>1. Run a <strong>Static Study</strong> → right-click <strong>Results</strong> → <strong>List Stress</strong></li>
                  <li>2. Select stress components (VON, P1, P2, P3) for each node → click <strong>Save</strong> as CSV</li>
                  <li>3. Apply loading-case boundary conditions, re-run, export second CSV</li>
                  <li>4. (Optional) <strong>List Displacement</strong> → Save as CSV for 3D visualization</li>
                </ol>
                <p className="mt-2 text-xs text-gray-400">
                  Supported CAD tools: <strong>SolidWorks Simulation</strong> ✅ &nbsp;|&nbsp; ANSYS, Abaqus, Nastran, SimScale — <em>coming soon</em>
                </p>
              </div>

              {/* File Upload */}
              <FileUpload
                files={files}
                onFilesSelected={setFiles}
              />

              {/* Material Selector */}
              <MaterialSelector
                value={material}
                onChange={setMaterial}
              />

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

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-gray-50 px-2 text-gray-400">or</span>
                </div>
              </div>

              {/* Reference Example Button */}
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-600">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Try the Reference Example
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-gray-600">
                      Load a pre-computed analysis of a real automotive lower control arm FEM model
                      (931,978 nodes) with steel material properties. No files needed.
                    </p>
                    <button
                      onClick={() => void handleLoadReference()}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-amber-500"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                      </svg>
                      Load Reference Example
                    </button>
                  </div>
                </div>
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
              {/* Material Change Card */}
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                  </svg>
                  <h3 className="text-sm font-semibold text-gray-700">
                    Change Material & Recompute
                  </h3>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  Select a different material to instantly recompute safety factors without re-uploading files.
                </p>
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <MaterialSelector
                      value={recomputeMaterial}
                      onChange={setRecomputeMaterial}
                    />
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
                {error && (
                  <p className="mt-2 text-xs text-red-600">{error}</p>
                )}
              </div>

              {/* Summary Card */}
              <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
                  Analysis Summary
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                  <PropertyBadge
                    label="Material"
                    value={material?.name ?? 'Unknown'}
                  />
                  <PropertyBadge
                    label="Nodes Analyzed"
                    value={data.nodeCount.toLocaleString()}
                  />
                  <PropertyBadge
                    label="Compute Time"
                    value={`${data.computeTimeSeconds}s`}
                  />
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
                  <h2 className="mb-4 text-lg font-semibold text-gray-900">
                    3D Safety Factor Map
                  </h2>
                  <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                    <Scatter3DChart
                      data={filtered3DData ?? data.visualization3D.worstByComponent[component]}
                      bounds={data.visualization3D.bounds}
                      component={component}
                      matchedNodeCount={data.visualization3D.matchedNodeCount}
                      backgroundCoordinates={data.visualization3D.backgroundCoordinates}
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
            </div>
          )}
        </div>

        {/* Sidebar: Analysis History */}
        <div className="lg:col-span-1">
          <AnalysisHistory onLoad={handleLoadHistory} disabled={step === 'loading' || isRecomputing} />
        </div>
      </div>
    </main>
  );
}

// -- Sub-components -----------------------------------------------------------

function PropertyBadge({ label, value }: { readonly label: string; readonly value: string }): JSX.Element {
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
