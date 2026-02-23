export const LOCATION_CATALOG = [
  'cornucopia',
  'forest',
  'river',
  'lake',
  'meadow',
  'caves',
  'ruins',
  'cliffs'
] as const;

export type LocationId = (typeof LOCATION_CATALOG)[number];

const LOCATION_LABELS: Record<LocationId, string> = {
  cornucopia: 'la Cornucopia',
  forest: 'el bosque',
  river: 'el rio',
  lake: 'el lago',
  meadow: 'la pradera',
  caves: 'las cuevas',
  ruins: 'las ruinas',
  cliffs: 'los acantilados'
};

export function locationLabel(location: LocationId): string {
  return LOCATION_LABELS[location];
}
