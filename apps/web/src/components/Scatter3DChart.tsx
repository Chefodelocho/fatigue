/**
 * 3D Scatter Plot component for visualizing FEM node safety factors.
 *
 * Renders a Plotly.js 3D scatter plot where each point represents a FEM node
 * positioned at its (X, Y, Z) coordinates and color-coded by its minimum
 * safety factor. Red indicates critical nodes (SF ≈ 1), green indicates safe
 * nodes (SF >> 1).
 *
 * A transparent background trace shows a uniform sample of all matched nodes
 * to provide spatial context for the critical points.
 *
 * Y is the vertical axis (swapped from the file's coordinate convention).
 *
 * Uses dynamic import for Plotly.js since it requires browser APIs (WebGL).
 *
 * @module components/Scatter3DChart
 */

'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';

import type {
  Component3DData,
  BoundingBox3D,
  NodeCoordinates,
  StressComponent,
} from '@fatigue/types';

// Dynamic import — Plotly.js needs browser APIs (no SSR)
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

// -- Types -------------------------------------------------------------------

interface Scatter3DChartProps {
  /** 3D visualization data for the selected component */
  readonly data: Component3DData;
  /** Bounding box for consistent camera framing */
  readonly bounds: BoundingBox3D;
  /** Currently selected stress component */
  readonly component: StressComponent;
  /** Total matched node count (for subtitle) */
  readonly matchedNodeCount: number;
  /** Background coordinates for transparent context trace */
  readonly backgroundCoordinates: readonly NodeCoordinates[];
}

// -- Color Scale Configuration -----------------------------------------------

/**
 * Color scale mapping: red (critical, SF ≈ 1) → yellow → green (safe, SF >> 1).
 *
 * Uses a custom diverging scale so low SF → red.
 */
const COLOR_SCALE = [
  [0, 'rgb(255, 0, 0)'],       // Red — critical
  [0.15, 'rgb(255, 100, 0)'],  // Orange
  [0.3, 'rgb(255, 200, 0)'],   // Yellow
  [0.5, 'rgb(180, 230, 50)'],  // Yellow-green
  [0.7, 'rgb(100, 200, 80)'],  // Light green
  [1, 'rgb(0, 150, 0)'],       // Green — safe
] as const;

// -- Component ---------------------------------------------------------------

/**
 * 3D scatter plot showing the spatial distribution of fatigue safety factors.
 *
 * Features:
 * - WebGL-rendered 3D scatter with up to 10,000 critical points
 * - Transparent background trace with ~20K sampled nodes for spatial context
 * - Color-coded by minimum safety factor (red = critical, green = safe)
 * - Y axis is vertical (swapped from file convention)
 * - Interactive orbit, zoom, and pan controls
 * - Hover tooltips with nodeId, coordinates, and all three SF values
 * - Camera auto-framed to the bounding box of the model
 */
export default function Scatter3DChart({
  data,
  bounds,
  component,
  matchedNodeCount,
  backgroundCoordinates,
}: Scatter3DChartProps) {
  const { worstNodes } = data;

  // Build Plotly data traces
  // Note: Y and Z are swapped so Y (from file) becomes the vertical axis in 3D.
  const traces = useMemo(() => {
    if (worstNodes.length === 0) return [];

    // Background trace — translucid grey for spatial context
    const bgTrace = {
      x: backgroundCoordinates.map((c) => c.x),
      y: backgroundCoordinates.map((c) => c.z),  // Z → Plotly Y (depth)
      z: backgroundCoordinates.map((c) => c.y),  // Y → Plotly Z (vertical)
      mode: 'markers' as const,
      type: 'scatter3d' as const,
      marker: {
        size: 2,
        color: 'rgb(160, 160, 170)',
        opacity: 0.35,
      },
      hoverinfo: 'skip' as const,
      name: 'Background (all nodes)',
      showlegend: true,
    };

    // Critical points trace — color-coded by minSF
    const critTrace = {
      x: worstNodes.map((n) => n.x),
      y: worstNodes.map((n) => n.z),  // Z → Plotly Y (depth)
      z: worstNodes.map((n) => n.y),  // Y → Plotly Z (vertical)
      text: worstNodes.map(
        (n) =>
          `Node ${n.nodeId}<br>` +
          `X: ${n.x.toFixed(1)} mm<br>` +
          `Y: ${n.y.toFixed(1)} mm<br>` +
          `Z: ${n.z.toFixed(1)} mm<br>` +
          `Min SF: ${n.minSF.toFixed(3)}<br>` +
          `Goodman: ${n.goodmanSF.toFixed(3)}<br>` +
          `Gerber: ${n.gerberSF.toFixed(3)}<br>` +
          `Soderberg: ${n.soderbergSF.toFixed(3)}<br>` +
          `σm: ${n.meanStress.toFixed(1)} MPa<br>` +
          `σa: ${n.alternatingStress.toFixed(1)} MPa`,
      ),
      mode: 'markers' as const,
      type: 'scatter3d' as const,
      marker: {
        size: 2.5,
        color: worstNodes.map((n) => n.minSF),
        colorscale: COLOR_SCALE,
        colorbar: {
          title: { text: 'Min SF', font: { size: 12 } },
          thickness: 15,
          len: 0.8,
        },
        showscale: true,
      },
      hoverinfo: 'text' as const,
      name: 'Critical nodes',
      showlegend: true,
    };

    return [bgTrace, critTrace];
  }, [worstNodes, backgroundCoordinates]);

  // Compute axis ranges from bounding box with 5% padding.
  // Y and Z are swapped: file Y → Plotly Z (vertical), file Z → Plotly Y (depth).
  const layout = useMemo(() => {
    const padFactor = 0.05;
    const xRange = bounds.maxX - bounds.minX;
    const yRange = bounds.maxY - bounds.minY;
    const zRange = bounds.maxZ - bounds.minZ;

    return {
      title: {
        text: `3D Safety Factor Map — ${component}`,
        font: { size: 14 },
      },
      scene: {
        xaxis: {
          title: { text: 'X (mm)' },
          range: [
            bounds.minX - xRange * padFactor,
            bounds.maxX + xRange * padFactor,
          ],
        },
        yaxis: {
          title: { text: 'Z (mm)' },
          range: [
            bounds.minZ - zRange * padFactor,
            bounds.maxZ + zRange * padFactor,
          ],
        },
        zaxis: {
          title: { text: 'Y (mm)' },
          range: [
            bounds.minY - yRange * padFactor,
            bounds.maxY + yRange * padFactor,
          ],
        },
        aspectmode: 'data' as const,
        camera: {
          eye: { x: 1.5, y: 1.5, z: 1.5 },
        },
      },
      margin: { l: 0, r: 0, t: 40, b: 0 },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      legend: {
        x: 0.01,
        y: 0.99,
        bgcolor: 'rgba(255, 255, 255, 0.7)',
        font: { size: 10 },
      },
    };
  }, [bounds, component]);

  if (traces.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-gray-500">
        No coordinate data available for visualization.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
        <span>
          Showing {worstNodes.length.toLocaleString()} worst nodes (of{' '}
          {matchedNodeCount.toLocaleString()} matched) by min safety factor ·{' '}
          {backgroundCoordinates.length.toLocaleString()} background nodes
        </span>
        <span>Component: {component}</span>
      </div>
      <Plot
        data={traces}
        layout={layout}
        config={{
          responsive: true,
          displayModeBar: true,
          modeBarButtonsToRemove: ['toImage', 'sendDataToCloud'],
          displaylogo: false,
        }}
        style={{ width: '100%', height: '600px' }}
        useResizeHandler
      />
      <p className="mt-2 text-xs text-gray-400">
        Drag to rotate · Scroll to zoom · Click + drag to pan · Hover critical points for details · Y = vertical axis
      </p>
    </div>
  );
}
