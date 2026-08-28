<div align="center">

# Fatigue Analysis Tool

**SolidWorks FEM fatigue analysis — straight from your browser**

[![CI](https://github.com/Chefodelocho/fatigue/actions/workflows/ci.yml/badge.svg)](https://github.com/Chefodelocho/fatigue/actions/workflows/ci.yml)
[![Docker](https://github.com/Chefodelocho/fatigue/actions/workflows/docker.yml/badge.svg)](https://github.com/Chefodelocho/fatigue/actions/workflows/docker.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-strict-blue)](https://www.typescriptlang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

</div>

---

Take a SolidWorks FEM stress export, drop it in, and get an **interactive Haigh diagram**, **per-node safety factors across all four stress components** (Von Mises, P1, P2, P3), and a **3D scatter plot** of your entire mesh — in seconds. No spreadsheets, no manual post-processing.

---

## Quick Start

### Option A — Docker (recommended, no Node.js required)

```bash
git clone https://github.com/Chefodelocho/fatigue.git
cd fatigue
docker compose up -d
```

Open [http://localhost:3000](http://localhost:3000).

### Option B — Local development

```bash
git clone https://github.com/Chefodelocho/fatigue.git
cd fatigue
corepack enable && corepack prepare pnpm@9.1.0 --activate
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## What It Does

1. **Import FEM data** — Upload a SolidWorks stress results CSV (Von Mises + principal stresses per node).
2. **Select your material** — Choose from the built-in library or enter custom ultimate/yield strength values.
3. **Run the analysis** — The engine applies Goodman, Gerber, and Soderberg mean stress correction and computes a safety factor for every node.
4. **Explore the results** — Interactive Haigh diagram, colour-coded 3D scatter plot, and a sortable table of critical nodes. Switch between stress components with a single click.
5. **Save & compare** — Analyses are stored per session so you can compare configurations side by side.

---

## Screenshots

### Upload & Configure

Drop in a SolidWorks FEM CSV export and set material properties before running the analysis.

<!-- Add screenshot: drag-and-drop upload panel with material selector -->
![Upload Interface](docs/screenshots/01-upload.png)

---

### Haigh Diagram

Interactive σ_m vs σ_a diagram with Goodman, Gerber, and Soderberg failure envelopes overlaid on the FEM node scatter. Click any node for its coordinates and safety factor.

<!-- Add screenshot: Haigh diagram with node scatter and failure lines -->
![Haigh Diagram](docs/screenshots/02-haigh-diagram.png)

---

### 3D Safety Factor Visualization

All FEM nodes plotted in 3D space, coloured by safety factor. Rotate, zoom, and hover to inspect any node. Switch between Von Mises, P1, P2, and P3 instantly.

<!-- Add screenshot: 3D scatter plot coloured by safety factor -->
![3D Safety Factor Scatter](docs/screenshots/03-3d-scatter.png)

---

### Analysis History

Session-saved analyses listed for easy comparison. Re-run with a different material or standard without re-uploading your data.

<!-- Add screenshot: analysis history sidebar/table -->
![Analysis History](docs/screenshots/04-results-table.png)

---

### SolidWorks Export (reference)

Example SolidWorks FEM result export used as input. Export as CSV from the Results section of a Simulation study.

<!-- Add screenshot: SolidWorks FEM results table or export dialog -->
![SolidWorks Export](docs/screenshots/05-solidworks-export.png)

> **To add screenshots:** place `.png` files in `docs/screenshots/` with the filenames above, then remove the HTML comment on that line.

---

## Key Features

| Feature | Details |
|---|---|
| **Haigh Diagram** | Interactive σ_m vs σ_a plot with Goodman, Gerber & Soderberg lines |
| **Safety Factors** | Per-node SF across Von Mises, P1, P2, and P3 stress components |
| **3D Scatter Plot** | Full mesh visualisation coloured by safety factor; rotate & zoom |
| **Mean Stress Correction** | Goodman, Gerber, Soderberg, Morrow |
| **SolidWorks CSV Import** | Direct import of FEM stress result exports |
| **Rainflow Counting** | ASTM E1049-compliant cycle extraction |
| **Cumulative Damage** | Palmgren-Miner linear damage accumulation |
| **Session Caching** | Each browser session is isolated — safe for multi-user deployments |
| **Docker Ready** | Multi-stage build, health checks, non-root user |

---

## Technology Stack

| Layer | Technology |
|---|---|
| Language | TypeScript (strict) |
| Frontend | Next.js 14, React 18 |
| Visualisation | Plotly.js |
| Styling | Tailwind CSS |
| State | Zustand |
| Testing | Vitest, Playwright |
| Packages | pnpm workspaces |
| Container | Docker, Docker Compose |
| CI/CD | GitHub Actions |

---

## Project Structure

```
fatigue/
├── apps/web/             # Next.js application
├── packages/
│   ├── core/             # Fatigue calculation engine (pure functions)
│   │   ├── sn-curve/     # S-N curve evaluation
│   │   ├── rainflow/     # ASTM E1049 cycle counting
│   │   ├── damage/       # Palmgren-Miner accumulation
│   │   ├── mean-stress/  # Goodman / Gerber / Soderberg / Morrow
│   │   ├── concentration/# Stress concentration factors
│   │   └── standards/    # Design standard helpers
│   ├── data/             # FEM CSV parser & data pipeline
│   ├── types/            # Shared TypeScript types & branded units
│   └── ui/               # Shared React components
├── docs/                 # Documentation & screenshots
├── data/                 # Sample FEM datasets
├── tests/                # Integration & E2E tests
├── Dockerfile
├── docker-compose.yml
└── docker-compose.dev.yml
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check for container orchestration |
| `GET` | `/api/analyze` | Analyse built-in sample dataset |
| `POST` | `/api/analyze-upload` | Upload and analyse a SolidWorks CSV |
| `POST` | `/api/recompute` | Re-run with different material (uses cached parse) |
| `GET` | `/api/analyses` | List saved analyses for the current session |
| `GET` | `/api/analyses/[id]` | Retrieve a specific saved analysis |

Session isolation is handled via a `fatigue-session-id` cookie — each browser gets its own result cache, making multi-user Docker deployments safe without any authentication setup.

---

## Docker — Production Notes

```bash
# Generate a session secret and start
echo "SESSION_COOKIE_SECRET=$(openssl rand -hex 32)" > .env
docker compose up -d

# Logs
docker compose logs -f

# Stop
docker compose down
```

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the full production checklist (environment variables, volumes, reverse-proxy, TLS).

### Hot-reload in development

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

---

## Development Commands

| Command | Description |
|---|---|
| `pnpm dev` | Start dev server |
| `pnpm build` | Build all packages |
| `pnpm test` | Run all tests |
| `pnpm lint` | Lint all packages |
| `pnpm typecheck` | Type-check all packages |
| `pnpm format` | Format with Prettier |
| `pnpm clean` | Remove build artefacts |

---

## Roadmap

- [x] Core engine — S-N curves, rainflow counting, Miner's rule
- [x] SolidWorks FEM CSV import & stress parsing
- [x] Haigh diagrams, 3D scatter, analysis history
- [ ] Multi-standard library — Eurocode 3, DNVGL-RP-C203, IIW, API 579
- [ ] Probabilistic fatigue analysis
- [ ] General FEA import (Ansys, Abaqus, Nastran)

---

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow, coding standards, and PR process.

## Security

Please follow [SECURITY.md](SECURITY.md) for responsible disclosure. Do not open public issues for security vulnerabilities.

## License

[MIT](LICENSE)

---

<div align="center">
  Built for engineers, by engineers.
</div>
