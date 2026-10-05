import Link from 'next/link';

import DemoScreenshot from '@/components/DemoScreenshot';

export default function Home() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Fatigue Analysis Tool
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600">
          A modern, web-based platform for performing fatigue life assessments using
          industry-standard methodologies. Analyze FEM stress data with Goodman, Gerber, and
          Soderberg mean stress correction criteria.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link
            href="/analysis"
            className="rounded-md bg-fatigue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-fatigue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fatigue-600"
          >
            Run Analysis
          </Link>
          <Link
            href="/quickstart"
            className="rounded-md border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Quick Start
          </Link>
          <a
            href="https://github.com"
            className="text-sm font-semibold leading-6 text-gray-900"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>

      {/* Reference Example Section */}
      <div className="mx-auto mt-16 max-w-4xl">
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-100 text-amber-600">
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Try the Demo</h2>
              <p className="text-sm text-gray-500">
                Explore a pre-computed analysis of a real automotive lower control arm FEM model
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-gray-50 p-4 text-center">
              <dt className="text-xs font-medium text-gray-500">Nodes Analyzed</dt>
              <dd className="mt-1 text-2xl font-bold text-gray-900">931,978</dd>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 text-center">
              <dt className="text-xs font-medium text-gray-500">Stress Components</dt>
              <dd className="mt-1 text-2xl font-bold text-gray-900">4</dd>
              <dd className="text-xs text-gray-400">VON · P1 · P2 · P3</dd>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 text-center">
              <dt className="text-xs font-medium text-gray-500">Correction Methods</dt>
              <dd className="mt-1 text-2xl font-bold text-gray-900">3</dd>
              <dd className="text-xs text-gray-400">Goodman · Gerber · Soderberg</dd>
            </div>
          </div>

          <div className="mt-6">
            <Link
              href="/analysis?demo=true"
              className="inline-flex items-center gap-2 rounded-md bg-fatigue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-fatigue-500"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"
                />
              </svg>
              Run Demo & See Results
            </Link>
          </div>
          <div className="mt-8 border-t border-gray-100 pt-8">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">See It In Action</h3>
              <p className="mx-auto mt-2 max-w-2xl text-sm text-gray-600">
                A look at the real output produced by the demo analysis above — the 931,978-node
                lower control arm model.
              </p>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
              <DemoScreenshot
                src="/demo/haigh-diagram.png"
                alt="Example Haigh diagram from the demo analysis"
                label="Haigh Diagram"
                description="σm vs σa scatter with Goodman, Gerber, and Soderberg failure lines."
              />
              <DemoScreenshot
                src="/demo/3d-safety-map.png"
                alt="Example 3D safety factor map from the demo analysis"
                label="3D Safety Factor Map"
                description="Spatial distribution of safety factors across the FEM mesh."
              />
              <DemoScreenshot
                src="/demo/safety-factor-table.png"
                alt="Example safety factor summary table from the demo analysis"
                label="Safety Factor Summary"
                description="Per-component critical node safety factors at a glance."
              />
            </div>
          </div>
        </div>
      </div>

      {/* SolidWorks Integration Section */}
      <div className="mx-auto mt-20 max-w-4xl">
        <div className="rounded-xl border border-fatigue-100 bg-gradient-to-br from-fatigue-50 to-white p-8 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">SolidWorks Simulation Integration</h2>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            This tool natively supports CSV exports from <strong>SolidWorks Simulation</strong>.
            Export your static study results as CSV files and upload them directly — the parser
            automatically handles stress unit conversion (N/m² → MPa).
          </p>

          <h3 className="mt-6 font-semibold text-gray-900">How to Export from SolidWorks</h3>
          <ol className="mt-3 space-y-3 text-sm leading-relaxed text-gray-600">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-fatigue-100 text-xs font-bold text-fatigue-700">
                1
              </span>
              <span>
                Run your <strong>static study</strong> in SolidWorks Simulation and right-click on
                the <strong>Results</strong> folder.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-fatigue-100 text-xs font-bold text-fatigue-700">
                2
              </span>
              <span>
                Select <strong>List Stress</strong> and choose the stress components you want (Von
                Mises, P1, P2, P3) for each node.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-fatigue-100 text-xs font-bold text-fatigue-700">
                3
              </span>
              <span>
                Click <strong>Save</strong> and choose <strong>CSV (*.csv)</strong> format. This is
                your <strong>base case</strong> file.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-fatigue-100 text-xs font-bold text-fatigue-700">
                4
              </span>
              <span>
                Apply your <strong>loading case</strong> boundary conditions, re-run the study, and
                export the stress list again as a second CSV file.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-fatigue-100 text-xs font-bold text-fatigue-700">
                5
              </span>
              <span>
                (Optional) Export node coordinates by right-clicking Results →{' '}
                <strong>List Displacement</strong> → Save as CSV for 3D visualization.
              </span>
            </li>
          </ol>

          <div className="mt-6 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full bg-fatigue-100 px-3 py-1 text-xs font-medium text-fatigue-700">
              ✅ SolidWorks Simulation
            </span>
            <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-500">
              ◻ ANSYS Workbench — Planned
            </span>
            <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-500">
              ◻ Abaqus — Planned
            </span>
            <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-500">
              ◻ Nastran — Planned
            </span>
            <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-500">
              ◻ SimScale — Planned
            </span>
          </div>
        </div>
      </div>

      {/* Standards Supported */}
      <div className="mx-auto mt-20 max-w-4xl text-center">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
          Planned Standards Support
        </h2>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
          {['DIN EN 1993-1-9', 'DNVGL-RP-C203', 'ABS', 'API 579-1', 'IIW'].map((standard) => (
            <span
              key={standard}
              className="inline-flex items-center rounded-full border border-gray-200 bg-white px-4 py-1.5 text-xs font-medium text-gray-600"
            >
              {standard}
            </span>
          ))}
        </div>
      </div>
    </main>
  );
}
