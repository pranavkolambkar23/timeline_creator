CREATE TYPE "CollectionScope" AS ENUM ('FEATURED', 'PERSONAL');

ALTER TABLE "Collection" ADD COLUMN "scope" "CollectionScope" NOT NULL DEFAULT 'PERSONAL';

CREATE INDEX "Collection_scope_idx" ON "Collection"("scope");
