# Contributing to Fatigue

Thank you for your interest in contributing to **Fatigue** — the open-source,
web-based fatigue analysis tool for structural and mechanical engineering.

We welcome contributions of all kinds: bug reports, feature requests,
documentation improvements, and code contributions.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)
- [License](#license)

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](./CODE_OF_CONDUCT.md).
By participating, you are expected to uphold this code. Please report unacceptable
behavior to the project maintainers.

## Getting Started

1. **Fork** the repository on GitHub.
2. **Clone** your fork:
   ```bash
   git clone https://github.com/<your-username>/fatigue.git
   cd fatigue
   ```
3. **Install** dependencies:
   ```bash
   pnpm install
   ```
4. **Build** all packages:
   ```bash
   pnpm build
   ```
5. **Run** the development server:
   ```bash
   pnpm dev
   ```

## Development Setup

### Prerequisites

- **Node.js** ≥ 20.x
- **pnpm** ≥ 8.x (install via `corepack enable && corepack prepare pnpm@9.1.0 --activate`)

### Installing Dependencies

```bash
pnpm install
```

### Development Commands

| Command             | Description                      |
| ------------------- | -------------------------------- |
| `pnpm dev`          | Start Next.js development server |
| `pnpm build`        | Build all packages               |
| `pnpm test`         | Run all tests                    |
| `pnpm test:watch`   | Run tests in watch mode          |
| `pnpm lint`         | Lint all packages                |
| `pnpm format`       | Format code with Prettier        |
| `pnpm format:check` | Check formatting without writing |
| `pnpm clean`        | Clean build artifacts            |
| `pnpm typecheck`    | Type-check all packages          |

### Docker Development

```bash
# Build and run in production mode
docker compose up -d

# Development with hot-reloading
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

## Project Structure

```
fatigue/
├── apps/
│   └── web/           # Next.js frontend application
├── packages/
│   ├── core/          # Core fatigue calculation engine (pure functions)
│   ├── data/          # Data processing & pipeline utilities
│   ├── types/         # Shared TypeScript types & branded units
│   └── ui/            # Shared React UI component library
├── docs/              # Documentation
├── tests/             # Integration & validation tests
├── data/              # Sample datasets & reference data
└── .github/           # CI/CD workflows & issue templates
```

## Coding Standards

### TypeScript

- **Strict mode** is enforced across all packages — see [`tsconfig.base.json`](./tsconfig.base.json)
- No `any` types — use `unknown` with type guards
- No non-null assertions (`!`) — use proper null checks
- Prefer `interface` over `type` for object shapes

### Naming Conventions

- **Files**: `kebab-case` (e.g., `sn-curve.ts`, `rainflow-counter.ts`)
- **Interfaces**: `PascalCase` with `I` prefix only for contract interfaces
- **Types**: `PascalCase`
- **Functions**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`

### Unit Safety

All numerical values in the domain layer **must** use branded types:

```typescript
type MPa = Brand<number, 'MPa'>;
type Cycles = Brand<number, 'Cycles'>;
```

### Result Type Pattern

All calculation functions return a `Result<T, E>` type instead of throwing:

```typescript
type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };
```

### Import Order

1. Node.js built-ins
2. External packages
3. Internal packages (types → core → data → ui)
4. Relative imports

### Formatting

We use [Prettier](https://prettier.io/) with the following settings:

- `printWidth: 100`
- `semi: true`
- `singleQuote: true`
- `trailingComma: 'all'`
- `tabWidth: 2`

## Testing

- **Unit tests**: Co-located with source files (`calculate-damage.test.ts`)
- **Integration tests**: In [`tests/integration/`](./tests/integration/)
- **Validation tests**: In [`tests/validation/`](./tests/validation/)
- **E2E tests**: In [`tests/e2e/`](./tests/e2e/)

Run tests with:

```bash
pnpm test                 # All tests
pnpm --filter @fatigue/core test  # Single package
```

### Coverage Requirements

| Layer | Branch/Line Coverage |
| ----- | -------------------- |
| Core  | 100% branch          |
| Data  | 90% line             |
| UI    | 80% line             |
| Web   | 80% line             |

## Pull Request Process

1. **Create a branch**: `git checkout -b feat/your-feature-name`
2. **Make your changes** following the coding standards above
3. **Write/update tests** as needed
4. **Run all checks**:
   ```bash
   pnpm typecheck && pnpm lint && pnpm test
   ```
5. **Commit your changes** using [Conventional Commits](https://www.conventionalcommits.org/):
   ```
   feat(core): add rainflow cycle counting algorithm
   fix(web): correct Haigh diagram axis scaling
   docs: update API documentation
   ```
6. **Push** to your fork: `git push origin feat/your-feature-name`
7. **Open a Pull Request** against the `main` branch

### PR Checklist

- [ ] Code follows project coding standards
- [ ] Tests added/updated and passing
- [ ] Documentation updated (JSDoc, README, or docs/)
- [ ] TypeScript strict mode passes (`pnpm typecheck`)
- [ ] Linting passes (`pnpm lint`)
- [ ] All new and existing tests pass (`pnpm test`)

## Reporting Issues

- **Bug reports**: Use the [Bug Report template](./.github/ISSUE_TEMPLATE/bug-report.md)
- **Feature requests**: Use the [Feature Request template](./.github/ISSUE_TEMPLATE/feature-request.md)
- **Security issues**: See [SECURITY.md](./SECURITY.md) for responsible disclosure

When reporting a bug, please include:

- A clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version, browser)
- Any relevant logs or screenshots

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
