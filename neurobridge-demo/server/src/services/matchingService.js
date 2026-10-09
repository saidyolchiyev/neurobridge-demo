import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { nearestRoutePoint, routeGeometry, routeThrough } from "./routingService.js";

const inputSchema = z.object({
  pickup: z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }),
  dropoff: z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }),
  departureTime: z.coerce.date().optional(),
  departureRange: z.object({ from: z.coerce.date(), to: z.coerce.date() })
    .refine((range) => range.from < range.to, { message: "Invalid departure range." }).optional(),
  departurePeriod: z.enum(["morning", "afternoon", "evening", "any"]).default("any"),
  maximumPrice: z.number().nonnegative().max(1000).optional(),
  passengerCount: z.number().int().min(1).max(8).default(1),
});

export async function matchRides(input) {
  const request = inputSchema.parse(input);
  const now = new Date();
  const departureTime = request.departureRange
    ? { gte: request.departureRange.from > now ? request.departureRange.from : now, lt: request.departureRange.to }
    : { gte: now };
  const rides = await prisma.ride.findMany({
    where: {
      status: "ACTIVE",
      availableSeats: { gte: request.passengerCount },
      ...(request.maximumPrice !== undefined && { price: { lte: request.maximumPrice } }),
      departureTime,
    },
    include: { driver: { select: { id: true, name: true } }, vehicle: true },
    take: 100,
  });

  const hourFormatter = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Baku", hour: "2-digit", hourCycle: "h23" });
  const ridesInPeriod = rides.filter((ride) => {
    if (request.departurePeriod === "any") return true;
    const hour = Number(hourFormatter.format(ride.departureTime));
    if (request.departurePeriod === "morning") return hour >= 5 && hour < 12;
    if (request.departurePeriod === "afternoon") return hour >= 12 && hour < 17;
    return hour >= 17 && hour < 24;
  });

  let routeFailures = 0;
  const results = await Promise.all(ridesInPeriod.map(async (ride) => {
    try {
      const originalGeometry = await routeGeometry(
        { latitude: ride.originLatitude, longitude: ride.originLongitude },
        { latitude: ride.destinationLatitude, longitude: ride.destinationLongitude },
      );
      const pickup = nearestRoutePoint(request.pickup, originalGeometry.coordinates);
      const dropoff = nearestRoutePoint(request.dropoff, originalGeometry.coordinates);
      if (pickup.distanceMeters > 15000 || dropoff.distanceMeters > 15000 || pickup.index >= dropoff.index) return null;

      const adjustedGeometry = await routeThrough([
        { latitude: ride.originLatitude, longitude: ride.originLongitude },
        request.pickup,
        request.dropoff,
        { latitude: ride.destinationLatitude, longitude: ride.destinationLongitude },
      ]);
      const detourMeters = Math.max(0, adjustedGeometry.distanceMeters - originalGeometry.distanceMeters);
      const routeCompatibility = Math.max(0, 100 - detourMeters / 450);
      const pickupProximity = Math.max(0, 100 - pickup.distanceMeters / 180);
      const timeGap = request.departureTime ? Math.abs(ride.departureTime - request.departureTime) / 3600000 : 0;
      const timeCompatibility = request.departureTime ? Math.max(0, 100 - timeGap * 12) : 92;
      if (timeCompatibility < 20) return null;

      const score = Math.round(.48 * routeCompatibility + .30 * pickupProximity + .22 * timeCompatibility);
      return {
        ...ride,
        price: Number(ride.price),
        match: {
          score,
          routeCompatibility: Math.round(routeCompatibility),
          pickupDistanceKm: Number((pickup.distanceMeters / 1000).toFixed(1)),
          estimatedDetourKm: Number((detourMeters / 1000).toFixed(1)),
          timeCompatibility: Math.round(timeCompatibility),
          routeCoordinates: adjustedGeometry.coordinates.map((point) => [point.latitude, point.longitude]),
          pickupPoint: [request.pickup.latitude, request.pickup.longitude],
          dropoffPoint: [request.dropoff.latitude, request.dropoff.longitude],
          reasons: [
            `Götürülmə nöqtəsi marşrutdan ${Math.round(pickup.distanceMeters / 1000)} km məsafədədir`,
            `Təxmini əlavə yol ${Number((detourMeters / 1000).toFixed(1))} km-dir`,
            "Götürülmə və düşürülmə ardıcıllığı uyğundur",
          ],
        },
      };
    } catch {
      routeFailures += 1;
      return null;
    }
  }));

  if (ridesInPeriod.length > 0 && routeFailures === ridesInPeriod.length) {
    const error = new Error("The routing service is temporarily unavailable.");
    error.status = 503;
    throw error;
  }
  return results.filter(Boolean).sort((a, b) => b.match.score - a.match.score);
}
