# FEM Simulation Data Structure

## Overview

The fatigue analysis tool consumes stress output from FEM (Finite Element Method) simulations exported as CSV files. Two reference datasets are provided:

| Property        | Base Case                           | Loading Case                            |
| --------------- | ----------------------------------- | --------------------------------------- |
| **File**        | `data/reference/base/Base_Case.csv` | `data/reference/load/Running_Ex_CD.csv` |
| **Study Name**  | Base Case                           | Running Ex CD                           |
| **File Size**   | 84 MB                               | 84 MB                                   |
| **Total Lines** | 931,983                             | 931,991                                 |
| **Data Rows**   | 931,978                             | 931,986                                 |
| **Node Range**  | 1 – 931,978                         | 1 – 931,986                             |

The **Base Case** represents the static/dead-load condition. The **Loading Case** (Running Ex CD) represents the operational/live-load condition. For fatigue analysis, stress ranges are derived from the superposition or differencing of these two states.

---

## File Format

### Header (Lines 1–4)

Each file begins with a 4-line metadata header:

```
Line 1: Timestamp                 (e.g., "05:17, Friday, May 29, 2026")
Line 2: Study name                (e.g., "Study name:Base Case")
Line 3: Units                     (e.g., "Units: N/m^2")
Line 4: Selected reference        (e.g., "Selected reference : Front")
```

**Key detail:** All stress values are in **N/m² (Pascals)**. Conversion to MPa requires dividing by 10⁶.

### Column Header (Line 5)

```
Node  ,P1  ,P2  ,P3  ,VON  ,INT  ,TRI
```

### Data Rows (Lines 6+)

Each row represents one FEM node with its stress state:

```
1  ,4.73886e+04  ,6.34324e+03  ,8.82852e+01  ,4.45037e+04  ,4.73003e+04  ,5.38201e+04
2  ,1.00757e+04  ,4.70566e+02  ,-2.77851e+03  ,1.15769e+04  ,1.28542e+04  ,7.76778e+03
```

### Encoding & Formatting Notes

- **Line endings:** Windows-style CRLF (`\r\n`) — the `\r` (shown as `^M`) is present at end of each line.
- **Delimiter:** Comma-separated with whitespace padding around values (e.g., `1  ,4.738e+04  ,...`).
- **Numeric format:** Scientific notation with 6 significant digits (e.g., `4.73886e+04`, `-2.77851e+03`).
- **No trailing footer:** The last data line is the final line in the file.

---

## Column Definitions

| Column | Name     | Description                                                 | Sign       | Unit |
| ------ | -------- | ----------------------------------------------------------- | ---------- | ---- | ----- | --- | ----- | --- | ---------- | ---- |
| 1      | **Node** | FEM mesh node ID (1-based integer)                          | Always ≥ 0 | —    |
| 2      | **P1**   | First principal stress (maximum)                            | Signed (±) | N/m² |
| 3      | **P2**   | Second principal stress (intermediate)                      | Signed (±) | N/m² |
| 4      | **P3**   | Third principal stress (minimum)                            | Signed (±) | N/m² |
| 5      | **VON**  | Von Mises equivalent stress                                 | Always ≥ 0 | N/m² |
| 6      | **INT**  | Stress intensity (= max(                                    | P1−P2      | ,    | P2−P3 | ,   | P3−P1 | ))  | Always ≥ 0 | N/m² |
| 7      | **TRI**  | Triaxial sum (= P1 + P2 + P3, i.e., 3 × hydrostatic stress) | Signed (±) | N/m² |

### Relationships Between Columns

- **VON** = √(½ × [(P1−P2)² + (P2−P3)² + (P3−P1)²])
- **INT** = max(|P1−P2|, |P2−P3|, |P3−P1|) = 2 × max shear stress (Tresca equivalent)
- **TRI** = P1 + P2 + P3 = 3 × σ_hydrostatic

---

## Value Ranges

### Base Case (`Base_Case.csv`)

| Column | Min (N/m²)  | Max (N/m²) | Min (MPa) | Max (MPa) |
| ------ | ----------- | ---------- | --------- | --------- |
| P1     | −2.89 × 10⁶ | 8.26 × 10⁷ | −2.89     | 82.6      |
| P2     | −4.08 × 10⁷ | 2.67 × 10⁷ | −40.8     | 26.7      |
| P3     | −7.78 × 10⁷ | 5.08 × 10⁶ | −77.8     | 5.08      |
| VON    | 0           | 8.20 × 10⁷ | 0         | 82.0      |
| INT    | 0           | 8.26 × 10⁷ | 0         | 82.6      |
| TRI    | −1.03 × 10⁸ | 1.03 × 10⁸ | −103      | 103       |

### Loading Case (`Running_Ex_CD.csv`)

| Column | Min (N/m²)  | Max (N/m²) | Min (MPa) | Max (MPa) |
| ------ | ----------- | ---------- | --------- | --------- |
| P1     | −1.45 × 10⁷ | 1.79 × 10⁸ | −14.5     | 179       |
| P2     | −1.66 × 10⁸ | 6.39 × 10⁷ | −166      | 63.9      |
| P3     | −2.38 × 10⁸ | 2.25 × 10⁷ | −238      | 22.5      |
| VON    | 0           | 2.11 × 10⁸ | 0         | 211       |
| INT    | 0           | 2.38 × 10⁸ | 0         | 238       |
| TRI    | −4.04 × 10⁸ | 2.43 × 10⁸ | −404      | 243       |

The loading case shows significantly higher stress magnitudes (roughly 2–3× the base case), which is consistent with operational loading being superimposed on the static dead load.

---

## Node Correspondence

- **Base Case:** 931,978 nodes (IDs 1 through 931,978)
- **Loading Case:** 931,986 nodes (IDs 1 through 931,986)
- **Common nodes:** 931,978 (IDs 1 through 931,978) — all base case nodes are present in the loading case
- **Extra nodes in loading case:** 8 nodes (IDs 931,979 through 931,986)

**Implication:** The loading case mesh contains 8 additional nodes not present in the base case. When computing stress ranges (Δσ = σ_load − σ_base), these 8 nodes must be handled — either excluded or treated with zero base-case stress.

---

## Sample Data

### Base Case (first 5 nodes)

| Node | P1     | P2     | P3      | VON    | INT    | TRI     |
| ---- | ------ | ------ | ------- | ------ | ------ | ------- |
| 1    | 47,389 | 6,343  | 88      | 44,504 | 47,300 | 53,820  |
| 2    | 10,076 | 471    | −2,779  | 11,577 | 12,854 | 7,768   |
| 3    | −578   | −8,687 | −90,110 | 85,765 | 89,531 | −99,375 |
| 4    | 21,395 | 104    | −18,718 | 34,760 | 40,113 | 2,780   |
| 5    | 3,935  | −80    | −32,056 | 34,161 | 35,991 | −28,202 |

### Loading Case (first 5 nodes)

| Node | P1     | P2     | P3      | VON    | INT    | TRI     |
| ---- | ------ | ------ | ------- | ------ | ------ | ------- |
| 1    | 35,756 | 18,466 | 145     | 30,844 | 35,611 | 54,366  |
| 2    | 4,408  | −195   | −24,862 | 27,261 | 29,270 | −20,649 |
| 3    | −564   | −7,292 | −89,457 | 85,727 | 88,893 | −97,313 |
| 4    | 40,104 | 140    | −20,042 | 53,018 | 60,145 | 20,202  |
| 5    | 14,442 | 69     | −20,501 | 30,420 | 34,943 | −5,990  |

---

## Relevance to Fatigue Analysis

### Columns Required for Fatigue Analysis

1. **VON (Von Mises stress):** Primary input for fatigue life calculation when using equivalent stress methods. Used directly with S-N curves for multiaxial stress states reduced to a scalar equivalent.

2. **P1, P2, P3 (Principal stresses):** Essential for:
   - Computing stress ranges between loading states
   - Mean stress determination (σ_m = (P1 + P2 + P3) / 3)
   - applying mean stress corrections (Goodman, Gerber, Soderberg)
   - Assessing multiaxial fatigue criteria

3. **INT (Stress intensity):** Useful as an alternative to Von Mises for Tresca-based fatigue assessment (more conservative).

4. **TRI (Triaxial sum):** Provides the hydrostatic stress component, relevant for mean stress corrections and multiaxial fatigue assessment.

### Parsing Strategy

When implementing the CSV importer, the following must be handled:

1. **Skip first 4 lines** (metadata header) — parse line 3 for unit extraction.
2. **Parse line 5** as column headers (validate expected columns exist).
3. **Trim whitespace** from all fields before parsing.
4. **Handle CRLF line endings** (`\r\n`).
5. **Parse scientific notation** (e.g., `4.73886e+04`) into floating-point values.
6. **Unit conversion** from N/m² to MPa (divide by 10⁶).
7. **Node ID matching** between base and loading files — handle the 8 extra nodes in the loading case.

---

## Data Quality Observations

| Observation           | Detail                                                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Missing values**    | None detected — all rows have 7 complete fields                                                                                       |
| **Negative VON**      | None detected (VON ≥ 0 for all nodes, as expected)                                                                                    |
| **Zero VON**          | Exactly 1 node with VON = 0 in each file (likely a constrained/boundary node)                                                         |
| **Negative INT**      | None detected (INT ≥ 0 for all nodes, as expected)                                                                                    |
| **Node ID gaps**      | Node IDs appear sequential (1, 2, 3, …, N) with no gaps                                                                               |
| **Numeric precision** | 6 significant figures in scientific notation                                                                                          |
| **Outliers**          | The TRI column shows large negative values (down to −404 MPa in load case), consistent with highly compressive triaxial stress states |
| **File integrity**    | No trailing footer or summary lines; data ends at last node                                                                           |
