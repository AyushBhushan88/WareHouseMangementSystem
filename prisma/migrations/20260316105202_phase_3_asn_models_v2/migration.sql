-- CreateTable
CREATE TABLE "InboundShipment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "InboundItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shipmentId" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "expectedQty" INTEGER NOT NULL,
    "receivedQty" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "InboundItem_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "InboundShipment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InboundItem_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "SKU" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SerializedUnit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serialNumber" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "locationId" TEXT,
    "inboundShipmentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'INBOUND',
    "barcode" TEXT,
    "tagId" TEXT,
    "metadata" TEXT,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SerializedUnit_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "SKU" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SerializedUnit_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SerializedUnit_inboundShipmentId_fkey" FOREIGN KEY ("inboundShipmentId") REFERENCES "InboundShipment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_SerializedUnit" ("barcode", "createdAt", "id", "lastSeenAt", "locationId", "metadata", "serialNumber", "skuId", "status", "tagId", "updatedAt") SELECT "barcode", "createdAt", "id", "lastSeenAt", "locationId", "metadata", "serialNumber", "skuId", "status", "tagId", "updatedAt" FROM "SerializedUnit";
DROP TABLE "SerializedUnit";
ALTER TABLE "new_SerializedUnit" RENAME TO "SerializedUnit";
CREATE UNIQUE INDEX "SerializedUnit_serialNumber_key" ON "SerializedUnit"("serialNumber");
CREATE INDEX "SerializedUnit_status_idx" ON "SerializedUnit"("status");
CREATE INDEX "SerializedUnit_barcode_idx" ON "SerializedUnit"("barcode");
CREATE INDEX "SerializedUnit_tagId_idx" ON "SerializedUnit"("tagId");
CREATE INDEX "SerializedUnit_inboundShipmentId_idx" ON "SerializedUnit"("inboundShipmentId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "InboundShipment_externalId_key" ON "InboundShipment"("externalId");

-- CreateIndex
CREATE INDEX "InboundShipment_externalId_idx" ON "InboundShipment"("externalId");

-- CreateIndex
CREATE INDEX "InboundItem_shipmentId_idx" ON "InboundItem"("shipmentId");

-- CreateIndex
CREATE INDEX "InboundItem_skuId_idx" ON "InboundItem"("skuId");
