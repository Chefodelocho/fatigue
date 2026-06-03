<div align="center">

# Fatigue

**A modern, web-based fatigue analysis tool for structural and mechanical engineering**

[![CI](https://github.com/<your-org>/fatigue/actions/workflows/ci.yml/badge.svg)](https://github.com/<your-org>/fatigue/actions/workflows/ci.yml)
[![Docker](https://github.com/<your-org>/fatigue/actions/workflows/docker.yml/badge.svg)](https://github.com/<your-org>/fatigue/actions/workflows/docker.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-strict-blue)](https://www.typescriptlang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

</div>

---

## Overview

**Fatigue** is an open-source, extensible platform for performing fatigue life
assessments using industry-standard methodologies. It provides engineers with
interactive tools for analyzing structural and mechanical fatigue, supporting
multiple international standards with real-time visualization of results.

### Key Features

- **S-N Curve Analysis** — Define and evaluate S-N (Wöhler) curves per material and standard
- **Rainflow Cycle Counting** — ASTM E1049-compliant cycle extraction from time-series data
- **Cumulative Damage** — Palmgren-Miner linear damage accumulation
- **Mean Stress Correction** — Goodman, Gerber, Soderberg, and Morrow methods
- **Stress Concentration** — SCF calculation for common geometric features
- **Load Spectrum Processing** — Import, generate, and manipulate load spectra
- **Multi-Standard Support** — Eurocode 3, DNVGL-RP-C203, ABS, API 579, IIW
- **Interactive Visualizations** — S-N plots, Haigh diagrams, 3D scatter plots
- **Data Import** — CSV, HDF5, and custom format support
- **Session-Isolated Caching** — Results are cached per browser session via secure cookies, enabling safe multi-user Docker deployments
- **Docker Ready** — Production-grade Docker setup with health checks and non-root user

## Technology Stack

| Layer            | Technology                                    |
|------------------|-----------------------------------------------|
| Language         | TypeScript (strict mode)                      |
| Frontend         | Next.js 14+ (App Router), React 18+           |
| Charts           | Plotly.js                                     |
| Styling          | Tailwind CSS                                  |
| State Management | Zustand                                       |
| Testing          | Vitest (unit), Playwright (E2E)               |
| Package Manager  | pnpm workspaces                               |
| Containerization | Docker, Docker Compose                        |
| CI/CD            | GitHub Actions                                |

## Project Structure

```
fatigue/
├── apps/
│   └── web/              # Next.js frontend application
├── packages/
│   ├── core/             # Core fatigue calculation engine (pure functions)
│   ├── data/             # Data processing & pipeline utilities
│   ├── types/            # Shared TypeScript types & branded units
│   └── ui/               # Shared React UI component library
├── docs/                 # Documentation
├── tests/                # Integration, validation & E2E tests
├── data/                 # Sample datasets & reference data
├── .github/              # CI/CD workflows & issue templates
│   ├── workflows/
│   │   ├── ci.yml        # Continuous integration
│   │   ├── docker.yml    # Docker image build & publish
│   │   └── release.yml   # Release automation
│   └── ISSUE_TEMPLATE/   # Bug report & feature request templates
├── Dockerfile            # Multi-stage Docker build
├── docker-compose.yml    # Production Docker Compose
├── docker-compose.dev.yml# Development Docker Compose
├── LICENSE               # MIT License
├── CONTRIBUTING.md       # Contribution guidelines
├── SECURITY.md           # Security policy
└── CODE_OF_CONDUCT.md    # Code of conduct
```

## Getting Started

### Prerequisites

- **Node.js** ≥ 20
- **pnpm** ≥ 8 (install via `corepack enable && corepack prepare pnpm@9.1.0 --activate`)

### Local Development

```bash
# Clone the repository
git clone https://github.com/<your-org>/fatigue.git
cd fatigue

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run development server
pnpm dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

### Docker Deployment

```bash
# Production build and run
docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

The application will be available at [http://localhost:3000](http://localhost:3000).

### Docker Development (with hot-reloading)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

### Development Commands

| Command               | Description                        |
|-----------------------|------------------------------------|
| `pnpm dev`            | Start development server           |
| `pnpm build`          | Build all packages                  |
| `pnpm test`           | Run all tests                       |
| `pnpm lint`           | Lint all packages                   |
| `pnpm format`         | Format code with Prettier           |
| `pnpm format:check`   | Check formatting                    |
| `pnpm clean`          | Clean build artifacts               |
| `pnpm typecheck`      | Type-check all packages             |

## Architecture

### Layered Design

```
┌─────────────────────────────────────┐
│         Presentation Layer          │  Next.js App Router, React
├─────────────────────────────────────┤
│         Application Layer           │  Use cases, orchestration
├─────────────────────────────────────┤
│         Domain Layer                │  Core calculations, types
├─────────────────────────────────────┤
│         Infrastructure Layer        │  Data I/O, file parsing
└─────────────────────────────────────┘
```

### Package Dependencies

```
types ← core ← data ← ui ← web
        ↑         ↑
        └─────────┘  (data depends on core for types)
```

### Data Flow

```
Raw Data → Importer → Time Series → Rainflow Counter → Cycle Matrix
                                                          ↓
Results ← Damage Calc ← S-N Evaluation ← Load Spectrum ← Cycle Matrix
   ↓
Visualization / Export
```

## API Endpoints

| Method | Endpoint              | Description                                  |
|--------|-----------------------|----------------------------------------------|
| GET    | `/api/health`         | Health check for Docker container orchestration |
| GET    | `/api/analyze`        | Analyze reference dataset (session-cached)   |
| POST   | `/api/analyze-upload` | Upload and analyze custom CSV files          |

All analysis endpoints use session-isolated caching. The `fatigue-session-id`
cookie ensures each browser session gets its own cached result.

## Supported Standards (Planned)

- **DIN EN 1993-1-9** (Eurocode 3 - Steel structures)
- **DNVGL-RP-C203** (Offshore structures)
- **ABS** (American Bureau of Shipping)
- **API 579-1/ASME FFS-1** (Fitness-for-Service)
- **IIW** (International Institute of Welding)

## Development Roadmap

- **Phase 1** ✅ Core engine — S-N curves, rainflow counting, Miner's rule
- **Phase 2** 🚧 Data pipeline — CSV import, signal processing, load spectra
- **Phase 3** 🚧 Web UI — Interactive dashboard, plot components, input forms
- **Phase 4** ⬜ Multi-standard support — Add design standard libraries
- **Phase 5** ⬜ Advanced features — Probabilistic analysis, FEA integration

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md)
for details on:

- Development setup and workflow
- Coding standards and TypeScript conventions
- Testing requirements
- Pull request process

## Security

If you discover a security vulnerability, please follow our [Security Policy](SECURITY.md)
for responsible disclosure. **Do not** report security issues via public GitHub issues.

## License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">
  Made with ❤️ for the engineering community
</div>
