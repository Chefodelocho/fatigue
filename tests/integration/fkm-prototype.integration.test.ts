import { describe, expect, it } from 'vitest';

import type { FEMNodeStress } from '@fatigue/types';

import { evaluateFkmPrototype } from '../../packages/core/src/standards/fkm/fatigue-prototype';
import { analyzeFEMData } from '../../packages/core/src/mean-stress/fem-analysis';

describe('FEM-to-FKM-prototype assessment integration', () => {
  it('assesses the critical FEM node using its computed stress pair and material', () => {
    const material = {
      ultimateStrength: 500,
      yieldStrength: 300,
      enduranceLimit: 250,
    };
    const nodes: readonly FEMNodeStress[] = [
      {
        nodeId: 1,
        baseVON: 0,
        baseP1: 0,
        baseP2: 0,
        baseP3: 0,
        loadVON: 100,
        loadP1: 100,
        loadP2: 100,
        loadP3: 100,
      },
      {
        nodeId: 2,
        baseVON: 0,
        baseP1: 0,
        baseP2: 0,
        baseP3: 0,
        loadVON: 300,
        loadP1: 300,
        loadP2: 300,
        loadP3: 300,
      },
    ];

    const femResult = analyzeFEMData(nodes, material);
    const criticalNode = Object.values(femResult.minSafetyFactors).reduce((worst, current) =>
      current.minSF < worst.minSF ? current : worst,
    );
    const assessment = evaluateFkmPrototype({
      meanStress: criticalNode.meanStress,
      stressAmplitude: criticalNode.alternatingStress,
      ultimateStrength: femResult.material.ultimateStrength,
      fatigueStrengthAtReferenceCycles: femResult.material.enduranceLimit,
      targetCycles: 1_000_000,
    });

    expect(femResult.nodeCount).toBe(2);
    expect(criticalNode.nodeId).toBe(2);
    expect(criticalNode.meanStress).toBeCloseTo(150);
    expect(criticalNode.alternatingStress).toBeCloseTo(150);
    expect(assessment.ok).toBe(true);
    if (!assessment.ok) return;

    expect(assessment.value.meanStressCorrectionFactor).toBeCloseTo(0.7);
    expect(assessment.value.correctedStressAmplitude).toBeCloseTo(150 / 0.7);
    expect(assessment.value.utilization).toBeCloseTo(150 / 0.7 / 250);
    expect(assessment.value.acceptable).toBe(true);
  });
});
