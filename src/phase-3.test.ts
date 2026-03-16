import { describe, it, expect, beforeAll } from 'vitest'
import { prisma } from './db.js'
import { UnitStatus } from './services/status-manager.js'
import { ReceivingService } from './services/receiving-service.js'

describe('Phase 3: ERP Integration & Receiving', () => {
  let skuId: string
  const ASN_ID = 'ASN-ERP-999'
  const SERIAL = 'SER-P3-001'

  beforeAll(async () => {
    // Cleanup
    const existingUnit = await prisma.serializedUnit.findUnique({ where: { serialNumber: SERIAL } })
    if (existingUnit) {
      await prisma.statusAuditLog.deleteMany({ where: { unitId: existingUnit.id } })
      await prisma.serializedUnit.delete({ where: { id: existingUnit.id } })
    }
    await prisma.inboundItem.deleteMany({ where: { shipment: { externalId: ASN_ID } } })
    await prisma.inboundShipment.deleteMany({ where: { externalId: ASN_ID } })

    const sku = await prisma.sKU.findFirst()
    skuId = sku.id

    // Create a unit in INBOUND status
    await prisma.serializedUnit.create({
      data: {
        serialNumber: SERIAL,
        skuId: skuId,
        status: UnitStatus.INBOUND
      }
    })

    // Create an ASN via manual DB insert (mimicking the webhook result)
    await prisma.inboundShipment.create({
      data: {
        externalId: ASN_ID,
        vendor: 'Test Vendor',
        items: {
          create: [{ skuId: skuId, expectedQty: 5 }]
        }
      }
    })
  })

  it('should increment receivedQty when a unit is received against an ASN', async () => {
    await ReceivingService.receiveUnit(SERIAL, ASN_ID)

    const asnItem = await prisma.inboundItem.findFirst({
      where: { shipment: { externalId: ASN_ID }, skuId: skuId }
    })

    expect(asnItem?.receivedQty).toBe(1)

    const unit = await prisma.serializedUnit.findUnique({
      where: { serialNumber: SERIAL }
    })
    expect(unit?.status).toBe(UnitStatus.IN_STOCK)
    expect(unit?.inboundShipmentId).toBeDefined()
  })

  it('should throw error if ASN does not exist', async () => {
    await expect(ReceivingService.receiveUnit(SERIAL, 'NON-EXISTENT'))
      .rejects.toThrow(/ASN not found/)
  })
})
