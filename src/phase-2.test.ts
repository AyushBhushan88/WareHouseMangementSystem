import { describe, it, expect, beforeAll } from 'vitest'
import { prisma } from './db.js'
import { StatusManager, UnitStatus } from './services/status-manager.js'

describe('Phase 2: Audit Logging', () => {
  let unitId: string

  beforeAll(async () => {
    // Ensure we have a clean test unit
    const existing = await prisma.serializedUnit.findUnique({ where: { serialNumber: 'AUDIT-TEST-001' } })
    if (existing) {
      await prisma.statusAuditLog.deleteMany({ where: { unitId: existing.id } })
      await prisma.serializedUnit.delete({ where: { id: existing.id } })
    }

    const sku = await prisma.sKU.findFirst() || await prisma.sKU.create({
      data: { code: 'TEST-SKU', name: 'Test' }
    })

    const unit = await prisma.serializedUnit.create({
      data: {
        serialNumber: 'AUDIT-TEST-001',
        skuId: sku.id,
        status: UnitStatus.INBOUND
      }
    })
    unitId = unit.id
  })

  it('should automatically create an audit log entry on status update via StatusManager', async () => {
    // Update status: INBOUND -> IN_STOCK
    await StatusManager.updateStatus(prisma, unitId, UnitStatus.IN_STOCK)

    // Check audit logs
    const logs = await prisma.statusAuditLog.findMany({
      where: { unitId },
      orderBy: { timestamp: 'desc' }
    })

    expect(logs.length).toBeGreaterThan(0)
    expect(logs[0].fromStatus).toBe(UnitStatus.INBOUND)
    expect(logs[0].toStatus).toBe(UnitStatus.IN_STOCK)
  })

  it('should not create an audit log if status remains the same', async () => {
    const initialLogs = await prisma.statusAuditLog.count({ where: { unitId } })

    await StatusManager.updateStatus(prisma, unitId, UnitStatus.IN_STOCK) // Same status

    const finalLogs = await prisma.statusAuditLog.count({ where: { unitId } })
    expect(finalLogs).toBe(initialLogs)
  })
})
