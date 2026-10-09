import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { routeGeometry } from "./routingService.js";
const rideInput = z.object({ originName: z.string().min(2).max(100), destinationName: z.string().min(2).max(100), originLatitude: z.number().min(-90).max(90), originLongitude: z.number().min(-180).max(180), destinationLatitude: z.number().min(-90).max(90), destinationLongitude: z.number().min(-180).max(180), departureTime: z.coerce.date(), availableSeats: z.number().int().min(1).max(8), price: z.number().min(0).max(1000), vehicleModel: z.string().min(2).max(80), vehicleType: z.string().max(40).optional() }).refine((data)=>data.departureTime.getTime()>Date.now(),{message:"Çıxış vaxtı gələcək tarixdə olmalıdır.",path:["departureTime"]});
const rideSelect = { driver: { select: { id: true, name: true, vehicle: { select: { model: true, type: true, capacity: true } } } }, vehicle: true };
export async function listRides(filters = {}) {
  return prisma.ride.findMany({ where: { status: "ACTIVE", availableSeats: { gte: Number(filters.passengers || 1) }, ...(filters.origin && { originName: filters.origin }), ...(filters.destination && { destinationName: filters.destination }), ...(filters.date && { departureTime: { gte: new Date(`${filters.date}T00:00:00Z`), lt: new Date(`${filters.date}T23:59:59Z`) } }) }, include: rideSelect, orderBy: { departureTime: "asc" }, take: 100 });
}
export async function createRide(userId, role, input) {
  if (role !== "DRIVER") { const e = new Error("Səfər yaratmaq üçün sürücü hesabı tələb olunur."); e.status = 403; throw e; }
  const data = rideInput.parse(input); const { vehicleModel, vehicleType, ...ride } = data;
  return prisma.$transaction(async (tx) => {
    const vehicle = await tx.vehicle.upsert({ where: { driverId: userId }, create: { driverId: userId, model: vehicleModel, type: vehicleType || "Sedan", capacity: Math.max(ride.availableSeats, 1) }, update: { model: vehicleModel, type: vehicleType || "Sedan" } });
    return tx.ride.create({ data: { ...ride, driverId: userId, vehicleId: vehicle?.id }, include: rideSelect });
  }, { maxWait: 10000, timeout: 20000 });
}
export async function getRide(id) { const ride = await prisma.ride.findUnique({ where: { id }, include: rideSelect }); if (!ride) { const e = new Error("Səfər tapılmadı."); e.status = 404; throw e; } return ride; }
export async function getRideRoute(id) { const ride=await getRide(id);return routeGeometry({latitude:ride.originLatitude,longitude:ride.originLongitude},{latitude:ride.destinationLatitude,longitude:ride.destinationLongitude}); }
export async function updateRide(userId, id, input) {
  const ride = await getRide(id); if (ride.driverId !== userId) { const e = new Error("Bu səfəri dəyişmək icazəniz yoxdur."); e.status = 403; throw e; }
  const data = z.object({ availableSeats: z.number().int().min(0).max(8).optional(), price: z.number().min(0).max(1000).optional(), status: z.enum(["ACTIVE", "CANCELLED", "COMPLETED"]).optional() }).parse(input);
  return prisma.ride.update({ where: { id }, data, include: rideSelect });
}
