import type { Result, SNCurve } from '@fatigue/types';
import { err } from '@fatigue/types';

import { assertSupportedNumericClass, buildTwoSlopeSNCurve } from '../common/sn-curve-factory';

/**
 * Baseline detail categories (FAT classes) supported for EN 1993-1-9.
 *
 * These are scaffold values for implementation startup and should be validated
 * against project-approved design tables for each joint detail.
 */
const EN1993_DETAIL_CATEGORIES = [
  36, 40, 45, 50, 56, 63, 71, 80, 90, 100, 112, 125, 140, 160,
] as const;

/**
 * Create a two-slope EN 1993-1-9 S-N curve from detail category.
 */
export function createEN1993Curve(detailCategory: number): Result<SNCurve, string> {
  const supported = assertSupportedNumericClass({
    label: 'EN 1993-1-9 detail category',
    value: detailCategory,
    supported: EN1993_DETAIL_CATEGORIES,
  });

  if (!supported.ok) {
    return err(supported.error);
  }

  return buildTwoSlopeSNCurve({
    standard: 'DIN EN 1993-1-9',
    id: `EN1993-FAT-${detailCategory}`,
    name: `EN 1993-1-9 FAT ${detailCategory}`,
    detailCategory,
  });
}

/**
 * Get all baseline EN 1993-1-9 detail categories implemented in code.
 */
export function getEN1993DetailCategories(): readonly number[] {
  return EN1993_DETAIL_CATEGORIES;
}
