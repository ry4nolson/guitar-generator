import type { Unit } from './types';

const MM_PER_INCH = 25.4;

export function mmToDisplay(mm: number, unit: Unit): number {
  return unit === 'in' ? mm / MM_PER_INCH : mm;
}

export function displayToMm(value: number, unit: Unit): number {
  return unit === 'in' ? value * MM_PER_INCH : value;
}

export function formatLength(mm: number, unit: Unit, digits = 2): string {
  const value = mmToDisplay(mm, unit);
  return `${value.toFixed(digits)} ${unit}`;
}
