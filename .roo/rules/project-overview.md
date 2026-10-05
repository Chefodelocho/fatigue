# Fatigue Analysis Tool - Project Overview

## Project Name

**Fatigue** — A modern, web-based fatigue analysis tool for structural and mechanical engineering.

## Vision

Provide an open-source, extensible platform for performing fatigue life assessments using industry-standard methodologies. The tool should support multiple fatigue analysis standards and provide interactive visualizations for engineers.

## Technology Stack

- **Runtime**: Node.js (v20+)
- **Language**: TypeScript (strict mode)
- **Frontend**: Next.js 14+ (App Router), React 18+
- **Charting**: Plotly.js or D3.js for engineering visualizations
- **State Management**: Zustand or React Context
- **Styling**: Tailwind CSS
- **Testing**: Vitest (unit), Playwright (E2E)
- **Build**: Turbopack (dev), webpack (prod)
- **Package Manager**: pnpm

## Monorepo Structure

```
fatigue/
├── apps/
│   ├── web/          # Next.js frontend application
│   └── api/          # API server (if separate from web)
├── packages/
│   ├── core/         # Core fatigue calculation engine
│   ├── data/         # Data processing & pipeline utilities
│   ├── ui/           # Shared UI component library
│   └── types/        # Shared TypeScript types & interfaces
├── docs/             # Documentation
├── tests/            # Integration & validation tests
└── data/             # Sample datasets & reference data
```

## Key Domain Concepts

- **S-N Curve**: Stress vs. number of cycles to failure relationship for materials
- **Rainflow Counting**: Cycle counting algorithm per ASTM E1049
- **Miner's Rule**: Linear cumulative damage accumulation (Palmgren-Miner)
- **Goodman Diagram**: Mean stress correction method
- **Stress Concentration Factor (SCF)**: Local stress amplification at geometric discontinuities
- **Fatigue Damage**: Cumulative damage metric (D = Σ(ni/Ni)), failure at D ≥ 1.0
- **Load Spectrum**: Distribution of stress ranges and their occurrence counts

## Supported Analysis Standards (Planned)

- DIN EN 1993-1-9 (Eurocode 3 - Steel structures)
- DNVGL-RP-C203 (Offshore structures)
- ABS (American Bureau of Shipping)
- API 579-1/ASME FFS-1 (Fitness-for-Service)
- IIW (International Institute of Welding)

## Development Phases

1. **Phase 1**: Core engine — S-N curves, rainflow counting, Miner's rule
2. **Phase 2**: Data pipeline — CSV import, signal processing, load spectra
3. **Phase 3**: Web UI — Interactive dashboard, plot components, input forms
4. **Phase 4**: Multi-standard support — Add design standard libraries
5. **Phase 5**: Advanced features — Probabilistic analysis, FEA integration

## Coding Conventions

- Use TypeScript strict mode everywhere
- All numerical values must have explicit units (use branded types for unit safety)
- Every calculation function must have corresponding test cases
- Use descriptive variable names matching engineering notation
- Document all formulas with references to standards/papers
