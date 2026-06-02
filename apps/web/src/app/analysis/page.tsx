/**
 * Fatigue Analysis Page — Configure, Run, and View Results.
 *
 * Three-step workflow:
 * 1. Configure: Select material and upload CSV files (+ optional coordinates)
 * 2. Analyze: Run the fatigue analysis
 * 3. Results: View Haigh diagram, safety factors, and optional 3D visualization
 *
 * The API pre-computes Haigh diagram data for ALL four stress components
 * (VON, P1, P2, P3) in a single request. Switching components is instant
 * — no re-fetch required.
 *
 * When a coordinates file is uploaded, the API also returns 3D visualization
 * data showing the spatial distribution of safety factors.
 *
 * Includes analysis history sidebar for reloading past analyses.
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
  loadAnalysisData,
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

// -- Component ----------------------------------------------------------------

export default function AnalysisPage() {
  // Configuration state
  const [material, setMaterial] = useState<MaterialConfig | null>(null);
  const [files, setFiles] = useState<UploadedFiles | null>(null);
  const [component, setComponent] = useState<StressComponent>('VON');
  const [sfThreshold, setSfThreshold] = useState<number>(10);

  // Analysis state
  const [step, setStep] = useState<PageStep>('configure');
  const [data, setData] = useState<AnalysisData | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      setStep('results');

      // Save to history
      const historyId = generateAnalysisId();
      saveToHistory({
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

  const handleLoadHistory = useCallback(async (entry: AnalysisHistoryEntry) => {
    const savedData = loadAnalysisData(entry.id);
    if (savedData) {
      setData(savedData as AnalysisData);
      setStep('results');
    }
  }, []);

  const handleNewAnalysis = () => {
    setStep('configure');
    setData(null);
    setError(null);
  };

  /** Switch component instantly — all data is pre-computed. */
  const handleComponentChange = (comp: StressComponent) => {
    setComponent(comp);
  };

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
            Upload FEM data, select material, and run Goodman/Gerber/Soderberg analysis.
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
          <AnalysisHistory onLoad={handleLoadHistory} disabled={step === 'loading'} />
        </div>
      </div>
    </main>
  );
}

// -- Sub-components -----------------------------------------------------------

function PropertyBadge({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="rounded-md bg-gray-50 px-4 py-3">
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-lg font-semibold text-gray-900">{value}</dd>
    </div>
  );
}

function LoadingSpinner() {
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
