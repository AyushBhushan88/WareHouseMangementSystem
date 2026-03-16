-- AlterTable
ALTER TABLE "SerializedUnit" ADD COLUMN "barcode" TEXT;
ALTER TABLE "SerializedUnit" ADD COLUMN "metadata" TEXT;
ALTER TABLE "SerializedUnit" ADD COLUMN "tagId" TEXT;

-- CreateTable
CREATE TABLE "StatusAuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unitId" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "changedBy" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StatusAuditLog_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "SerializedUnit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "StatusAuditLog_unitId_idx" ON "StatusAuditLog"("unitId");

-- CreateIndex
CREATE INDEX "SerializedUnit_barcode_idx" ON "SerializedUnit"("barcode");

-- CreateIndex
CREATE INDEX "SerializedUnit_tagId_idx" ON "SerializedUnit"("tagId");
