-- Building-level heating allocation mode (meters vs fixed χιλιοστά).
-- Default FIXED_SHARES for backward compatibility.

CREATE TYPE "HeatingAllocation" AS ENUM ('FIXED_SHARES', 'METER_READINGS');

ALTER TABLE "Building"
ADD COLUMN "heatingAllocation" "HeatingAllocation" NOT NULL DEFAULT 'FIXED_SHARES';
