import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from './db.js'
import { StatusManager, UnitStatus } from './services/status-manager.js'

describe('Status Enforcement (via StatusManager)', () => {
  let skuId: string

  beforeAll(async () => {
    const sku = await prisma.sKU.upsert({
      where: { code: 'TEST-SKU' },
      update: {},
      create: { code: 'TEST-SKU', name: 'Test SKU' }
    })
    skuId = sku.id

    // Cleanup
    const existing = await prisma.serializedUnit.findUnique({ where: { serialNumber: 'TEST-SER-001' } }) 
    if (existing) {
      await prisma.statusAuditLog.deleteMany({ where: { unitId: existing.id } })
      await prisma.serializedUnit.delete({ where: { id: existing.id } })
    }
  })

  it('should allow valid transition INBOUND -> IN_STOCK via StatusManager', async () => {
    const unit = await prisma.serializedUnit.create({
      data: {
        serialNumber: 'TEST-SER-001',
        skuId,
        status: UnitStatus.INBOUND
      }
    })

    await expect(StatusManager.updateStatus(prisma, unit.id, UnitStatus.IN_STOCK))
      .resolves.toBeDefined()
    
    const logs = await prisma.statusAuditLog.findMany({ where: { unitId: unit.id } })
    expect(logs.length).toBe(1)
    expect(logs[0].fromStatus).toBe(UnitStatus.INBOUND)
    expect(logs[0].toStatus).toBe(UnitStatus.IN_STOCK)
  })

  it('should reject invalid transition IN_STOCK -> SHIPPED via StatusManager', async () => {
    const unit = await prisma.serializedUnit.findUnique({ where: { serialNumber: 'TEST-SER-001' } })

    await expect(StatusManager.updateStatus(prisma, unit!.id, UnitStatus.SHIPPED))
      .rejects.toThrow(/Invalid status transition/)
  })

  afterAll(async () => {
    const unit = await prisma.serializedUnit.findUnique({ where: { serialNumber: 'TEST-SER-001' } })     
    if (unit) {
      await prisma.statusAuditLog.deleteMany({ where: { unitId: unit.id } })
      await prisma.serializedUnit.delete({ where: { id: unit.id } })
    }
  })
})
