# 3D Coordinate Visualization Feature — Architecture

## Overview

This feature adds **optional** node coordinate upload to the fatigue analysis workflow. When the user provides a coordinates CSV file alongside the base/load FEM stress files, the system produces a **3D scatter visualization** showing the spatial distribution of the worst (by safety factor) nodes — color-coded by severity — for each stress component.

The coordinate file reference is stored at:
[`data/reference/coordinates/Lower_Car_ASSY-Base Case_coordinates.csv`](../../data/reference/coordinates/Lower_Car_ASSY-Base%20Case_coordinates.csv)

---

## Coordinate CSV File Format

The coordinate file has the following structure (from reference file, ~932K rows):

```
Line 1: Date:  11:32, Tuesday, June 02, 2026          ← metadata
Line 2: Model name: Lower_Car_ASSY                     ← metadata
Line 3: Study name: Base Case(-Standard-)              ← metadata
Line 4: Mesh type: Mixed Mesh                          ← metadata
Line 5: (blank)
Line 6: (blank)
Line 7: Node  ,Value  ,X (mm)  ,Y (mm)  ,Z (mm)  ,Components
Line 8: 1  ,0.000e+00   ,843.52  ,-347.6  ,32.574  ,D8001346589-1/D8000854949-1
Line 9: 2  ,0.000e+00   ,842.05  ,-347.17  ,35.626  ,D8001346589-1/D8000854949-1
...
```

**Columns**:
| Column       | Type    | Description                                    |
|-------------|---------|------------------------------------------------|
| `Node`      | integer | FEM mesh node ID (joins with stress data)      |
| `Value`     | float   | FEM result value (not used for visualization)  |
| `X (mm)`    | float   | X coordinate in millimeters                    |
| `Y (mm)`    | float   | Y coordinate in millimeters                    |
| `Z (mm)`    | float   | Z coordinate in millimeters                    |
| `Components`| string  | FEM part/component name (not used initially)   |

---

## Data Flow

```
┌─────────────┐     ┌─────────────┐     ┌──────────────────┐
│ Base CSV    │     │ Load CSV    │     │ Coordinates CSV  │  ← 3 uploads
└──────┬──────┘     └──────┬──────┘     └────────┬─────────┘
       │                   │                      │
       └───────┬───────────┘                      │
               ▼                                  │
     parseFEMStressCSV() × 2                      │
               │                                  │
               ▼                                  ▼
       loadFEMNodeStress()              parseCoordinatesCSV()
               │                                  │
               ▼                                  ▼
        FEMNodeStress[]                  NodeCoordinates[]
               │                                  │
               ▼                                  │
        analyzeFEMData()                           │
               │                                  │
               ▼                                  │
     safetyFactors per component                   │
       (VON, P1, P2, P3)                          │
               │                                  │
               └──────────┬───────────────────────┘
                          ▼
                  Join on nodeId
                          │
                          ▼
              Select worst 10,000 per component
              (sorted by minSF ascending)
                          │
                          ▼
              Build Visualization3DData
              (x, y, z + color by minSF)
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
       JSON API Response      3D Scatter Plot
       (worst nodes only)     (Plotly.js WebGL)
```

---

## Layer-by-Layer Changes

### 1. `packages/types` — New Interfaces

Add the following types to a new file `packages/types/src/coordinates.ts`:

```typescript
/**
 * 3D spatial coordinates for a single FEM node.
 */
interface NodeCoordinates {
  /** Unique FEM mesh node identifier */
  readonly nodeId: number;
  /** X coordinate in mm */
  readonly x: number;
  /** Y coordinate in mm */
  readonly y: number;
  /** Z coordinate in mm */
  readonly z: number;
}

/**
 * A single node in the 3D safety factor visualization.
 * Combines spatial coordinates with fatigue safety data.
 */
interface Node3DVizPoint {
  readonly nodeId: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** Minimum safety factor across Goodman/Gerber/Soderberg for this component */
  readonly minSF: number;
  /** Goodman safety factor */
  readonly goodmanSF: number;
  /** Gerber safety factor */
  readonly gerberSF: number;
  /** Soderberg safety factor */
  readonly soderbergSF: number;
  /** Mean stress in MPa */
  readonly meanStress: number;
  /** Alternating stress in MPa */
  readonly alternatingStress: number;
}

/**
 * 3D visualization data for a single stress component.
 */
interface Component3DData {
  /** Worst nodes sorted by minSF ascending (capped at MAX_3D_POINTS) */
  readonly worstNodes: readonly Node3DVizPoint[];
  /** Total number of nodes that had matching coordinates */
  readonly totalMatchedNodes: number;
}

/**
 * Complete 3D visualization payload returned by the API.
 */
interface Visualization3DData {
  /** Total nodes with coordinates in the uploaded file */
  readonly coordinateNodeCount: number;
  /** Total nodes that matched between stress data and coordinates */
  readonly matchedNodeCount: number;
  /** Bounding box for initial camera framing */
  readonly bounds: {
    readonly minX: number;
    readonly maxX: number;
    readonly minY: number;
    readonly maxY: number;
    readonly minZ: number;
    readonly maxZ: number;
  };
  /** Worst 10,000 nodes per stress component */
  readonly worstByComponent: {
    readonly VON: Component3DData;
    readonly P1: Component3DData;
    readonly P2: Component3DData;
    readonly P3: Component3DData;
  };
}
```

Export all types from `packages/types/src/index.ts`.

### 2. `packages/data` — Coordinate CSV Parser

New file: `packages/data/src/importers/coordinates-csv-parser.ts`

```typescript
/**
 * Streaming CSV parser for FEM node coordinate exports.
 *
 * Parses CSV files with columns: Node, Value, X (mm), Y (mm), Z (mm), Components
 * Header detection is dynamic (searches for a row containing "Node" and "X" columns).
 *
 * @module importers/coordinates-csv-parser
 */
```

**Key design decisions**:
- **Streaming**: Use `readline.createInterface` + `createReadStream` (same pattern as `fem-csv-parser.ts`)
- **Dynamic header detection**: Scan for a row where columns include `NODE` and `X (MM)` (case-insensitive, trimmed)
- **Skip `Value` and `Components` columns**: Not needed for visualization
- **Coordinate values**: Kept as raw floats (already in mm)
- **Return**: `readonly NodeCoordinates[]`

New function signature:
```typescript
export async function parseCoordinatesCSV(filePath: string): Promise<readonly NodeCoordinates[]>
```

Export from `packages/data/src/index.ts`:
```typescript
export { parseCoordinatesCSV } from './importers/coordinates-csv-parser';
export type { NodeCoordinates } from './importers/coordinates-csv-parser';
```

### 3. API Route Changes — `apps/web/src/app/api/analyze-upload/route.ts`

#### Configuration Addition

```typescript
const MAX_3D_POINTS = 10_000;
```

#### FormData Changes

Accept an optional third file:
```typescript
const coordinatesFile = formData.get('coordinatesFile');
// Optional: may be null or undefined
if (coordinatesFile && coordinatesFile instanceof File) {
  // Process coordinates
}
```

#### Processing Pipeline Extension

When coordinates are provided:
1. Write `coordinatesFile` to temp file
2. Parse with `parseCoordinatesCSV()`
3. Build `Map<number, NodeCoordinates>` for O(1) lookup
4. After `analyzeFEMData()`, join safety factors with coordinates
5. For each component, sort by `minSF` ascending, take first `MAX_3D_POINTS`
6. Compute bounding box from ALL matched coordinates (not just worst)
7. Attach `Visualization3DData` to response (or `null` if no coordinates)

#### Response Type Extension

```typescript
interface AnalysisResponse {
  // ... existing fields ...
  material: FEMMaterialProperties;
  nodeCount: number;
  computeTimeSeconds: string;
  minSafetyFactors: Record<StressComponent, NodeSafetyFactors>;
  haighLines: HaighLines;
  haighPointsByComponent: Record<StressComponent, ComponentHaighData>;
  // NEW:
  visualization3D: Visualization3DData | null;
}
```

#### Temp File Cleanup

Add coordinates temp file to the `finally` cleanup block.

### 4. Frontend — File Upload Extension

#### `FileUpload.tsx` Changes

Add an **optional** third drop zone for the coordinates file:

```typescript
export interface UploadedFiles {
  readonly base: File;
  readonly load: File;
  readonly coordinates?: File;  // NEW — optional
}
```

- The coordinates drop zone appears below the base/load pair
- Labeled: "Node Coordinates CSV (Optional)"
- Description: "Upload node coordinates (X, Y, Z) for 3D visualization"
- When provided, `coordinates` is included in the `FormData` sent to the API

#### Form Data Submission (in `page.tsx`)

```typescript
if (files.coordinates) {
  formData.append('coordinatesFile', files.coordinates);
}
```

### 5. Frontend — 3D Visualization Component

New component: `apps/web/src/components/Scatter3DChart.tsx`

**Technology choice**: **Plotly.js** (`react-plotly.js`)
- Already considered in the tech stack (see project overview)
- Native 3D scatter plot with WebGL rendering
- Built-in color scales, tooltips, camera controls
- Handles 10K points easily with WebGL

**Component props**:
```typescript
interface Scatter3DChartProps {
  /** 3D visualization data for the selected component */
  readonly data: Component3DData;
  /** Bounding box for consistent camera framing */
  readonly bounds: Visualization3DData['bounds'];
  /** Currently selected stress component */
  readonly component: StressComponent;
  /** Total matched node count (for subtitle) */
  readonly matchedNodeCount: number;
}
```

**Color mapping**:
- Use Plotly's built-in color scales (e.g., `Turbo`, `Jet`, or `RdYlGn`)
- Map `minSF` → color: **red** (SF ≈ 1.0, critical) → **yellow** → **green** (SF >> 1.0, safe)
- Add a color bar with labeled axis showing SF values

**Interactivity**:
- Orbit, zoom, pan via mouse/touch
- Hover tooltip: nodeId, (x, y, z), minSF, Goodman/Gerber/Soderberg values
- Component switch via the existing component selector (already pre-computed for all 4)

### 6. Frontend — Analysis Page Integration

In [`apps/web/src/app/analysis/page.tsx`](../../apps/web/src/app/analysis/page.tsx):

#### AnalysisData Type Extension

```typescript
interface AnalysisData {
  // ... existing fields ...
  visualization3D: Visualization3DData | null;  // NEW
}
```

#### New State

```typescript
const [show3D, setShow3D] = useState(true);  // toggle for 3D section
```

#### Results Section Addition

After the Haigh Diagram section, add a conditional 3D visualization:

```tsx
{/* 3D Safety Factor Visualization — only when coordinates were uploaded */}
{data.visualization3D && (
  <section>
    <h2 className="mb-4 text-lg font-semibold text-gray-900">
      3D Safety Factor Map
    </h2>
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <Scatter3DChart
        data={data.visualization3D.worstByComponent[component]}
        bounds={data.visualization3D.bounds}
        component={component}
        matchedNodeCount={data.visualization3D.matchedNodeCount}
      />
    </div>
  </section>
)}
```

---

## Performance Considerations

### Coordinate File Size
- Reference file: ~932K rows ≈ 80-120 MB
- **Streaming parser** avoids loading entire file into memory
- **Join on nodeId** using `Map<number, NodeCoordinates>` — O(n) build + O(m) lookup

### 3D Point Limit
- **10,000 points max** per component (configurable via `MAX_3D_POINTS`)
- Plotly.js WebGL handles 10K points smoothly
- Sorting + slicing is O(n log n) — acceptable for ~900K nodes

### API Response Size
- 10,000 points × 4 components × ~10 fields ≈ ~5-8 MB JSON
- This is acceptable for a single request but could be optimized later:
  - Binary format (e.g., flat arrays for x[], y[], z[], minSF[])
  - Lazy loading per component (only send the selected component)
  - **For now**: Pre-compute all 4 components in one response (matches existing Haigh pattern)

### Client-Side Rendering
- Plotly.js WebGL renderer handles 10K 3D points without issues
- Component switching is instant (all data pre-loaded)

---

## New Package Dependencies

| Package                | Location   | Purpose                          |
|------------------------|------------|----------------------------------|
| `plotly.js-dist-min`   | `apps/web` | WebGL-based 3D scatter plots     |
| `react-plotly.js`      | `apps/web` | React wrapper for Plotly.js      |
| `@types/react-plotly.js` | `apps/web` | TypeScript types               |

Install:
```bash
cd apps/web && pnpm add plotly.js-dist-min react-plotly.js
cd apps/web && pnpm add -D @types/react-plotly.js
```

---

## File Changes Summary

### New Files
| File | Package | Description |
|------|---------|-------------|
| `packages/types/src/coordinates.ts` | types | New interfaces for coordinates and 3D viz |
| `packages/data/src/importers/coordinates-csv-parser.ts` | data | Streaming CSV parser for coordinate files |
| `apps/web/src/components/Scatter3DChart.tsx` | web | 3D scatter plot component using Plotly.js |

### Modified Files
| File | Package | Changes |
|------|---------|---------|
| `packages/types/src/index.ts` | types | Export new coordinate types |
| `packages/data/src/index.ts` | data | Export `parseCoordinatesCSV` |
| `apps/web/src/app/api/analyze-upload/route.ts` | web | Accept optional `coordinatesFile`, join + return 3D data |
| `apps/web/src/components/FileUpload.tsx` | web | Add optional coordinates drop zone |
| `apps/web/src/app/analysis/page.tsx` | web | Add 3D visualization section, extend types |

---

## Implementation Order

The implementation should proceed in this order, respecting the layered dependency direction (`types ← core ← data ← ui ← web`):

### Phase 1: Types & Data Layer
1. **`packages/types/src/coordinates.ts`** — Define `NodeCoordinates`, `Node3DVizPoint`, `Component3DData`, `Visualization3DData`
2. **`packages/types/src/index.ts`** — Export new types
3. **`packages/data/src/importers/coordinates-csv-parser.ts`** — Streaming parser for coordinate CSV
4. **`packages/data/src/index.ts`** — Export parser + types

### Phase 2: API Layer
5. **`apps/web/src/app/api/analyze-upload/route.ts`** — Accept `coordinatesFile`, parse, join, select worst nodes, return `Visualization3DData | null`

### Phase 3: UI Layer
6. Install Plotly.js dependencies in `apps/web`
7. **`apps/web/src/components/Scatter3DChart.tsx`** — 3D scatter plot component
8. **`apps/web/src/components/FileUpload.tsx`** — Add optional coordinates drop zone
9. **`apps/web/src/app/analysis/page.tsx`** — Integrate 3D section into results view

### Phase 4: Testing
10. Unit tests for `coordinates-csv-parser.ts` (parse header detection, data rows, edge cases)
11. Integration test: full pipeline with coordinate file
12. Visual validation with reference coordinate file

---

## Testing Strategy

### Unit Tests

**`coordinates-csv-parser.test.ts`**:
- Parse file with standard header (6 metadata lines + column header)
- Handle missing `Value` or `Components` columns gracefully
- Handle files with different header offsets (dynamic detection)
- Skip blank lines and malformed rows
- Return correct `NodeCoordinates[]` with proper numeric types

### Integration Tests

**Full pipeline test**:
1. Use sample coordinate file + sample stress files
2. Verify join produces matching nodeIds
3. Verify worst 10,000 nodes are correctly sorted by minSF
4. Verify bounding box covers all matched coordinates
5. Verify response JSON serialization (no NaN/Infinity)

### Visual Validation

- Load reference coordinate file (`Lower_Car_ASSY-Base Case_coordinates.csv`) + matching stress files
- Verify 3D scatter shows recognizable geometry (the car assembly structure)
- Verify color gradient: red clusters at high-stress regions
- Verify tooltip content matches safety factor data

---

## Future Extensions

- **Component filtering**: Filter 3D points by the `Components` column from the coordinate file
- **Element mesh rendering**: Connect nodes with element topology for a true mesh view
- **Interactive node selection**: Click a 3D point to highlight it in the Haigh diagram
- **Animation**: Step through load cases to see stress migration
- **Export**: Download 3D visualization as HTML or screenshot
- **Level-of-detail**: For >10K points, use octree-based subsampling or clustering
