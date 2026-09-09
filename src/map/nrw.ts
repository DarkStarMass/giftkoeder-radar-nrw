/**
 * NRW bounding box — Schätzung.
 * The source demands validation but does not publish constants.
 * Values from common geographic extents of North Rhine-Westphalia.
 */
export const NRW_BBOX = {
  west: 5.866,
  south: 50.323,
  east: 9.461,
  north: 52.531,
} as const;

export const NRW_CENTER = { longitude: 7.0, latitude: 51.0, zoom: 8 } as const;

export const NRW_MAX_BOUNDS: [number, number, number, number] = [
  NRW_BBOX.west - 0.35,
  NRW_BBOX.south - 0.25,
  NRW_BBOX.east + 0.35,
  NRW_BBOX.north + 0.25,
];

export function isInsideNrw(lat: number, lng: number): boolean {
  return (
    lat >= NRW_BBOX.south &&
    lat <= NRW_BBOX.north &&
    lng >= NRW_BBOX.west &&
    lng <= NRW_BBOX.east
  );
}

export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}
