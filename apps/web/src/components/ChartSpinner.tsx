/**
 * Reusable loading spinner for chart components.
 *
 * Two display modes:
 * - `overlay` (default false): takes up its own vertical space — used as the
 *   `next/dynamic` `loading` fallback while the Plotly.js chunk itself is
 *   being downloaded (first mount only, since Next.js caches the chunk).
 * - `overlay=true`: absolutely positioned on top of existing content with a
 *   translucent backdrop — used while a chart's data is being drawn/redrawn
 *   (e.g. after switching stress components or changing the SF threshold),
 *   so large point clouds don't appear to freeze the page.
 *
 * @module components/ChartSpinner
 */

'use client';

interface ChartSpinnerProps {
  /** Message shown under the spinner. */
  readonly label?: string;
  /** Render as an absolute-positioned overlay instead of inline content. */
  readonly overlay?: boolean;
}

export default function ChartSpinner({
  label = 'Rendering chart…',
  overlay = false,
}: ChartSpinnerProps) {
  return (
    <div
      className={
        overlay
          ? 'absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/70 backdrop-blur-[1px]'
          : 'flex flex-col items-center justify-center gap-3 py-24'
      }
    >
      <svg className="h-8 w-8 animate-spin text-fatigue-600" fill="none" viewBox="0 0 24 24">
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
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}
