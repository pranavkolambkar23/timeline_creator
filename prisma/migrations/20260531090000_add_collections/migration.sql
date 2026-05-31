CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CollectionEvent" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "collectionId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,

    CONSTRAINT "CollectionEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Collection_userId_idx" ON "Collection"("userId");
CREATE UNIQUE INDEX "CollectionEvent_collectionId_eventId_key" ON "CollectionEvent"("collectionId", "eventId");
CREATE INDEX "CollectionEvent_collectionId_position_idx" ON "CollectionEvent"("collectionId", "position");
CREATE INDEX "CollectionEvent_eventId_idx" ON "CollectionEvent"("eventId");

ALTER TABLE "Collection" ADD CONSTRAINT "Collection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollectionEvent" ADD CONSTRAINT "CollectionEvent_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollectionEvent" ADD CONSTRAINT "CollectionEvent_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "TimelineEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
