ALTER TABLE "TimelineEvent"
  ALTER COLUMN "date" DROP NOT NULL,
  ADD COLUMN "historicalYear" INTEGER,
  ADD COLUMN "historicalMonth" INTEGER,
  ADD COLUMN "historicalDay" INTEGER,
  ADD COLUMN "datePrecision" TEXT;

CREATE INDEX "TimelineEvent_historicalYear_historicalMonth_historicalDay_idx"
  ON "TimelineEvent"("historicalYear", "historicalMonth", "historicalDay");
