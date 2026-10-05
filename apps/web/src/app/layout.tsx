import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fatigue Analysis Tool',
  description:
    'A modern, web-based fatigue analysis tool for structural and mechanical engineering',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {/* Navigation Header */}
        <header className="border-b border-gray-200 bg-white shadow-sm">
          <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold text-fatigue-700">
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5"
                />
              </svg>
              Fatigue
            </Link>
            <div className="flex items-center gap-6">
              <Link
                href="/"
                className="text-sm font-medium text-gray-600 transition-colors hover:text-fatigue-600"
              >
                Home
              </Link>
              <Link
                href="/analysis"
                className="text-sm font-medium text-gray-600 transition-colors hover:text-fatigue-600"
              >
                Analysis
              </Link>
            </div>
          </nav>
        </header>

        {/* Page Content */}
        {children}
      </body>
    </html>
  );
}
