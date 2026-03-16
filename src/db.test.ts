import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from './db.js'
import { UnitStatus } from './services/status-manager.js'

describe('Prisma Extension Status Enforcement', () => {
  let skuId: string
  let binId: string

  beforeAll(async () => {
    // Ensure we have some data
    const sku = await (prisma as any).SKU.upsert({
      where: { code: 'TEST-SKU' },
      update: {},
      create: { code: 'TEST-SKU', name: 'Test SKU' }
    })
    skuId = sku.id

    const loc = await prisma.location.upsert({
      where: { code: 'TEST-LOC' },
      update: {},
      create: { code: 'TEST-LOC', type: 'BIN', path: 'TEST-LOC' }
    })
    binId = loc.id

    // Cleanup existing test unit if any
    const existing = await prisma.serializedUnit.findUnique({ where: { serialNumber: 'TEST-SER-001' } })
    if (existing) {
      await prisma.statusAuditLog.deleteMany({ where: { unitId: existing.id } })
      await prisma.serializedUnit.delete({ where: { id: existing.id } })
    }
  })

  it('should allow valid transition INBOUND -> IN_STOCK', async () => {
    const unit = await prisma.serializedUnit.create({
      data: {
        serialNumber: 'TEST-SER-001',
        skuId,
        status: UnitStatus.INBOUND
      }
    })

    await expect(prisma.serializedUnit.update({
      where: { id: unit.id },
      data: { status: UnitStatus.IN_STOCK }
    })).resolves.toBeDefined()
  })

  it('should reject invalid transition IN_STOCK -> SHIPPED', async () => {
    const unit = await prisma.serializedUnit.findUnique({
      where: { serialNumber: 'TEST-SER-001' }
    })

    await expect(prisma.serializedUnit.update({
      where: { id: unit!.id },
      data: { status: UnitStatus.SHIPPED }
    })).rejects.toThrow(/Invalid status transition/)
  })

  afterAll(async () => {
    const unit = await prisma.serializedUnit.findUnique({ where: { serialNumber: 'TEST-SER-001' } })
    if (unit) {
      await prisma.statusAuditLog.deleteMany({ where: { unitId: unit.id } })
      await prisma.serializedUnit.delete({ where: { id: unit.id } })
    }
  })
})
