import Link from 'next/link';

export default function QuickStartPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Quick Start</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          Export your FEM results, upload them, and get fatigue analysis results in a few steps.
        </p>
      </div>

      <div className="mt-10 grid gap-6">
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">1. Export from SolidWorks</h2>
          <ol className="mt-3 space-y-3 text-sm leading-6 text-gray-600">
            <li>Run your static study.</li>
            <li>
              Right-click <strong>Results</strong> and choose <strong>List Stress</strong>.
            </li>
            <li>Export the base case and loading case as CSV files.</li>
            <li>
              Optional: export node coordinates with <strong>List Displacement</strong> for 3D view.
            </li>
          </ol>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">2. Run the analysis</h2>
          <ol className="mt-3 space-y-3 text-sm leading-6 text-gray-600">
            <li>Go to the analysis page and upload the two CSV files.</li>
            <li>Select a material or keep the default steel.</li>
            <li>
              Click <strong>Run Fatigue Analysis</strong>.
            </li>
          </ol>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">3. Explore the results</h2>
          <ol className="mt-3 space-y-3 text-sm leading-6 text-gray-600">
            <li>Use the stress-component buttons to switch between VON, P1, P2, and P3.</li>
            <li>Adjust the max safety factor slider to filter nodes.</li>
            <li>Toggle HD / Detail mode for a full-node 3D view.</li>
          </ol>
        </section>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/analysis?demo=true"
          className="rounded-md bg-fatigue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-fatigue-500"
        >
          Open Demo Results
        </Link>
        <Link
          href="/"
          className="rounded-md border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
        >
          Back to Home
        </Link>
      </div>
    </main>
  );
}
