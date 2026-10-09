import { z } from "zod";
import { prisma } from "../config/prisma.js";
const coordsSchema = z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), timestamp: z.coerce.date().optional() });
export async function updateLocation(driverId, role, input) {
  if (role !== "DRIVER") { const e = new Error("Məkan paylaşmaq üçün sürücü hesabı tələb olunur."); e.status = 403; throw e; }
  const data = coordsSchema.parse(input); if (Math.abs(Date.now() - (data.timestamp || new Date()).getTime()) > 5 * 60 * 1000) { const e = new Error("Məkan vaxtı köhnədir."); e.status = 400; throw e; }
  return prisma.driverLocation.upsert({ where: { driverId }, create: { driverId, latitude: data.latitude, longitude: data.longitude }, update: { latitude: data.latitude, longitude: data.longitude, updatedAt: data.timestamp || new Date() }, select: { updatedAt: true } });
}
export async function nearbyDrivers(latitude, longitude, radiusMeters = 25000) {
  const point = coordsSchema.pick({ latitude: true, longitude: true }).parse({ latitude, longitude });
  return prisma.$queryRaw`SELECT dl."driverId", u.name, ROUND(dl.latitude::numeric, 2)::float AS latitude, ROUND(dl.longitude::numeric, 2)::float AS longitude, dl."updatedAt" FROM "DriverLocation" dl JOIN "User" u ON u.id = dl."driverId" WHERE dl."updatedAt" > NOW() - INTERVAL '15 minutes' AND 6371000 * 2 * ASIN(SQRT(LEAST(1, POWER(SIN(RADIANS(dl.latitude - ${point.latitude}) / 2), 2) + COS(RADIANS(${point.latitude})) * COS(RADIANS(dl.latitude)) * POWER(SIN(RADIANS(dl.longitude - ${point.longitude}) / 2), 2)))) <= ${radiusMeters} LIMIT 100`;
}
