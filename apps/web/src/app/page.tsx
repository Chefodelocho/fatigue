import Link from 'next/link';

export default function Home() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Fatigue Analysis Tool
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600">
          A modern, web-based platform for performing fatigue life assessments
          using industry-standard methodologies. Analyze FEM stress data with
          Goodman, Gerber, and Soderberg mean stress correction criteria.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link
            href="/analysis"
            className="rounded-md bg-fatigue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-fatigue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fatigue-600"
          >
            Run Analysis
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

      {/* Feature Cards */}
      <div className="mx-auto mt-20 grid max-w-4xl grid-cols-1 gap-8 sm:grid-cols-2">
        <FeatureCard
          title="Haigh Diagram"
          description="Interactive σm vs σa visualization with Goodman, Gerber, and Soderberg failure lines and FEM node scatter points."
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          }
        />
        <FeatureCard
          title="Safety Factor Analysis"
          description="Per-node safety factor computation across VON, P1, P2, and P3 stress components with color-coded severity."
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          }
        />
        <FeatureCard
          title="Multi-Component Support"
          description="Analyze Von Mises, first, second, and third principal stresses with independent safety evaluations."
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
          }
        />
        <FeatureCard
          title="FEM Data Pipeline"
          description="Streaming CSV parser for large FEM datasets (900K+ nodes) with automatic stress unit conversion."
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
            </svg>
          }
        />
      </div>

      {/* SolidWorks Integration Section */}
      <div className="mx-auto mt-20 max-w-4xl">
        <div className="rounded-xl border border-fatigue-100 bg-gradient-to-br from-fatigue-50 to-white p-8 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">
            SolidWorks Simulation Integration
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            This tool natively supports CSV exports from <strong>SolidWorks Simulation</strong>.
            Export your static study results as CSV files and upload them directly — the
            parser automatically handles stress unit conversion (N/m² → MPa).
          </p>

          <h3 className="mt-6 font-semibold text-gray-900">How to Export from SolidWorks</h3>
          <ol className="mt-3 space-y-3 text-sm leading-relaxed text-gray-600">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-fatigue-100 text-xs font-bold text-fatigue-700">1</span>
              <span>
                Run your <strong>static study</strong> in SolidWorks Simulation and right-click
                on the <strong>Results</strong> folder.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-fatigue-100 text-xs font-bold text-fatigue-700">2</span>
              <span>
                Select <strong>List Stress</strong> and choose the stress components you want
                (Von Mises, P1, P2, P3) for each node.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-fatigue-100 text-xs font-bold text-fatigue-700">3</span>
              <span>
                Click <strong>Save</strong> and choose <strong>CSV (*.csv)</strong> format.
                This is your <strong>base case</strong> file.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-fatigue-100 text-xs font-bold text-fatigue-700">4</span>
              <span>
                Apply your <strong>loading case</strong> boundary conditions, re-run the study,
                and export the stress list again as a second CSV file.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-fatigue-100 text-xs font-bold text-fatigue-700">5</span>
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

      {/* Reference Example Section */}
      <div className="mx-auto mt-10 max-w-4xl">
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-100 text-amber-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Try the Demo
              </h2>
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
              href="/analysis"
              className="inline-flex items-center gap-2 rounded-md bg-fatigue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-fatigue-500"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
              </svg>
              Run Demo & See Results
            </Link>
          </div>
        </div>
      </div>

      {/* Standards Supported */}
      <div className="mx-auto mt-20 max-w-4xl text-center">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
          Planned Standards Support
        </h2>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
          {['DIN EN 1993-1-9', 'DNVGL-RP-C203', 'ABS', 'API 579-1', 'IIW'].map(
            (standard) => (
              <span
                key={standard}
                className="inline-flex items-center rounded-full border border-gray-200 bg-white px-4 py-1.5 text-xs font-medium text-gray-600"
              >
                {standard}
              </span>
            ),
          )}
        </div>
      </div>
    </main>
  );
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  readonly title: string;
  readonly description: string;
  readonly icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-fatigue-100 text-fatigue-600">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">{description}</p>
    </div>
  );
}
