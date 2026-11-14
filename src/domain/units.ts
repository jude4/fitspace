import type { Units } from './room';
export const METERS_PER_INCH = 0.0254;
export function imperialParts(
  meters: number,
  precision = 3,
): {
  feet: number;
  inches: number;
} {
  const total =
    Math.round((meters / METERS_PER_INCH) * 10 ** precision) / 10 ** precision;
  const feet = Math.floor(total / 12);
  return { feet, inches: Math.round((total - feet * 12) * 1000) / 1000 };
}
export function parseMetric(text: string): number | null {
  if (!text.trim() || !/^\d+(?:\.\d*)?$/.test(text.trim())) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}
export function parseImperial(
  feetText: string,
  inchesText: string,
): number | null {
  const feet = parseMetric(feetText),
    inches = parseMetric(inchesText);
  if (
    feet === null ||
    inches === null ||
    !Number.isInteger(feet) ||
    inches >= 12
  )
    return null;
  return (feet * 12 + inches) * METERS_PER_INCH;
}
export function formatLength(meters: number, units: Units): string {
  if (units === 'metric') return `${Number(meters.toFixed(3))} m`;
  const { feet, inches } = imperialParts(meters, 2);
  return `${feet}′ ${Number(inches.toFixed(2))}″`;
}
export function formatArea(squareMeters: number, units: Units): string {
  return units === 'metric'
    ? `${Number(squareMeters.toFixed(2))} m²`
    : `${Number((squareMeters / 0.3048 ** 2).toFixed(2))} ft²`;
}
