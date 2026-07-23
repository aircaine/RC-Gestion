-- CreateTable ShiftSlot
CREATE TABLE "ShiftSlot" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShiftSlot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ShiftSlot_startsAt_idx" ON "ShiftSlot"("startsAt");

-- Migrate existing Shift rows into slots + assignments
-- 1) Add slotId nullable first
ALTER TABLE "Shift" ADD COLUMN "slotId" TEXT;

-- 2) For each existing shift, create a matching slot and link
DO $$
DECLARE
  r RECORD;
  new_slot_id TEXT;
BEGIN
  FOR r IN SELECT * FROM "Shift" LOOP
    new_slot_id := md5(random()::text || clock_timestamp()::text);
    -- cuid-like enough for migration; use gen if available
    new_slot_id := 'slot_' || substr(md5(random()::text || r.id), 1, 24);

    INSERT INTO "ShiftSlot" ("id", "name", "startsAt", "endsAt", "notes", "createdAt", "updatedAt")
    VALUES (
      new_slot_id,
      COALESCE(NULLIF(r."notes", ''), 'Service'),
      r."startsAt",
      r."endsAt",
      NULL,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    );

    UPDATE "Shift" SET "slotId" = new_slot_id WHERE "id" = r."id";
  END LOOP;
END $$;

-- If no rows, still fine. Make slotId required.
ALTER TABLE "Shift" ALTER COLUMN "slotId" SET NOT NULL;

ALTER TABLE "Shift"
  ADD CONSTRAINT "Shift_slotId_fkey"
  FOREIGN KEY ("slotId") REFERENCES "ShiftSlot"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Shift_slotId_userId_key" ON "Shift"("slotId", "userId");
