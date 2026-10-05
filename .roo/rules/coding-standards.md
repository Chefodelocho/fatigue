# Coding Standards

## TypeScript Configuration

### Strict Mode

All packages must use TypeScript strict mode with the following compiler options:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "noPropertyAccessFromIndexSignature": true
  }
}
```

### Naming Conventions

- **Files**: kebab-case (e.g., `sn-curve.ts`, `rainflow-counter.ts`)
- **Interfaces**: PascalCase with `I` prefix only for contract interfaces (e.g., `ISNCurve`, `IRainflowResult`)
- **Types**: PascalCase (e.g., `StressRange`, `CycleCount`)
- **Functions**: camelCase (e.g., `calculateDamage`, `evaluateSNCurve`)
- **Constants**: UPPER_SNAKE_CASE for true constants (e.g., `DEFAULT_SAFETY_FACTOR`)
- **Branded types**: PascalCase matching unit names (e.g., `MPa`, `Cycles`, `Dimensionless`)

### Branded Types for Units

All numerical values in the domain layer must use branded types to prevent unit confusion:

```typescript
// packages/types/src/units.ts
type Brand<T, B> = T & { readonly __brand: B };

type MPa = Brand<number, 'MPa'>;
type Cycles = Brand<number, 'Cycles'>;
type Dimensionless = Brand<number, 'Dimensionless'>;
type DamageRatio = Brand<number, 'DamageRatio'>;
```

### Result Type Pattern

All calculation functions must return a Result type instead of throwing:

```typescript
type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

// Usage example
function evaluateSNCurve(curve: SNCurve, stressRange: MPa): Result<Cycles, SNCurveError> {
  // ...
}
```

### Function Documentation

Every exported function must have a JSDoc comment with:

- Description of what the function calculates
- `@param` descriptions with units
- `@returns` description with type
- `@example` for complex functions
- Reference to the standard or paper (e.g., `@see DIN EN 1993-1-9, Section 7.1`)

````typescript
/**
 * Calculates the fatigue life (number of cycles to failure) for a given stress range
 * using the S-N curve defined by Basquin's equation.
 *
 * @param curve - The S-N curve parameters
 * @param stressRange - Stress range in MPa
 * @returns Result containing cycles to failure or an error
 *
 * @example
 * ```ts
 * const result = evaluateSNCurve(ec3Detail160, MPa(100));
 * if (result.ok) console.log(`N = ${result.value} cycles`);
 * ```
 *
 * @see DIN EN 1993-1-9, Section 7.1
 */
````

## Testing Standards

### Test File Organization

- Unit tests: co-located with source files (e.g., `sn-curve.test.ts` next to `sn-curve.ts`)
- Integration tests: in `tests/` directory at the project root
- Validation tests: in `tests/validation/` with reference to standard/section

### Test Naming

Use descriptive test names following the pattern: `describe > it should...`

```typescript
describe('evaluateSNCurve', () => {
  it('should return correct cycles for EC3 detail category 160 at Δσ = 100 MPa', () => {
    // ...
  });

  it('should return error when stress range is negative', () => {
    // ...
  });
});
```

### Numerical Tolerance

- Use relative tolerance for comparisons: `|expected - actual| / |expected| < tolerance`
- Default tolerance: 1e-6 for damage calculations, 1e-3 for stress values
- Always document the tolerance used in test assertions

### Test Coverage Requirements

- Core calculation functions: 100% branch coverage
- Data processing: 90% line coverage
- UI components: 80% line coverage
- Integration tests must cover all major workflows

## Code Quality

### Linting

- ESLint with `@typescript-eslint/recommended` and `@typescript-eslint/strict` presets
- No `any` types allowed (use `unknown` and type guards)
- No non-null assertions (use proper null checks)
- Prefer `interface` over `type` for object shapes

### Formatting

- Prettier with the following configuration:

```json
{
  "printWidth": 100,
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "tabWidth": 2
}
```

### Import Organization

Order imports by scope with blank lines between groups:

1. Node.js built-ins
2. External packages
3. Internal packages (by layer: types → core → data → ui)
4. Relative imports

```typescript
import { readFileSync } from 'fs';

import { z } from 'zod';

import { type MPa, type Cycles } from '@fatigue/types';
import { evaluateSNCurve } from '@fatigue/core';

import { parseCSV } from './csv-parser';
```
