import { prisma } from "../config/prisma.js";
import { decideDetour } from "./detourPricingService.js";
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
export async function requestBooking(passengerId, rideId) {
  return prisma.$transaction(async (tx) => {
    const ride = await tx.ride.findUnique({ where: { id: rideId } }); if (!ride || ride.status !== "ACTIVE") throw fail("Səfər artıq mövcud deyil.", 404);
    if (ride.driverId === passengerId) throw fail("Öz səfərinizə sorğu göndərə bilməzsiniz.", 403);
    if (ride.availableSeats < 1) throw fail("Bu səfərdə boş yer yoxdur.");
    const existing = await tx.booking.findFirst({ where: { rideId, passengerId, status: { in: ["PENDING", "ACCEPTED"] } } });
    if (existing) throw fail("Bu səfər üçün artıq aktiv sorğunuz var.", 409);
    return tx.booking.create({ data: { rideId, passengerId }, include: { ride: { include: { driver: { select: { id: true, name: true } } } } } });
  }, { isolationLevel: "Serializable" });
}
export async function listMyBookings(userId) {
  return prisma.booking.findMany({
    where: { OR: [{ passengerId: userId }, { ride: { driverId: userId } }, { detourConsents: { some: { passengerId: userId } } }] },
    include: {
      passenger: { select: { id: true, name: true } },
      proposal: { include: { consents: true } },
      detourConsents: {
        where: { passengerId: userId },
        include: { proposal: { include: { booking: { include: { ride: true, passenger: { select: { id: true, name: true } } } } } } },
      },
      ride: { include: { vehicle: true, driver: { select: { id: true, name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
}
export async function decideBooking(driverId, bookingId, status) {
  const proposal = await prisma.detourProposal.findUnique({ where: { bookingId }, select: { id: true } });
  if (proposal) return decideDetour(driverId, bookingId, status === "ACCEPTED");
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id: bookingId }, include: { ride: true } });
    if (!booking) throw fail("Sorğu tapılmadı.", 404);
    if (booking.ride.driverId !== driverId) throw fail("Bu sorğunu idarə etmək icazəniz yoxdur.", 403);
    if (booking.status !== "PENDING") throw fail("Sorğu artıq cavablandırılıb.", 409);
    if (status === "ACCEPTED") {
      const updated = await tx.ride.updateMany({ where: { id: booking.rideId, availableSeats: { gt: 0 }, status: "ACTIVE" }, data: { availableSeats: { decrement: 1 } } });
      if (!updated.count) throw fail("Boş yer qalmayıb.", 409);
    }
    return tx.booking.update({ where: { id: bookingId }, data: { status }, include: { ride: true, passenger: { select: { id: true, name: true } } } });
  }, { isolationLevel: "Serializable" });
}
