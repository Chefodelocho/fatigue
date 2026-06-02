/**
 * File upload component with drag & drop support for FEM CSV files.
 *
 * Allows users to upload two CSV files (base case + loading case) and an
 * optional coordinates CSV file for 3D visualization.
 * Files are read client-side and sent to the API for processing.
 *
 * @module components/FileUpload
 */

'use client';

import { useCallback, useRef, useState } from 'react';

// -- Types -------------------------------------------------------------------

export interface UploadedFiles {
  readonly base: File;
  readonly load: File;
  readonly coordinates?: File;
}

interface FileUploadProps {
  /** Called when both required files are selected */
  onFilesSelected: (files: UploadedFiles) => void;
  /** Currently selected files */
  files: UploadedFiles | null;
  /** Whether upload is disabled */
  disabled?: boolean;
}

// -- Component ---------------------------------------------------------------

export default function FileUpload({ onFilesSelected, files, disabled }: FileUploadProps) {
  const baseInputRef = useRef<HTMLInputElement>(null);
  const loadInputRef = useRef<HTMLInputElement>(null);
  const coordsInputRef = useRef<HTMLInputElement>(null);
  const [dragOverBase, setDragOverBase] = useState(false);
  const [dragOverLoad, setDragOverLoad] = useState(false);
  const [dragOverCoords, setDragOverCoords] = useState(false);

  /**
   * Build UploadedFiles object respecting exactOptionalPropertyTypes.
   * Only includes `coordinates` if a valid File is provided.
   */
  const buildFiles = useCallback(
    (base: File, load: File, coords: File | undefined): UploadedFiles => {
      if (coords) {
        return { base, load, coordinates: coords };
      }
      return { base, load };
    },
    [],
  );

  const handleFileDrop = useCallback(
    (type: 'base' | 'load', droppedFile: File | undefined) => {
      if (!droppedFile || disabled) return;

      // Validate file extension
      if (!droppedFile.name.toLowerCase().endsWith('.csv')) {
        alert('Please upload a CSV file.');
        return;
      }

      if (type === 'base') {
        const load = files?.load;
        if (load) {
          onFilesSelected(buildFiles(droppedFile, load, files?.coordinates));
        } else {
          // Store base temporarily — we need both files
          onFilesSelected({ base: droppedFile, load: droppedFile }); // temporary, will be overwritten
        }
      } else {
        const base = files?.base;
        if (base) {
          onFilesSelected(buildFiles(base, droppedFile, files?.coordinates));
        }
      }
    },
    [disabled, files, onFilesSelected, buildFiles],
  );

  const handleCoordsDrop = useCallback(
    (droppedFile: File | undefined) => {
      if (!droppedFile || disabled || !files?.base || !files?.load) return;

      if (!droppedFile.name.toLowerCase().endsWith('.csv')) {
        alert('Please upload a CSV file.');
        return;
      }

      onFilesSelected(buildFiles(files.base, files.load, droppedFile));
    },
    [disabled, files, onFilesSelected, buildFiles],
  );

  const handleBaseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const load = files?.load;
      if (load) {
        onFilesSelected(buildFiles(file, load, files?.coordinates));
      } else {
        onFilesSelected({ base: file, load: file });
      }
    }
  };

  const handleLoadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && files?.base) {
      onFilesSelected(buildFiles(files.base, file, files?.coordinates));
    }
  };

  const handleCoordsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && files?.base && files?.load) {
      onFilesSelected({ base: files.base, load: files.load, coordinates: file });
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
        FEM Data Files
      </h2>
      <p className="mb-4 text-xs text-gray-500">
        Upload the base case and loading case CSV files exported from your FEM simulation.
        Files should contain columns: Node, P1, P2, P3, VON.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Base Case Upload */}
        <DropZone
          label="Base Case CSV"
          file={files?.base}
          dragOver={dragOverBase}
          disabled={disabled}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverBase(true);
          }}
          onDragLeave={() => setDragOverBase(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOverBase(false);
            handleFileDrop('base', e.dataTransfer.files[0]);
          }}
          onClick={() => baseInputRef.current?.click()}
        />
        <input
          ref={baseInputRef}
          type="file"
          accept=".csv"
          onChange={handleBaseChange}
          disabled={disabled}
          className="hidden"
        />

        {/* Loading Case Upload */}
        <DropZone
          label="Loading Case CSV"
          file={files?.load}
          dragOver={dragOverLoad}
          disabled={disabled}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverLoad(true);
          }}
          onDragLeave={() => setDragOverLoad(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOverLoad(false);
            handleFileDrop('load', e.dataTransfer.files[0]);
          }}
          onClick={() => {
            if (files?.base) {
              loadInputRef.current?.click();
            }
          }}
        />
        <input
          ref={loadInputRef}
          type="file"
          accept=".csv"
          onChange={handleLoadChange}
          disabled={disabled || !files?.base}
          className="hidden"
        />
      </div>

      {/* Optional Coordinates Upload */}
      <div className="mt-4 border-t border-gray-100 pt-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Optional — 3D Visualization
        </h3>
        <p className="mb-3 text-xs text-gray-400">
          Upload node coordinates (X, Y, Z) to visualize the spatial distribution of safety factors
          in a 3D scatter plot. File should contain columns: Node, X (mm), Y (mm), Z (mm).
        </p>
        <DropZone
          label="Node Coordinates CSV (Optional)"
          file={files?.coordinates}
          dragOver={dragOverCoords}
          disabled={disabled || !files?.base || !files?.load}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverCoords(true);
          }}
          onDragLeave={() => setDragOverCoords(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOverCoords(false);
            handleCoordsDrop(e.dataTransfer.files[0]);
          }}
          onClick={() => {
            if (files?.base && files?.load) {
              coordsInputRef.current?.click();
            }
          }}
        />
        <input
          ref={coordsInputRef}
          type="file"
          accept=".csv"
          onChange={handleCoordsChange}
          disabled={disabled || !files?.base || !files?.load}
          className="hidden"
        />
        {files?.coordinates && (
          <p className="mt-2 text-xs text-green-600">
            ✓ Coordinates loaded — 3D visualization will be available in results.
          </p>
        )}
      </div>

      {/* File validation message */}
      {files?.base && files.load && files.base.name === files.load.name && (
        <p className="mt-2 text-xs text-amber-600">
          ⚠️ Both files have the same name. Please verify the loading case file is different.
        </p>
      )}

      {!files?.base && (
        <p className="mt-2 text-xs text-gray-400">Upload the base case file first.</p>
      )}
      {files?.base && !files?.load && (
        <p className="mt-2 text-xs text-gray-400">Now upload the loading case file.</p>
      )}
    </div>
  );
}

// -- Sub-components ----------------------------------------------------------

function DropZone({
  label,
  file,
  dragOver,
  disabled,
  onDragOver,
  onDragLeave,
  onDrop,
  onClick,
}: {
  readonly label: string;
  readonly file: File | undefined;
  readonly dragOver: boolean;
  readonly disabled: boolean | undefined;
  readonly onDragOver: (e: React.DragEvent) => void;
  readonly onDragLeave: () => void;
  readonly onDrop: (e: React.DragEvent) => void;
  readonly onClick: () => void;
}) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={disabled ? undefined : onClick}
      className={`rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
        disabled
          ? 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-50'
          : dragOver
            ? 'cursor-pointer border-fatigue-500 bg-fatigue-50'
            : file
              ? 'cursor-pointer border-green-300 bg-green-50'
              : 'cursor-pointer border-gray-300 hover:border-gray-400 hover:bg-gray-50'
      }`}
    >
      {file ? (
        <div>
          <div className="text-lg text-green-600">✓</div>
          <div className="mt-1 text-sm font-medium text-gray-900 truncate">{file.name}</div>
          <div className="text-xs text-gray-500">{(file.size / (1024 * 1024)).toFixed(1)} MB</div>
        </div>
      ) : (
        <div>
          <div className="text-lg text-gray-400">📄</div>
          <div className="mt-1 text-sm font-medium text-gray-600">{label}</div>
          <div className="text-xs text-gray-400">Drop CSV file here or click to browse</div>
        </div>
      )}
    </div>
  );
}
