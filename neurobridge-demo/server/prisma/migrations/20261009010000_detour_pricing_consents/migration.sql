CREATE TYPE "DetourProposalStatus" AS ENUM ('PENDING_DRIVER', 'PENDING_PASSENGERS', 'APPROVED', 'REJECTED', 'INFEASIBLE');
CREATE TYPE "PassengerConsentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "Booking"
  ADD COLUMN "fare" DECIMAL(8,2),
  ADD COLUMN "pickupLatitude" DOUBLE PRECISION,
  ADD COLUMN "pickupLongitude" DOUBLE PRECISION,
  ADD COLUMN "dropoffLatitude" DOUBLE PRECISION,
  ADD COLUMN "dropoffLongitude" DOUBLE PRECISION;

CREATE TABLE "DetourProposal" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "rideId" TEXT NOT NULL,
  "status" "DetourProposalStatus" NOT NULL DEFAULT 'PENDING_DRIVER',
  "originalDistanceKm" DECIMAL(8,2) NOT NULL,
  "adjustedDistanceKm" DECIMAL(8,2) NOT NULL,
  "additionalDistanceKm" DECIMAL(8,2) NOT NULL,
  "originalDurationMinutes" INTEGER NOT NULL,
  "adjustedDurationMinutes" INTEGER NOT NULL,
  "additionalDurationMinutes" INTEGER NOT NULL,
  "newPassengerBaseFare" DECIMAL(8,2) NOT NULL,
  "detourCost" DECIMAL(8,2) NOT NULL,
  "driverTimeCost" DECIMAL(8,2) NOT NULL,
  "compensationTotal" DECIMAL(8,2) NOT NULL,
  "platformCommission" DECIMAL(8,2) NOT NULL,
  "proposedFare" DECIMAL(8,2) NOT NULL,
  "driverNetChange" DECIMAL(8,2) NOT NULL,
  "profitability" TEXT NOT NULL,
  "financiallyFeasible" BOOLEAN NOT NULL,
  "routeCoordinates" JSONB NOT NULL,
  "pickupOptions" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DetourProposal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PassengerConsent" (
  "id" TEXT NOT NULL,
  "proposalId" TEXT NOT NULL,
  "affectedBookingId" TEXT NOT NULL,
  "passengerId" TEXT NOT NULL,
  "delayMinutes" INTEGER NOT NULL,
  "discountPercent" INTEGER NOT NULL,
  "compensationAmount" DECIMAL(8,2) NOT NULL,
  "updatedFare" DECIMAL(8,2) NOT NULL,
  "status" "PassengerConsentStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "respondedAt" TIMESTAMP(3),
  CONSTRAINT "PassengerConsent_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "DetourProposal"
  ADD COLUMN "currentDriverNet" DECIMAL(8,2) NOT NULL,
  ADD COLUMN "projectedDriverNet" DECIMAL(8,2) NOT NULL;

CREATE UNIQUE INDEX "DetourProposal_bookingId_key" ON "DetourProposal"("bookingId");
CREATE INDEX "DetourProposal_rideId_status_idx" ON "DetourProposal"("rideId", "status");
CREATE UNIQUE INDEX "PassengerConsent_proposalId_affectedBookingId_key" ON "PassengerConsent"("proposalId", "affectedBookingId");
CREATE INDEX "PassengerConsent_passengerId_status_idx" ON "PassengerConsent"("passengerId", "status");

ALTER TABLE "DetourProposal" ADD CONSTRAINT "DetourProposal_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DetourProposal" ADD CONSTRAINT "DetourProposal_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PassengerConsent" ADD CONSTRAINT "PassengerConsent_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "DetourProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PassengerConsent" ADD CONSTRAINT "PassengerConsent_affectedBookingId_fkey" FOREIGN KEY ("affectedBookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PassengerConsent" ADD CONSTRAINT "PassengerConsent_passengerId_fkey" FOREIGN KEY ("passengerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
