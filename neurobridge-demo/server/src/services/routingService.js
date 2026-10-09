const osrmBase = process.env.OSRM_URL || "https://router.project-osrm.org";

export async function routeThrough(points) {
  if (points.length < 2) throw new Error("A route needs at least two points.");
  const coordinates = points.map(({ longitude, latitude }) => `${longitude},${latitude}`).join(";");
  const response = await fetch(`${osrmBase}/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`, { signal: AbortSignal.timeout(7000) });
  if (!response.ok) throw new Error("The routing service is temporarily unavailable.");
  const data = await response.json();
  const route = data.routes?.[0];
  if (!route?.geometry?.coordinates?.length) throw new Error("No route geometry was returned.");
  return {
    coordinates: route.geometry.coordinates.map(([longitude, latitude]) => ({ latitude, longitude })),
    distanceMeters: route.distance,
    durationSeconds: route.duration,
    legs: (route.legs || []).map((leg) => ({ distanceMeters: leg.distance, durationSeconds: leg.duration })),
  };
}

export async function routeGeometry(from, to) {
  return routeThrough([from, to]);
}

const radians = (number) => number * Math.PI / 180;

export function distanceMeters(first, second) {
  const dLat = radians(second.latitude - first.latitude);
  const dLng = radians(second.longitude - first.longitude);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(radians(first.latitude)) * Math.cos(radians(second.latitude)) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function nearestRoutePoint(point, coordinates) {
  let best = { distanceMeters: Infinity, index: -1 };
  coordinates.forEach((coordinate, index) => {
    const distance = distanceMeters(point, coordinate);
    if (distance < best.distanceMeters) best = { distanceMeters: distance, index };
  });
  return best;
}
