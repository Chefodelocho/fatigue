/**
 * Material database with common standardized steels for fatigue analysis.
 *
 * Each material entry includes:
 * - Ultimate tensile strength (σu) in MPa
 * - Yield strength (σy) in MPa
 * - Endurance limit / fatigue limit (σe) in MPa
 *
 * Endurance limits are approximate values for polished specimens at room temperature.
 * Actual values depend on surface finish, size, temperature, and reliability requirements.
 *
 * @module lib/materials
 */

export interface MaterialEntry {
  /** Unique identifier */
  readonly id: string;
  /** Standard designation (e.g., "S235JR", "AISI 4140") */
  readonly name: string;
  /** Material group for categorization */
  readonly group: string;
  /** Applicable standard (e.g., "EN 10025", "ASTM") */
  readonly standard: string;
  /** Ultimate tensile strength σu (MPa) */
  readonly ultimateStrength: number;
  /** Yield strength σy (MPa) */
  readonly yieldStrength: number;
  /** Endurance limit σe (MPa) — approximate, polished specimen */
  readonly enduranceLimit: number;
  /** Additional notes */
  readonly notes?: string;
}

/**
 * Pre-defined material database with commonly used structural and mechanical steels.
 *
 * Endurance limits estimated as approximately 0.5 × σu for steels (typical rule of thumb).
 */
export const MATERIAL_DATABASE: readonly MaterialEntry[] = [
  // -- Structural Steels (EN 10025) ---
  {
    id: 's235jr',
    name: 'S235JR',
    group: 'Structural Steel',
    standard: 'EN 10025',
    ultimateStrength: 360,
    yieldStrength: 235,
    enduranceLimit: 180,
    notes: 'Common structural steel, non-alloy',
  },
  {
    id: 's275jr',
    name: 'S275JR',
    group: 'Structural Steel',
    standard: 'EN 10025',
    ultimateStrength: 430,
    yieldStrength: 275,
    enduranceLimit: 215,
    notes: 'Medium-strength structural steel',
  },
  {
    id: 's355j2',
    name: 'S355J2',
    group: 'Structural Steel',
    standard: 'EN 10025',
    ultimateStrength: 510,
    yieldStrength: 355,
    enduranceLimit: 250,
    notes: 'High-strength structural steel, common in offshore and bridges',
  },
  {
    id: 's450jo',
    name: 'S450JO',
    group: 'Structural Steel',
    standard: 'EN 10025',
    ultimateStrength: 550,
    yieldStrength: 450,
    enduranceLimit: 275,
    notes: 'Extra-high-strength structural steel',
  },
  {
    id: 's690ql',
    name: 'S690QL',
    group: 'Structural Steel',
    standard: 'EN 10025-6',
    ultimateStrength: 770,
    yieldStrength: 690,
    enduranceLimit: 340,
    notes: 'High-strength quenched and tempered steel',
  },

  // -- Offshore Steels ---
  {
    id: 'nv-a36',
    name: 'NV A36 (DH36)',
    group: 'Offshore Steel',
    standard: 'DNVGL / ASTM A131',
    ultimateStrength: 530,
    yieldStrength: 355,
    enduranceLimit: 250,
    notes: 'Offshore platform structural steel, normalized',
  },
  {
    id: 'eq47',
    name: 'EQ47 (F460)',
    group: 'Offshore Steel',
    standard: 'DNVGL',
    ultimateStrength: 600,
    yieldStrength: 460,
    enduranceLimit: 280,
    notes: 'Higher-strength offshore steel',
  },
  {
    id: 'eq70',
    name: 'EQ70 (F690)',
    group: 'Offshore Steel',
    standard: 'DNVGL',
    ultimateStrength: 790,
    yieldStrength: 690,
    enduranceLimit: 350,
    notes: 'High-strength quenched and tempered offshore steel',
  },

  // -- Carbon & Alloy Steels (ASTM / AISI) ---
  {
    id: 'aisi-1020',
    name: 'AISI 1020',
    group: 'Carbon Steel',
    standard: 'ASTM A29',
    ultimateStrength: 450,
    yieldStrength: 310,
    enduranceLimit: 210,
    notes: 'Low-carbon steel, good weldability',
  },
  {
    id: 'aisi-1045',
    name: 'AISI 1045',
    group: 'Carbon Steel',
    standard: 'ASTM A29',
    ultimateStrength: 620,
    yieldStrength: 450,
    enduranceLimit: 290,
    notes: 'Medium-carbon steel, good machinability',
  },
  {
    id: 'aisi-4140',
    name: 'AISI 4140',
    group: 'Alloy Steel',
    standard: 'ASTM A29',
    ultimateStrength: 860,
    yieldStrength: 655,
    enduranceLimit: 380,
    notes: 'Chromium-molybdenum alloy steel, Q&T condition',
  },
  {
    id: 'aisi-4340',
    name: 'AISI 4340',
    group: 'Alloy Steel',
    standard: 'ASTM A29',
    ultimateStrength: 1080,
    yieldStrength: 860,
    enduranceLimit: 440,
    notes: 'Nickel-chromium-molybdenum steel, high toughness',
  },

  // -- Stainless Steels ---
  {
    id: '304',
    name: '304 (1.4301)',
    group: 'Stainless Steel',
    standard: 'ASTM A240 / EN 10088',
    ultimateStrength: 580,
    yieldStrength: 240,
    enduranceLimit: 260,
    notes: 'Austenitic stainless steel, general purpose',
  },
  {
    id: '316l',
    name: '316L (1.4404)',
    group: 'Stainless Steel',
    standard: 'ASTM A240 / EN 10088',
    ultimateStrength: 530,
    yieldStrength: 220,
    enduranceLimit: 240,
    notes: 'Austenitic stainless, good corrosion resistance',
  },
  {
    id: 'duplex-2205',
    name: 'Duplex 2205 (1.4462)',
    group: 'Stainless Steel',
    standard: 'ASTM A240 / EN 10088',
    ultimateStrength: 680,
    yieldStrength: 460,
    enduranceLimit: 300,
    notes: 'Duplex stainless, high strength + corrosion resistance',
  },

  // -- Pipeline / Pressure Vessel Steels ---
  {
    id: 'api-5l-x65',
    name: 'API 5L X65',
    group: 'Pipeline Steel',
    standard: 'API 5L',
    ultimateStrength: 538,
    yieldStrength: 448,
    enduranceLimit: 250,
    notes: 'Pipeline transportation systems',
  },
  {
    id: 'sa-516-70',
    name: 'SA-516 Gr.70',
    group: 'Pressure Vessel',
    standard: 'ASME BPVC',
    ultimateStrength: 485,
    yieldStrength: 260,
    enduranceLimit: 225,
    notes: 'Pressure vessel plates, moderate/lower temperature',
  },

  // -- Cast Iron ---
  {
    id: 'gg-25',
    name: 'EN-GJL-250 (GG25)',
    group: 'Cast Iron',
    standard: 'EN 1561',
    ultimateStrength: 250,
    yieldStrength: 0,
    enduranceLimit: 100,
    notes: 'Gray cast iron — no defined yield strength',
  },
] as const;

/**
 * Returns unique material groups for categorization.
 */
export function getMaterialGroups(): readonly string[] {
  const groups = new Set<string>();
  for (const mat of MATERIAL_DATABASE) {
    groups.add(mat.group);
  }
  return [...groups];
}

/**
 * Finds a material by its ID.
 */
export function getMaterialById(id: string): MaterialEntry | undefined {
  return MATERIAL_DATABASE.find((m) => m.id === id);
}
