import type { Result, SNCurve } from '@fatigue/types';
import { err } from '@fatigue/types';

import { assertSupportedNumericClass, buildTwoSlopeSNCurve } from '../common/sn-curve-factory';

/**
 * Baseline IIW FAT classes for welded steel details.
 *
 * This is the initial implementation set and should be cross-checked against
 * the project's chosen IIW edition and joint classification rules.
 */
const IIW_FAT_CLASSES = [36, 40, 45, 50, 56, 63, 71, 80, 90, 100, 112, 125, 140, 160] as const;

/**
 * Create an IIW S-N curve from FAT class.
 */
export function createIIWCurve(fatClass: number): Result<SNCurve, string> {
  const supported = assertSupportedNumericClass({
    label: 'IIW FAT class',
    value: fatClass,
    supported: IIW_FAT_CLASSES,
  });

  if (!supported.ok) {
    return err(supported.error);
  }

  return buildTwoSlopeSNCurve({
    standard: 'IIW',
    id: `IIW-FAT-${fatClass}`,
    name: `IIW FAT ${fatClass}`,
    detailCategory: fatClass,
  });
}

/**
 * Get all baseline IIW FAT classes implemented in code.
 */
export function getIIWFatClasses(): readonly number[] {
  return IIW_FAT_CLASSES;
}
