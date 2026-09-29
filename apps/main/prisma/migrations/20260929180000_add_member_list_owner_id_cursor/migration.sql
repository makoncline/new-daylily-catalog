-- DropIndex
DROP INDEX "List_userId_idx";

-- CreateIndex
CREATE INDEX "List_userId_id_idx" ON "List"("userId", "id");
