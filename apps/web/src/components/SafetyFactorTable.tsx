/**
 * Safety Factor summary table component.
 *
 * Displays the minimum safety factor node for each stress component
 * (VON, P1, P2, P3) with Goodman, Gerber, and Soderberg values.
 *
 * Color coding:
 * - Red:    SF < 1.0 (failure)
 * - Yellow: SF < 1.5 (marginal)
 * - Green:  SF ≥ 1.5 (safe)
 *
 * @module components/SafetyFactorTable
 */

'use client';

import type { NodeSafetyFactors, StressComponent } from '@fatigue/types';

// -- Props --------------------------------------------------------------------

interface SafetyFactorTableProps {
  /** Minimum safety factor node for each stress component */
  readonly minSafetyFactors: Record<StressComponent, NodeSafetyFactors>;
}

// -- Constants ----------------------------------------------------------------

const STRESS_COMPONENTS: readonly StressComponent[] = ['VON', 'P1', 'P2', 'P3'] as const;

// -- Helpers ------------------------------------------------------------------

/**
 * Return a Tailwind CSS class based on the safety factor value.
 *
 * - SF < 1.0 → red (failure)
 * - SF < 1.5 → amber (marginal)
 * - SF ≥ 1.5 → green (safe)
 * - NaN/Infinity → gray (no cyclic loading)
 */
function sfCellClass(sf: number): string {
  if (!Number.isFinite(sf) || Number.isNaN(sf)) {
    return 'bg-gray-100 text-gray-500';
  }
  if (sf < 1.0) {
    return 'bg-red-100 text-red-800 font-semibold';
  }
  if (sf < 1.5) {
    return 'bg-amber-100 text-amber-800 font-semibold';
  }
  return 'bg-green-100 text-green-800 font-semibold';
}

/**
 * Format a safety factor for display.
 *
 * - Finite values: 3 decimal places
 * - Infinity: "∞" (no cyclic loading)
 * - NaN: "—"
 */
function formatSF(sf: number): string {
  if (Number.isNaN(sf)) return '—';
  if (!Number.isFinite(sf)) return '∞';
  return sf.toFixed(3);
}

// -- Component ----------------------------------------------------------------

/**
 * Safety factor summary table showing the critical node for each stress component.
 */
export default function SafetyFactorTable({ minSafetyFactors }: SafetyFactorTableProps) {
  return (
    <div
      className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm"
      data-testid="safety-factor-table"
    >
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
            >
              Stress Component
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500"
            >
              Node ID
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500"
            >
              σ<sub>m</sub> (MPa)
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500"
            >
              σ<sub>a</sub> (MPa)
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500"
            >
              Goodman SF
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500"
            >
              Gerber SF
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500"
            >
              Soderberg SF
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500"
            >
              Min SF
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {STRESS_COMPONENTS.map((comp) => {
            const sf = minSafetyFactors[comp];
            return (
              <tr key={comp} className="transition-colors hover:bg-gray-50">
                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                  {comp}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700">
                  {sf.nodeId.toLocaleString()}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700">
                  {sf.meanStress.toFixed(2)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700">
                  {sf.alternatingStress.toFixed(2)}
                </td>
                <td
                  className={`whitespace-nowrap px-4 py-3 text-right text-sm ${sfCellClass(sf.goodmanSF)}`}
                >
                  {formatSF(sf.goodmanSF)}
                </td>
                <td
                  className={`whitespace-nowrap px-4 py-3 text-right text-sm ${sfCellClass(sf.gerberSF)}`}
                >
                  {formatSF(sf.gerberSF)}
                </td>
                <td
                  className={`whitespace-nowrap px-4 py-3 text-right text-sm ${sfCellClass(sf.soderbergSF)}`}
                >
                  {formatSF(sf.soderbergSF)}
                </td>
                <td
                  className={`whitespace-nowrap px-4 py-3 text-right text-sm ${sfCellClass(sf.minSF)}`}
                >
                  {formatSF(sf.minSF)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Legend */}
      <div className="flex items-center gap-6 border-t border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600">
        <span className="font-medium">Legend:</span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-red-100 ring-1 ring-red-300" />
          {'SF < 1.0 (Failure)'}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-amber-100 ring-1 ring-amber-300" />
          {'SF < 1.5 (Marginal)'}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-green-100 ring-1 ring-green-300" />
          SF ≥ 1.5 (Safe)
        </span>
      </div>
    </div>
  );
}
