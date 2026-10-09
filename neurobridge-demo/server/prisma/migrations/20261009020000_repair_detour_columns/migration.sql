-- Reconcile databases where the detour migration was applied incompletely.
-- These additions are safe to run after the initial schema and are idempotent.
ALTER TABLE IF EXISTS "Booking"
  ADD COLUMN IF NOT EXISTS "fare" DECIMAL(8,2),
  ADD COLUMN IF NOT EXISTS "pickupLatitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "pickupLongitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "dropoffLatitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "dropoffLongitude" DOUBLE PRECISION;

ALTER TABLE IF EXISTS "DetourProposal"
  ADD COLUMN IF NOT EXISTS "currentDriverNet" DECIMAL(8,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "projectedDriverNet" DECIMAL(8,2) NOT NULL DEFAULT 0;

ALTER TABLE IF EXISTS "DetourProposal"
  ALTER COLUMN "currentDriverNet" DROP DEFAULT,
  ALTER COLUMN "projectedDriverNet" DROP DEFAULT;
