/**
 * Analysis history component — lists previous analyses with load/delete actions.
 *
 * Fetches analysis history from the server-side store via `/api/analyses`.
 * Entries are restricted to the current browser session.
 *
 * @module components/AnalysisHistory
 */

'use client';

import { useCallback, useEffect, useState } from 'react';

import type { AnalysisHistoryEntry } from '@/lib/analysis-store';
import {
  fetchHistory,
  deleteFromHistory,
} from '@/lib/analysis-store';

// -- Props -------------------------------------------------------------------

interface AnalysisHistoryProps {
  /** Called when user selects a past analysis to load */
  onLoad: (entry: AnalysisHistoryEntry) => void;
  /** Whether the history panel is disabled */
  disabled?: boolean;
}

// -- Component ---------------------------------------------------------------

export default function AnalysisHistory({ onLoad, disabled }: AnalysisHistoryProps) {
  const [history, setHistory] = useState<readonly AnalysisHistoryEntry[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const refreshHistory = useCallback(async () => {
    setIsLoading(true);
    const entries = await fetchHistory();
    setHistory(entries);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refreshHistory();
  }, [refreshHistory]);

  const handleDelete = async (id: string) => {
    await deleteFromHistory(id);
    await refreshHistory();
  };

  const handleClearAll = async () => {
    if (confirm('Delete all analysis history? This cannot be undone.')) {
      for (const entry of history) {
        await deleteFromHistory(entry.id);
      }
      setHistory([]);
    }
  };

  const handleLoad = (entry: AnalysisHistoryEntry) => {
    if (!disabled) {
      onLoad(entry);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between p-5 text-left"
      >
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            Analysis History
          </h2>
          <span className="text-xs text-gray-400">
            {isLoading ? 'Loading…' : `${history.length} ${history.length === 1 ? 'entry' : 'entries'}`}
          </span>
        </div>
        <svg
          className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* History List */}
      {isExpanded && (
        <div className="border-t border-gray-200">
          {isLoading ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">
              Loading history…
            </div>
          ) : history.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">
              No previous analyses. Run your first analysis to see it here.
            </div>
          ) : (
            <>
              <div className="max-h-80 overflow-y-auto">
                {history.map((entry) => (
                  <HistoryItem
                    key={entry.id}
                    entry={entry}
                    disabled={disabled}
                    onLoad={handleLoad}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
              <div className="border-t border-gray-100 px-5 py-3">
                <button
                  onClick={() => void handleClearAll()}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Clear All History
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// -- Sub-components ----------------------------------------------------------

function HistoryItem({
  entry,
  disabled,
  onLoad,
  onDelete,
}: {
  readonly entry: AnalysisHistoryEntry;
  readonly disabled: boolean | undefined;
  readonly onLoad: (entry: AnalysisHistoryEntry) => void;
  readonly onDelete: (id: string) => void;
}) {
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Find the worst safety factor across all components
  // (guard against legacy entries missing minSafetyFactors)
  const sf = entry.minSafetyFactors;
  const worstSF = sf
    ? Math.min(sf.VON?.minSF ?? 99, sf.P1?.minSF ?? 99, sf.P2?.minSF ?? 99, sf.P3?.minSF ?? 99)
    : 99;

  return (
    <div className="flex items-center gap-3 border-b border-gray-50 px-5 py-3 last:border-b-0 hover:bg-gray-50">
      <button
        onClick={() => onLoad(entry)}
        disabled={disabled}
        className={`flex-1 text-left ${
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">{entry.name}</span>
          <SafetyBadge sf={worstSF} />
        </div>
        <div className="mt-1 flex gap-3 text-xs text-gray-500">
          <span>{entry.material.name}</span>
          <span>•</span>
          <span>{entry.nodeCount.toLocaleString()} nodes</span>
          <span>•</span>
          <span>{formatDate(entry.createdAt)}</span>
        </div>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          void onDelete(entry.id);
        }}
        className="rounded p-1 text-gray-300 hover:bg-red-50 hover:text-red-500"
        title="Delete this entry"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>
    </div>
  );
}

function SafetyBadge({ sf }: { readonly sf: number }) {
  const color =
    sf < 1.0
      ? 'bg-red-100 text-red-700'
      : sf < 1.5
        ? 'bg-amber-100 text-amber-700'
        : 'bg-green-100 text-green-700';

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      SF min: {sf.toFixed(2)}
    </span>
  );
}
