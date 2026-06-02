# Fatigue — Web-Based Fatigue Analysis Tool

A modern, extensible, web-based platform for performing fatigue life assessments using industry-standard methodologies.

## Overview

Fatigue provides engineers with an interactive tool for analyzing structural and mechanical fatigue. It supports multiple international standards and offers real-time visualization of analysis results.

### Key Features (Planned)

- **S-N Curve Analysis**: Define and evaluate S-N (Wöhler) curves per material and standard
- **Rainflow Cycle Counting**: ASTM E1049-compliant cycle extraction from time-series data
- **Cumulative Damage**: Palmgren-Miner linear damage accumulation
- **Mean Stress Correction**: Goodman, Gerber, Soderberg, and Morrow methods
- **Stress Concentration**: SCF calculation for common geometric features
- **Load Spectrum Processing**: Import, generate, and manipulate load spectra
- **Multi-Standard Support**: Eurocode 3, DNVGL-RP-C203, ABS, API 579, IIW
- **Interactive Visualizations**: S-N plots, damage accumulation charts, Goodman diagrams
- **Data Import**: CSV, HDF5, and custom format support

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript (strict mode) |
| Frontend | Next.js 14+ (App Router), React 18+ |
| Charts | Plotly.js / D3.js |
| Styling | Tailwind CSS |
| State | Zustand |
| Testing | Vitest (unit), Playwright (E2E) |
| Build | pnpm workspaces, Turbopack |
| CI/CD | GitHub Actions |

## Project Structure

```
fatigue/
├── .roo/                    # Roo Code configuration
│   ├── mcp.json             # MCP server configuration
│   └── rules/               # Context rules for AI agents
├── .roomodes                # Custom Roo Code mode definitions
├── apps/
│   └── web/                 # Next.js frontend application
├── packages/
│   ├── core/                # Core fatigue calculation engine
│   ├── data/                # Data processing & pipeline utilities
│   ├── types/               # Shared TypeScript types & interfaces
│   └── ui/                  # Shared UI component library
├── docs/                    # Documentation
├── tests/                   # Integration & validation tests
│   └── validation/          # Standard-specific validation cases
└── data/                    # Sample datasets & reference data
```

## Getting Started

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 8

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd fatigue

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run development server
pnpm dev
```

### Development Commands

```bash
pnpm dev          # Start development server
pnpm build        # Build all packages
pnpm test         # Run all tests
pnpm lint         # Lint all packages
pnpm clean        # Clean build artifacts
```

## AI-Assisted Development with Roo Code

This project is configured for AI-assisted development using [Roo Code](https://roocode.com/) with specialized modes:

| Mode | Description |
|------|-------------|
| 🏗️ Fatigue Architect | System design, architecture decisions |
| ⚙️ Fatigue Engine Dev | Core calculation algorithms |
| 🎨 Fatigue UI Dev | Frontend & visualization components |
| 📊 Fatigue Data Engineer | Data pipelines & processing |
| 🧪 Fatigue QA Engineer | Testing & validation |
| 📝 Fatigue Tech Writer | Documentation |
| 🚀 Fatigue DevOps | CI/CD & build pipeline |

### Context Files

The `.roo/rules/` directory contains domain knowledge that Roo Code agents use:

- `project-overview.md` — Project vision, structure, and conventions
- `architecture.md` — System architecture and design patterns
- `fatigue-domain.md` — Fatigue analysis domain knowledge & formulas
- `coding-standards.md` — TypeScript standards, testing, and formatting rules

## Development Phases

1. **Phase 1**: Core engine — S-N curves, rainflow counting, Miner's rule
2. **Phase 2**: Data pipeline — CSV import, signal processing, load spectra
3. **Phase 3**: Web UI — Interactive dashboard, plot components, input forms
4. **Phase 4**: Multi-standard support — Add design standard libraries
5. **Phase 5**: Advanced features — Probabilistic analysis, FEA integration

## License

TBD
