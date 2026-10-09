import { prisma } from "../config/prisma.js";
import { nearestRoutePoint, routeThrough } from "./routingService.js";
import { explainDetourProposal } from "./aiService.js";

const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const point = (latitude, longitude) => ({ latitude, longitude });
const money = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const tier = (minutes) => minutes <= 5 ? 0 : minutes <= 10 ? 5 : minutes <= 20 ? 10 : minutes <= 30 ? 15 : 20;
const envNumber = (key, fallback) => Number.isFinite(Number(process.env[key])) ? Number(process.env[key]) : fallback;

async function buildQuote(rideId, pickup, dropoff) {
  const ride = await prisma.ride.findUnique({ where: { id: rideId }, include: { bookings: { where: { status: "ACCEPTED" }, orderBy: { createdAt: "asc" } } } });
  if (!ride || ride.status !== "ACTIVE") throw fail("Səfər artıq mövcud deyil.", 404);
  if (ride.availableSeats < 1) throw fail("Bu səfərdə boş yer yoxdur.");
  const origin = point(ride.originLatitude, ride.originLongitude), destination = point(ride.destinationLatitude, ride.destinationLongitude);
  const existingStops = [];
  for (const booking of ride.bookings) {
    if (booking.pickupLatitude != null && booking.dropoffLatitude != null) {
      existingStops.push(
        { bookingId: booking.id, passengerId: booking.passengerId, kind: "pickup", point: point(booking.pickupLatitude, booking.pickupLongitude) },
        { bookingId: booking.id, passengerId: booking.passengerId, kind: "dropoff", point: point(booking.dropoffLatitude, booking.dropoffLongitude), fare: Number(booking.fare ?? ride.price) },
      );
    }
  }
  const stops = [origin, ...existingStops.map((stop) => stop.point), destination];
  const [base, passengerSegment] = await Promise.all([routeThrough(stops), routeThrough([pickup, dropoff])]);
  const variants = existingStops.length ? [
    [{ kind: "new-pickup", point: pickup }, { kind: "new-dropoff", point: dropoff }, ...existingStops],
    [...existingStops.slice(0, Math.ceil(existingStops.length / 2)), { kind: "new-pickup", point: pickup }, { kind: "new-dropoff", point: dropoff }, ...existingStops.slice(Math.ceil(existingStops.length / 2))],
    [...existingStops, { kind: "new-pickup", point: pickup }, { kind: "new-dropoff", point: dropoff }],
  ] : [[{ kind: "new-pickup", point: pickup }, { kind: "new-dropoff", point: dropoff }]];
  const routedVariants = await Promise.all(variants.map(async (events) => ({ events, route: await routeThrough([origin, ...events.map((stop) => stop.point), destination]) })));
  const arrivalSeconds = (route, events, target) => {
    const stopIndex = events.findIndex((stop) => stop.bookingId === target.bookingId && stop.kind === "dropoff");
    // Older bookings have no saved intermediate coordinates and represent the ride's final destination.
    if (stopIndex < 0) return route.durationSeconds;
    return route.legs.slice(0, stopIndex + 1).reduce((sum, leg) => sum + leg.durationSeconds, 0);
  };
  const rankedVariants = routedVariants.map(({ events, route }) => {
    const extraKm = Math.max(0, (route.distanceMeters - base.distanceMeters) / 1000);
    const extraMinutes = Math.max(0, Math.ceil((route.durationSeconds - base.durationSeconds) / 60));
    const affected = ride.bookings.map((booking) => {
      const target = { bookingId: booking.id, kind: "dropoff" };
      const before = arrivalSeconds(base, existingStops, target);
      const after = arrivalSeconds(route, events, target);
      const delay = Math.max(0, Math.ceil((after - before) / 60));
      const discountPercent = tier(delay);
      const fare = Number(booking.fare ?? ride.price);
      const compensationAmount = money(fare * discountPercent / 100);
      return { bookingId: booking.id, passengerId: booking.passengerId, delayMinutes: delay, discountPercent, compensationAmount, updatedFare: money(fare - compensationAmount) };
    });
    const compensationTotal = money(affected.reduce((sum, item) => sum + item.compensationAmount, 0));
    const objective = extraKm * envNumber("OPERATING_COST_PER_KM_AZN", 0.2)
      + extraMinutes * envNumber("DRIVER_TIME_COST_PER_HOUR_AZN", 3) / 60 + compensationTotal;
    return { events, route, affected, compensationTotal, extraKm, extraMinutes, objective };
  }).sort((a, b) => a.objective - b.objective || a.extraMinutes - b.extraMinutes);
  const chosen = rankedVariants[0];
  const adjusted = chosen.route;
  const pickupOptions = [{ type: "requested", pickup, addedDistanceKm: 0, verifiedByRouting: true }];
  const nearby = nearestRoutePoint(pickup, base.coordinates);
  if (nearby.distanceMeters >= 300 && nearby.distanceMeters <= 15000) {
    const alternativePickup = base.coordinates[nearby.index];
    try {
      const [accessRoute, alternativeRoute] = await Promise.all([
        routeThrough([pickup, alternativePickup]),
        routeThrough([...stops.slice(0, -1), alternativePickup, dropoff, destination]),
      ]);
      pickupOptions.push({ type: "nearby-route-point", pickup: alternativePickup,
        passengerAccessDistanceKm: money(accessRoute.distanceMeters / 1000),
        addedDistanceKm: money(Math.max(0, (alternativeRoute.distanceMeters - base.distanceMeters) / 1000)),
        verifiedByRouting: true });
    } catch { /* Keep only the verified requested route if an alternative route cannot be confirmed. */ }
  }
  const extraKm = Math.max(0, (adjusted.distanceMeters - base.distanceMeters) / 1000);
  const extraMinutes = Math.max(0, Math.ceil((adjusted.durationSeconds - base.durationSeconds) / 60));
  pickupOptions[0].addedDistanceKm = money(extraKm);
  const routeKm = base.distanceMeters / 1000;
  const farePerKm = routeKm > 0 ? Number(ride.price) / routeKm : 0;
  const baseFare = money((passengerSegment.distanceMeters / 1000) * farePerKm);
  const detourCost = money(extraKm * envNumber("OPERATING_COST_PER_KM_AZN", 0.2));
  const timeCost = money(extraMinutes * envNumber("DRIVER_TIME_COST_PER_HOUR_AZN", 3) / 60);
  const commissionRate = Math.min(30, Math.max(0, envNumber("PLATFORM_COMMISSION_PERCENT", 0))) / 100;
  const affected = chosen.affected;
  const compensationTotal = chosen.compensationTotal;
  const costs = detourCost + timeCost + compensationTotal;
  const proposedFare = money((baseFare + costs) / (1 - commissionRate));
  const commission = money(proposedFare * commissionRate);
  const netChange = money(proposedFare - commission - costs);
  const currentRevenue = ride.bookings.reduce((sum, booking) => sum + Number(booking.fare ?? ride.price), 0);
  const currentDriverNet = money(currentRevenue * (1 - commissionRate)
    - routeKm * envNumber("OPERATING_COST_PER_KM_AZN", 0.2)
    - (base.durationSeconds / 3600) * envNumber("DRIVER_TIME_COST_PER_HOUR_AZN", 3));
  const projectedDriverNet = money(currentDriverNet + netChange);
  const minimumNet = envNumber("MIN_DRIVER_NET_CHANGE_AZN", 0);
  const financiallyFeasible = baseFare > 0 && netChange >= minimumNet;
  return {
    ride, base, adjusted, baseFare, detourCost, timeCost, compensationTotal,
    commission, proposedFare, netChange, currentDriverNet, projectedDriverNet, financiallyFeasible, extraKm: money(extraKm), extraMinutes,
    affected, pickupOptions,
  };
}

export async function quoteDetour(rideId, pickup, dropoff) {
  const q = await buildQuote(rideId, pickup, dropoff);
  const groundedExplanation = await explainDetourProposal({ feasible: q.financiallyFeasible, additionalDistanceKm: q.extraKm,
    additionalDurationMinutes: q.extraMinutes, proposedFare: q.proposedFare });
  return { feasible: q.financiallyFeasible, baseFare: q.baseFare, detourCost: q.detourCost, driverTimeCost: q.timeCost,
    compensationTotal: q.compensationTotal,
    proposedFare: q.proposedFare, platformCommission: q.commission, driverNetChange: q.netChange,
    currentDriverNet: q.currentDriverNet, projectedDriverNet: q.projectedDriverNet,
    originalDistanceKm: money(q.base.distanceMeters / 1000), adjustedDistanceKm: money(q.adjusted.distanceMeters / 1000),
    additionalDistanceKm: q.extraKm, originalDurationMinutes: Math.ceil(q.base.durationSeconds / 60),
    adjustedDurationMinutes: Math.ceil(q.adjusted.durationSeconds / 60), additionalDurationMinutes: q.extraMinutes,
    routeCoordinates: q.adjusted.coordinates.map((p) => [p.latitude, p.longitude]), pickupOptions: q.pickupOptions,
    affectedPassengers: q.affected.map(({ bookingId, delayMinutes, discountPercent, compensationAmount }) => ({ bookingId, delayMinutes, discountPercent, compensationAmount })),
    explanation: groundedExplanation.explanation, aiExplanationAvailable: groundedExplanation.available };
}

export async function createDetourBooking(passengerId, rideId, pickup, dropoff) {
  const q = await buildQuote(rideId, pickup, dropoff);
  if (q.ride.driverId === passengerId) throw fail("Öz səfərinizə sorğu göndərə bilməzsiniz.", 403);
  if (!q.financiallyFeasible) throw fail("Bu marşrut və qiymət maliyyə baxımından uyğun deyil.", 422);
  const duplicate = await prisma.booking.findFirst({ where: { rideId, passengerId, status: { in: ["PENDING", "ACCEPTED"] } } });
  if (duplicate) throw fail("Bu səfər üçün artıq aktiv sorğunuz var.", 409);
  const needsConsent = q.affected.filter((item) => item.discountPercent > 0);
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.create({ data: { rideId, passengerId, fare: q.proposedFare,
      pickupLatitude: pickup.latitude, pickupLongitude: pickup.longitude, dropoffLatitude: dropoff.latitude, dropoffLongitude: dropoff.longitude } });
    const proposal = await tx.detourProposal.create({ data: {
      bookingId: booking.id, rideId, originalDistanceKm: q.base.distanceMeters / 1000,
      adjustedDistanceKm: q.adjusted.distanceMeters / 1000, additionalDistanceKm: q.extraKm,
      originalDurationMinutes: Math.ceil(q.base.durationSeconds / 60), adjustedDurationMinutes: Math.ceil(q.adjusted.durationSeconds / 60), additionalDurationMinutes: q.extraMinutes,
      newPassengerBaseFare: q.baseFare, detourCost: q.detourCost, driverTimeCost: q.timeCost, compensationTotal: q.compensationTotal,
      platformCommission: q.commission, proposedFare: q.proposedFare, currentDriverNet: q.currentDriverNet,
      projectedDriverNet: q.projectedDriverNet, driverNetChange: q.netChange,
      profitability: q.netChange >= envNumber("MIN_DRIVER_NET_CHANGE_AZN", 0) ? "PROFITABLE" : "UNPROFITABLE",
      financiallyFeasible: q.financiallyFeasible, routeCoordinates: q.adjusted.coordinates.map((p) => [p.latitude, p.longitude]), pickupOptions: q.pickupOptions,
      status: "PENDING_DRIVER",
      consents: { create: needsConsent.map((item) => ({ affectedBookingId: item.bookingId, passengerId: item.passengerId,
        delayMinutes: item.delayMinutes, discountPercent: item.discountPercent, compensationAmount: item.compensationAmount,
        updatedFare: item.updatedFare, status: "PENDING" })) },
    } });
    return { booking, proposal, driverId: q.ride.driverId };
  }, { isolationLevel: "Serializable", timeout: 10000 });
}

export async function respondToDetourConsent(passengerId, consentId, decision) {
  const currentConsent = await prisma.passengerConsent.findUnique({ where: { id: consentId }, include: { proposal: true } });
  if (!currentConsent) throw fail("Razılıq sorğusu tapılmadı.", 404);
  if (currentConsent.passengerId !== passengerId) throw fail("Bu sorğuya cavab vermək icazəniz yoxdur.", 403);
  if (currentConsent.status !== "PENDING" || currentConsent.proposal.status !== "PENDING_PASSENGERS") throw fail("Bu təklif artıq cavablandırılıb.", 409);
  if (decision === "APPROVED") await assertProposalFresh(currentConsent.proposal.bookingId);
  return prisma.$transaction(async (tx) => {
    const consent = await tx.passengerConsent.findUnique({ where: { id: consentId }, include: { proposal: { include: { booking: true, consents: true } } } });
    if (!consent) throw fail("Razılıq sorğusu tapılmadı.", 404);
    if (consent.passengerId !== passengerId) throw fail("Bu sorğuya cavab vermək icazəniz yoxdur.", 403);
    if (consent.status !== "PENDING" || consent.proposal.status !== "PENDING_PASSENGERS") throw fail("Bu təklif artıq cavablandırılıb.", 409);
    await tx.passengerConsent.update({ where: { id: consentId }, data: { status: decision, respondedAt: new Date() } });
    if (decision === "REJECTED") {
      await tx.detourProposal.update({ where: { id: consent.proposalId }, data: { status: "REJECTED" } });
      await tx.booking.update({ where: { id: consent.proposal.bookingId }, data: { status: "REJECTED" } });
    } else {
      const remaining = await tx.passengerConsent.count({ where: { proposalId: consent.proposalId, status: "PENDING" } });
      if (!remaining) await finalizeProposal(tx, consent.proposalId);
    }
    return tx.detourProposal.findUnique({ where: { id: consent.proposalId }, include: { booking: true, consents: true } });
  }, { isolationLevel: "Serializable", timeout: 10000 });
}

export async function decideDetour(driverId, bookingId, accept) {
  const currentProposal = await prisma.detourProposal.findUnique({ where: { bookingId }, include: { ride: true } });
  if (!currentProposal || currentProposal.ride.driverId !== driverId) throw fail("Təklif tapılmadı və ya icazəniz yoxdur.", 404);
  if (currentProposal.status !== "PENDING_DRIVER") throw fail("Təklif artıq cavablandırılıb.", 409);
  if (accept) await assertProposalFresh(bookingId);
  return prisma.$transaction(async (tx) => {
    const proposal = await tx.detourProposal.findUnique({ where: { bookingId }, include: { ride: true, consents: true } });
    if (!proposal || proposal.ride.driverId !== driverId) throw fail("Təklif tapılmadı və ya icazəniz yoxdur.", 404);
    if (proposal.status !== "PENDING_DRIVER") throw fail("Təklif artıq cavablandırılıb.", 409);
    if (!accept) {
      await tx.detourProposal.update({ where: { id: proposal.id }, data: { status: "REJECTED" } });
      return tx.booking.update({ where: { id: bookingId }, data: { status: "REJECTED" } });
    }
    if (proposal.consents.length) return tx.detourProposal.update({ where: { id: proposal.id }, data: { status: "PENDING_PASSENGERS" }, include: { consents: true } });
    await finalizeProposal(tx, proposal.id);
    return tx.booking.findUnique({ where: { id: bookingId } });
  }, { isolationLevel: "Serializable", timeout: 10000 });
}

async function assertProposalFresh(bookingId) {
  const proposal = await prisma.detourProposal.findUnique({ where: { bookingId }, include: { booking: true } });
  if (!proposal) throw fail("Təklif tapılmadı.", 404);
  const booking = proposal.booking;
  const pickup = point(booking.pickupLatitude, booking.pickupLongitude), dropoff = point(booking.dropoffLatitude, booking.dropoffLongitude);
  const current = await buildQuote(proposal.rideId, pickup, dropoff);
  const same = Math.abs(Number(proposal.adjustedDistanceKm) - Number(current.adjusted.distanceMeters / 1000)) < 0.02
    && proposal.adjustedDurationMinutes === Math.ceil(current.adjusted.durationSeconds / 60)
    && Math.abs(Number(proposal.proposedFare) - current.proposedFare) < 0.02;
  if (!same) {
    await prisma.$transaction([
      prisma.detourProposal.update({ where: { id: proposal.id }, data: { status: "INFEASIBLE" } }),
      prisma.booking.update({ where: { id: booking.id }, data: { status: "REJECTED" } }),
    ]);
    throw fail("Səfərin marşrutu dəyişib; köhnə təklif bağlandı. Yeni qiymət təklifi göndərin.", 409);
  }
}

async function finalizeProposal(tx, proposalId) {
  const proposal = await tx.detourProposal.findUnique({ where: { id: proposalId }, include: { booking: true, consents: true } });
  const updated = await tx.ride.updateMany({ where: { id: proposal.rideId, status: "ACTIVE", availableSeats: { gt: 0 } }, data: { availableSeats: { decrement: 1 } } });
  if (!updated.count) {
    await tx.detourProposal.update({ where: { id: proposalId }, data: { status: "INFEASIBLE" } });
    await tx.booking.update({ where: { id: proposal.bookingId }, data: { status: "REJECTED" } });
    return;
  }
  for (const consent of proposal.consents) {
    if (consent.status !== "APPROVED") throw fail("Bütün təsirlənən sərnişinlər razılıq verməyib.", 409);
    await tx.booking.update({ where: { id: consent.affectedBookingId }, data: { fare: consent.updatedFare } });
  }
  await tx.detourProposal.update({ where: { id: proposalId }, data: { status: "APPROVED" } });
  await tx.booking.update({ where: { id: proposal.bookingId }, data: { status: "ACCEPTED" } });
}
