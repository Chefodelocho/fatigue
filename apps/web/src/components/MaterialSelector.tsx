/**
 * Material selector component with predefined steel database and custom input.
 *
 * Allows users to either:
 * 1. Pick from a list of standardized steels (grouped by category)
 * 2. Enter custom material properties manually
 *
 * @module components/MaterialSelector
 */

'use client';

import { useState } from 'react';

import { MATERIAL_DATABASE, getMaterialGroups, type MaterialEntry } from '@/lib/materials';
import type { MaterialConfig } from '@/lib/analysis-store';

// -- Props -------------------------------------------------------------------

interface MaterialSelectorProps {
  /** Currently selected material */
  value: MaterialConfig | null;
  /** Called when material selection changes */
  onChange: (material: MaterialConfig) => void;
  /** Whether the component is disabled */
  disabled?: boolean;
}

// -- Component ---------------------------------------------------------------

export default function MaterialSelector({ value, onChange, disabled }: MaterialSelectorProps) {
  const [mode, setMode] = useState<'preset' | 'custom'>(value?.isCustom ? 'custom' : 'preset');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  // Standard steels list starts folded once a material is already selected
  // (e.g. on the results page) to save space; stays open by default when
  // nothing is selected yet (e.g. the initial configure step) so first-time
  // selection isn't hidden behind an extra click.
  const [isPresetListOpen, setIsPresetListOpen] = useState<boolean>(!value);
  const [custom, setCustom] = useState<MaterialConfig>(
    value?.isCustom
      ? value
      : {
          id: 'custom',
          name: 'Custom Material',
          ultimateStrength: 500,
          yieldStrength: 350,
          enduranceLimit: 250,
          isCustom: true,
        },
  );

  const groups = getMaterialGroups();

  const filteredMaterials =
    groupFilter === 'all'
      ? MATERIAL_DATABASE
      : MATERIAL_DATABASE.filter((m) => m.group === groupFilter);

  const handlePresetSelect = (mat: MaterialEntry) => {
    const config: MaterialConfig = {
      id: mat.id,
      name: mat.name,
      ultimateStrength: mat.ultimateStrength,
      yieldStrength: mat.yieldStrength,
      enduranceLimit: mat.enduranceLimit,
      isCustom: false,
    };
    onChange(config);
  };

  const handleCustomChange = (field: keyof MaterialConfig, val: string) => {
    const numVal = parseFloat(val);
    if (isNaN(numVal)) return;

    const updated: MaterialConfig = {
      ...custom,
      [field]: numVal,
    };
    setCustom(updated);
    onChange(updated);
  };

  const handleCustomNameChange = (name: string) => {
    const updated: MaterialConfig = { ...custom, name };
    setCustom(updated);
    onChange(updated);
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
        Material Properties
      </h2>

      {/* Mode Toggle */}
      <div className="mb-4 inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
        <button
          onClick={() => setMode('preset')}
          disabled={disabled}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            mode === 'preset'
              ? 'bg-fatigue-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
        >
          Standard Steels
        </button>
        <button
          onClick={() => {
            setMode('custom');
            onChange(custom);
          }}
          disabled={disabled}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            mode === 'custom'
              ? 'bg-fatigue-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
        >
          Custom Material
        </button>
      </div>

      {/* Preset Material Selection */}
      {mode === 'preset' && (
        <div>
          {/* Fold/unfold toggle */}
          <button
            type="button"
            onClick={() => setIsPresetListOpen((open) => !open)}
            disabled={disabled}
            className={`mb-3 flex w-full items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 ${
              disabled ? 'cursor-not-allowed opacity-50' : ''
            }`}
            aria-expanded={isPresetListOpen}
          >
            <span>Standard Steels List ({filteredMaterials.length})</span>
            <svg
              className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${
                isPresetListOpen ? 'rotate-180' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {isPresetListOpen && (
            <>
              {/* Group Filter */}
              <div className="mb-3">
                <select
                  value={groupFilter}
                  onChange={(e) => setGroupFilter(e.target.value)}
                  disabled={disabled}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-fatigue-500 focus:ring-1 focus:ring-fatigue-500"
                >
                  <option value="all">All Groups</option>
                  {groups.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              {/* Material Grid */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {filteredMaterials.map((mat) => (
                  <button
                    key={mat.id}
                    onClick={() => handlePresetSelect(mat)}
                    disabled={disabled}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      value?.id === mat.id && !value.isCustom
                        ? 'border-fatigue-500 bg-fatigue-50 ring-1 ring-fatigue-500'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    <div className="text-sm font-semibold text-gray-900">{mat.name}</div>
                    <div className="mt-1 text-xs text-gray-500">{mat.standard}</div>
                    <div className="mt-2 grid grid-cols-3 gap-1 text-xs">
                      <div>
                        <span className="text-gray-400">σu:</span>{' '}
                        <span className="font-medium text-gray-700">{mat.ultimateStrength}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">σy:</span>{' '}
                        <span className="font-medium text-gray-700">{mat.yieldStrength}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">σe:</span>{' '}
                        <span className="font-medium text-gray-700">{mat.enduranceLimit}</span>
                      </div>
                    </div>
                    {mat.notes && (
                      <div className="mt-1 text-xs text-gray-400 truncate">{mat.notes}</div>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Custom Material Input */}
      {mode === 'custom' && (
        <div className="space-y-4">
          <div>
            <label htmlFor="custom-name" className="mb-1 block text-sm font-medium text-gray-700">
              Material Name
            </label>
            <input
              id="custom-name"
              type="text"
              value={custom.name}
              onChange={(e) => handleCustomNameChange(e.target.value)}
              disabled={disabled}
              placeholder="e.g., My Custom Steel"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-fatigue-500 focus:ring-1 focus:ring-fatigue-500"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <NumberInput
              id="custom-ultimate"
              label="Ultimate Tensile Strength (σu)"
              unit="MPa"
              value={custom.ultimateStrength}
              onChange={(v) => handleCustomChange('ultimateStrength', v)}
              disabled={disabled}
            />
            <NumberInput
              id="custom-yield"
              label="Yield Strength (σy)"
              unit="MPa"
              value={custom.yieldStrength}
              onChange={(v) => handleCustomChange('yieldStrength', v)}
              disabled={disabled}
            />
            <NumberInput
              id="custom-endurance"
              label="Endurance Limit (σe)"
              unit="MPa"
              value={custom.enduranceLimit}
              onChange={(v) => handleCustomChange('enduranceLimit', v)}
              disabled={disabled}
            />
          </div>
        </div>
      )}

      {/* Current Selection Summary */}
      {value && (
        <div className="mt-4 rounded-md bg-gray-50 px-4 py-3">
          <div className="text-xs font-medium text-gray-500">Selected Material</div>
          <div className="mt-1 text-sm font-semibold text-gray-900">
            {value.name}
            {value.isCustom && (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-normal text-amber-700">
                Custom
              </span>
            )}
          </div>
          <div className="mt-1 flex gap-4 text-xs text-gray-500">
            <span>σu = {value.ultimateStrength} MPa</span>
            <span>σy = {value.yieldStrength} MPa</span>
            <span>σe = {value.enduranceLimit} MPa</span>
          </div>
        </div>
      )}
    </div>
  );
}

// -- Sub-components ----------------------------------------------------------

function NumberInput({
  id,
  label,
  unit,
  value,
  onChange,
  disabled,
}: {
  readonly id: string;
  readonly label: string;
  readonly unit: string;
  readonly value: number;
  readonly onChange: (value: string) => void;
  readonly disabled?: boolean | undefined;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          min={0}
          step={10}
          className="w-full rounded-md border border-gray-300 px-3 py-2 pr-14 text-sm focus:border-fatigue-500 focus:ring-1 focus:ring-fatigue-500"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
          {unit}
        </span>
      </div>
    </div>
  );
}
