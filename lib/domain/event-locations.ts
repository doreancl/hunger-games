import type { EventLocation } from '@/lib/domain/types';

export const EVENT_LOCATION_CATALOG: readonly EventLocation[] = [
  'cornucopia',
  'forest',
  'river',
  'lake',
  'meadow',
  'caves',
  'ruins',
  'cliffs'
] as const;

export const EVENT_LOCATION_LABEL: Record<EventLocation, string> = {
  cornucopia: 'la Cornucopia',
  forest: 'el bosque',
  river: 'el rio',
  lake: 'el lago',
  meadow: 'la pradera',
  caves: 'las cuevas',
  ruins: 'las ruinas',
  cliffs: 'los acantilados'
};
