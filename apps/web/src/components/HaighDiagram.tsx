/**
 * Haigh Diagram visualization component using Plotly.js.
 *
 * Renders the Haigh (σm vs σa) diagram with:
 * - Goodman failure line (red)
 * - Gerber parabola (blue)
 * - Soderberg failure line (orange)
 * - Yield boundary (gray dashed)
 * - Node scatter points colored by safety factor
 *
 * Uses dynamic import for Plotly.js to avoid SSR issues.
 *
 * @module components/HaighDiagram
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';

import type { HaighDiagramData, HaighLinePoint, HaighPoint, StressComponent } from '@fatigue/types';

import ChartSpinner from '@/components/ChartSpinner';

// Dynamic import — Plotly.js does not support SSR. The `loading` fallback
// covers the (one-time) download of the Plotly.js chunk itself.
const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false,
  loading: () => <ChartSpinner label="Loading chart engine…" />,
});

// -- Props --------------------------------------------------------------------

interface HaighDiagramProps {
  /** Complete Haigh diagram data (failure lines + scatter points) */
  readonly data: HaighDiagramData;
  /** Currently selected stress component */
  readonly component: StressComponent;
}

// -- Component ----------------------------------------------------------------

/**
 * Haigh diagram interactive chart.
 *
 * Displays the mean stress (σm) vs alternating stress (σa) diagram
 * with failure criterion lines and FEM node operating points.
 */
export default function HaighDiagram({ data, component }: HaighDiagramProps) {
  // Extract line coordinates for Plotly traces
  const goodmanTrace = useMemo(
    () => lineToScatterTrace(data.goodmanLine, 'Goodman', '#ef4444'),
    [data.goodmanLine],
  );

  const gerberTrace = useMemo(
    () => lineToScatterTrace(data.gerberLine, 'Gerber', '#3b82f6'),
    [data.gerberLine],
  );

  const soderbergTrace = useMemo(
    () => lineToScatterTrace(data.soderbergLine, 'Soderberg', '#f97316'),
    [data.soderbergLine],
  );

  const yieldTrace = useMemo(
    () => lineToScatterTrace(data.yieldLine, 'Yield boundary', '#6b7280', true),
    [data.yieldLine],
  );

  const scatterTrace = useMemo(
    () => buildScatterTrace(data.points, component),
    [data.points, component],
  );

  const layout = useMemo(() => buildLayout(component), [component]);

  const traces = [goodmanTrace, gerberTrace, soderbergTrace, yieldTrace, scatterTrace];

  // Tracks whether Plotly is still drawing/redrawing the current dataset, so
  // we can show an overlay spinner instead of letting large point clouds
  // (10k+ nodes) appear to freeze the page while they render.
  const [isRendering, setIsRendering] = useState(true);
  useEffect(() => {
    setIsRendering(true);
  }, [data, component]);

  return (
    <div className="relative w-full" data-testid="haigh-diagram">
      {isRendering && <ChartSpinner overlay label="Rendering Haigh diagram…" />}
      <Plot
        data={traces}
        layout={layout}
        config={{
          responsive: true,
          displayModeBar: true,
          modeBarButtonsToRemove: ['lasso2d', 'autoScale2d'],
          displaylogo: false,
        }}
        onInitialized={() => setIsRendering(false)}
        onUpdate={() => setIsRendering(false)}
        useResizeHandler
        className="w-full"
        style={{ width: '100%', minHeight: '500px' }}
      />
    </div>
  );
}

// -- Trace builders -----------------------------------------------------------

/**
 * Convert a failure/boundary line into a Plotly scatter trace.
 */
function lineToScatterTrace(
  line: readonly HaighLinePoint[],
  name: string,
  color: string,
  dashed = false,
): Plotly.Data {
  return {
    x: line.map((p) => p.mean),
    y: line.map((p) => p.alternating),
    type: 'scatter',
    mode: 'lines',
    name,
    line: {
      color,
      width: 2,
      dash: dashed ? 'dash' : 'solid',
    },
    hovertemplate: `σ<sub>m</sub>: %{x:.1f} MPa<br>σ<sub>a</sub>: %{y:.1f} MPa<extra>${name}</extra>`,
  };
}

/**
 * Build the FEM node scatter trace with color-coded Goodman safety factors.
 *
 * Points are colored by Goodman SF using a traffic-light scale:
 * - Red:    SF < 1.0  (failure)
 * - Amber:  SF 1.0–1.5 (marginal)
 * - Green:  SF > 1.5  (safe)
 *
 * Uses `scattergl` (WebGL) for performant rendering of thousands of points.
 */
function buildScatterTrace(points: readonly HaighPoint[], component: StressComponent): Plotly.Data {
  const x = points.map((p) => p.mean);
  const y = points.map((p) => p.alternating);
  // goodmanSF is guaranteed finite by the server-side selectWorstPoints filter
  const sfValues = points.map((p) => p.goodmanSF);
  const text = points.map(
    (p) =>
      `Node ${p.nodeId}<br>σm = ${p.mean.toFixed(2)} MPa<br>σa = ${p.alternating.toFixed(2)} MPa<br>Goodman SF: ${p.goodmanSF.toFixed(3)}`,
  );

  // Compute min/max for color scale
  const sfMin = Math.min(...sfValues);
  const sfMax = Math.max(...sfValues);

  return {
    x,
    y,
    type: 'scattergl',
    mode: 'markers',
    name: `FEM Nodes (${component}, 10k worst by Goodman SF)`,
    text,
    hovertemplate: '%{text}<extra></extra>',
    marker: {
      size: 4,
      opacity: 0.7,
      color: sfValues,
      cmin: Math.max(0, sfMin),
      cmax: Math.min(sfMax, 5),
      colorscale: [
        [0.0, '#ef4444'], // red — failure (SF < 1)
        [0.2, '#f97316'], // orange — marginal
        [0.4, '#eab308'], // yellow — approaching safe
        [0.6, '#84cc16'], // lime — safe
        [0.8, '#22c55e'], // green — well safe
        [1.0, '#16a34a'], // dark green — very safe
      ],
      colorbar: {
        title: {
          text: 'Goodman SF',
          font: { size: 11 },
        },
        tickfont: { size: 10 },
        thickness: 15,
        len: 0.6,
        y: 0.5,
      },
      showscale: true,
    },
  };
}

/**
 * Build the Plotly layout with engineering-appropriate styling.
 */
function buildLayout(component: StressComponent): Partial<Plotly.Layout> {
  return {
    title: {
      text: `Haigh Diagram — ${component} Stress Component`,
      font: { size: 16, family: 'Inter, system-ui, sans-serif' },
    },
    xaxis: {
      title: {
        text: 'Mean Stress σ<sub>m</sub> (MPa)',
        font: { size: 13 },
      },
      zeroline: true,
      zerolinecolor: '#d1d5db',
      gridcolor: '#f3f4f6',
    },
    yaxis: {
      title: {
        text: 'Alternating Stress σ<sub>a</sub> (MPa)',
        font: { size: 13 },
      },
      zeroline: true,
      zerolinecolor: '#d1d5db',
      gridcolor: '#f3f4f6',
      scaleanchor: 'x',
      scaleratio: 1,
    },
    legend: {
      orientation: 'h',
      y: -0.15,
      x: 0.5,
      xanchor: 'center',
      font: { size: 11 },
    },
    margin: { l: 70, r: 30, t: 50, b: 80 },
    plot_bgcolor: '#ffffff',
    paper_bgcolor: '#ffffff',
    font: {
      family: 'Inter, system-ui, sans-serif',
      color: '#374151',
    },
  };
}
