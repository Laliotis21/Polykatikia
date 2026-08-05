-- Heating meter readings (ενδείξεις) per apartment + period.
-- When any reading exists for building+year+month, HEATING_SHARES allocate by units.

CREATE TABLE "HeatingMeterReading" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "apartmentId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "units" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HeatingMeterReading_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HeatingMeterReading_apartmentId_year_month_key" ON "HeatingMeterReading"("apartmentId", "year", "month");

CREATE INDEX "HeatingMeterReading_buildingId_year_month_idx" ON "HeatingMeterReading"("buildingId", "year", "month");

ALTER TABLE "HeatingMeterReading" ADD CONSTRAINT "HeatingMeterReading_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HeatingMeterReading" ADD CONSTRAINT "HeatingMeterReading_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "Apartment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
