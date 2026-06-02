# Fatigue Analysis Domain Knowledge

## Fundamental Concepts

### Fatigue Failure
Fatigue is the progressive structural damage that occurs when a material is subjected to cyclic loading. The failure typically occurs at stress levels much lower than the ultimate tensile strength of the material. Fatigue failures account for approximately 80-90% of all mechanical failures.

### S-N Curve (Wöhler Curve)
The S-N curve relates the stress amplitude (S) to the number of cycles to failure (N).

**Basquin's Equation** (high-cycle fatigue regime):
```
S = Sf' × (2N)^b
```
Where:
- `Sf'` = fatigue strength coefficient
- `b` = fatigue strength exponent (Basquin's exponent, typically -0.05 to -0.12)
- `2N` = number of stress reversals

**S-N Curve Parameters by Standard**:
- Eurocode 3: log N = log a - m × log Δσ (with detail categories)
- DNVGL-RP-C203: log N = log a - m × log Δσ (with different curves for air/seawater)
- IIW: Similar log-log formulation with FAT classes

### Rainflow Cycle Counting (ASTM E1049)
Rainflow counting extracts complete stress cycles from a variable-amplitude loading history. Two main algorithms:

1. **4-Point Method** (recommended for digital implementation):
   - Consider 4 consecutive stress points σ1, σ2, σ3, σ4
   - If the inner range Δσ34 ≤ Δσ12, count a cycle from σ2 to σ3
   - Residuals are stored and processed at the end

2. **Hysteresis Loop Method** (original Matsuishi & Endo):
   - Based on stress-strain hysteresis behavior
   - A cycle is counted when a closed hysteresis loop is formed

### Miner's Rule (Palmgren-Miner Linear Damage Accumulation)
```
D = Σ(ni / Ni)
```
Where:
- `D` = cumulative damage ratio (failure at D ≥ 1.0)
- `ni` = number of applied cycles at stress range i
- `Ni` = number of cycles to failure at stress range i (from S-N curve)

**Modifications**:
- **Miner's Rule with safety**: D_crit = 1.0 / γF (with partial safety factor)
- **Modified Miner's Rule**: Some standards use D < 0.5 or other thresholds
- **Relative Miner's Rule**: Accounts for sequence effects

### Mean Stress Correction
Mean stress (σm) significantly affects fatigue life. Common correction methods:

1. **Goodman** (conservative, good for brittle materials):
   ```
   σar = σa × σu / (σu - σm)
   ```

2. **Gerber** (less conservative, better for ductile materials):
   ```
   σar = σa / (1 - (σm/σu)²)
   ```

3. **Soderberg** (most conservative):
   ```
   σar = σa × σy / (σy - σm)
   ```

4. **Morrow**:
   ```
   σar = σa / (1 - σm/σf')
   ```

Where:
- `σa` = stress amplitude
- `σm` = mean stress
- `σu` = ultimate tensile strength
- `σy` = yield strength
- `σf'` = fatigue strength coefficient
- `σar` = equivalent fully-reversed stress amplitude

### Stress Concentration Factor (SCF)
```
σmax = Kt × σnom
```
Where:
- `Kt` = theoretical stress concentration factor
- `σnom` = nominal stress

For fatigue analysis, the fatigue strength reduction factor `Kf` is often used:
```
Kf = 1 + q × (Kt - 1)
```
Where `q` is the notch sensitivity factor.

### Load Spectrum
A load spectrum describes the distribution of stress ranges and their expected number of occurrences. Common representations:

1. **Cycle Matrix (Markov Matrix)**: 2D histogram of (range, mean) pairs
2. **Range-Pair Spectrum**: Stress range vs. cumulative cycles
3. **Level Crossing Spectrum**: Count of crossings at each stress level
4. **From-To Matrix**: Transition counts between stress levels

## Key Standards Reference

### DIN EN 1993-1-9 (Eurocode 3)
- Detail categories (ΔσC) at 2×10⁶ cycles
- Constant amplitude fatigue limit at 5×10⁶ cycles
- Cut-off limit at 10⁸ cycles
- Slope m = 3 (for most details), m = 4 (for welded components), m = 5 (for some details)
- Damage equivalence factors (λ) for variable amplitude loading

### DNVGL-RP-C203
- Fatigue design curves for steel in air and in seawater
- B1, B2, C, C1, C2, D, E, F, F1, F3, G, W1, W2, W3 detail classes
- Thickness correction: σ = σref × (tref/t)^n
- SCF calculation formulas for tubular joints
- Stress analysis methods: nominal stress, structural (hot-spot) stress, notch stress

### IIW Recommendations
- FAT classes expressed as Δσ at 2×10⁶ cycles
- Nominal stress, structural stress, and effective notch stress approaches
- Quality groups for welds (B, C, D, E)

## Numerical Considerations

### Interpolation
- Use log-log interpolation for S-N curve evaluation
- Linear interpolation on log(Δσ) vs log(N) scale
- Extrapolation beyond data range should be flagged/warned

### Precision
- Stress values: minimum 3 significant figures
- Cycle counts: integer values for counting, float for damage accumulation
- Damage values: full floating-point precision, report to 6 decimal places
- Logarithmic values: use natural log (ln) or log10 consistently within a standard

### Validation Benchmarks
- S-N curve evaluation: verify against published detail category tables
- Rainflow counting: compare with ASTM E1049 examples
- Miner's rule: verify D=1.0 for constant amplitude loading at the design life
- Mean stress correction: verify extremes (σm=0 → no correction, σm→σu → infinite correction)
