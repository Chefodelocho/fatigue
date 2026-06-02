# Architecture Guidelines

## System Architecture

### Layered Architecture
The fatigue analysis tool follows a layered architecture pattern:

```
┌─────────────────────────────────────┐
│         Presentation Layer          │  (Next.js App Router, React)
├─────────────────────────────────────┤
│         Application Layer           │  (Use cases, orchestration)
├─────────────────────────────────────┤
│         Domain Layer                │  (Core calculations, types)
├─────────────────────────────────────┤
│         Infrastructure Layer        │  (Data I/O, file parsing, DB)
└─────────────────────────────────────┘
```

### Package Dependencies
Dependency flow must follow the layer order. Inner layers must NOT depend on outer layers:

```
types ← core ← data ← ui ← web
        ↑         ↑
        └─────────┘  (data depends on core for types)
```

- **packages/types**: No dependencies on other packages. Contains shared TypeScript interfaces, branded types for units, and enums.
- **packages/core**: Depends only on `types`. Contains all fatigue calculation algorithms. Pure functions, no side effects.
- **packages/data**: Depends on `core` and `types`. Handles file I/O, signal processing, data transformation.
- **packages/ui**: Depends on `types`. Shared React components, chart templates, design system.
- **apps/web**: Depends on all packages. The Next.js application that wires everything together.

### Core Engine Design Principles

1. **Pure Functions**: All calculation functions must be pure — deterministic outputs for given inputs, no side effects.
2. **Immutability**: Use `readonly` types and `as const` assertions. Never mutate input data.
3. **Explicit Units**: Use branded types (e.g., `MPa`, `Cycles`, `Dimensionless`) to prevent unit confusion at compile time.
4. **Result Type**: Calculations return a `Result<T, E>` type rather than throwing, to handle edge cases gracefully.
5. **Composability**: Small, testable functions composed into larger analysis pipelines.

### Module Organization within packages/core

```
packages/core/src/
├── sn-curve/          # S-N curve definitions and evaluation
├── rainflow/          # Rainflow cycle counting algorithms
├── damage/            # Cumulative damage (Miner's rule, etc.)
├── mean-stress/       # Mean stress corrections (Goodman, Gerber, etc.)
├── concentration/     # Stress concentration factors
├── spectrum/          # Load spectrum handling
├── standards/         # Standard-specific implementations
│   ├── eurocode3/
│   ├── dnvgl/
│   ├── abs/
│   └── iiw/
└── utils/             # Math helpers, interpolation, etc.
```

### Data Flow

```
Raw Data → Importer → Time Series → Rainflow Counter → Cycle Matrix
                                                          ↓
Results ← Damage Calc ← S-N Evaluation ← Load Spectrum ← Cycle Matrix
   ↓
Visualization / Export
```

### API Design (when applicable)

- RESTful API with JSON payloads
- Use schema validation (zod) for all inputs
- Version the API (e.g., `/api/v1/`)
- Return standard error format with error codes
- Support both synchronous (simple) and async (large dataset) processing

### Error Handling Strategy

- **Domain Errors**: Invalid input ranges, convergence failures → `Result.Err`
- **Validation Errors**: Schema validation failures → HTTP 400 with details
- **Infrastructure Errors**: File I/O, network failures → logged + retry where appropriate
- **Never swallow errors**: All errors must propagate or be explicitly handled
