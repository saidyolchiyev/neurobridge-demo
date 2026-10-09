import { routeStops } from "../data/mockRides.js";

export function explainMatch(ride, origin, destination) {
  if (!origin || !destination) return { score: 0, compatible: false, reasons: [] };
  const stops = ride.route || routeStops[`${ride.origin}-${ride.destination}`] || [ride.origin, ride.destination];
  const pickupIndex = stops.indexOf(origin); const dropoffIndex = stops.indexOf(destination);
  if (pickupIndex < 0 || dropoffIndex <= pickupIndex || ride.seats < 1) return { score: 0, compatible: false, reasons: [] };
  const exact = ride.origin === origin && ride.destination === destination;
  const routeCompatibility = exact ? 100 : 91;
  const pickupDistance = pickupIndex === 0 ? 1.2 : 4.8;
  const timeCompatibility = 92;
  const reliability = Math.round((ride.rating / 5) * 100);
  const score = Math.round(routeCompatibility * 0.4 + Math.max(0, 100 - pickupDistance * 4) * 0.25 + timeCompatibility * 0.2 + reliability * 0.15);
  return { score, compatible: true, routeCompatibility, pickupDistance, timeCompatibility, estimatedDetour: pickupIndex === 0 ? 0 : 8, reasons: [exact ? "Marşrutunuz tam üst-üstə düşür" : "Sürücünün yolu təyinatınıza yaxındır", `Götürülmə nöqtəsi təxminən ${pickupDistance} km məsafədədir`, "Çıxış vaxtı uyğun gəlir"] };
}

export function calculateMatch(ride, origin, destination) { return explainMatch(ride, origin, destination).score; }

export function findMatchingRides(rides, origin, destination, passengerCount = 1) {
  return rides.map((ride) => ({ ...ride, match: explainMatch(ride, origin, destination) }))
    .filter((ride) => ride.match.compatible && ride.seats >= passengerCount)
    .sort((a, b) => b.match.score - a.match.score);
}
