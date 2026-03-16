import { prisma } from '../db.js'

export enum UnitStatus {
  INBOUND = 'INBOUND',
  IN_STOCK = 'IN_STOCK',
  ALLOCATED = 'ALLOCATED',
  PICKED = 'PICKED',
  SHIPPED = 'SHIPPED',
  QUARANTINE = 'QUARANTINE',
}

export const ValidTransitions: Record<UnitStatus, UnitStatus[]> = {
  [UnitStatus.INBOUND]: [UnitStatus.IN_STOCK, UnitStatus.QUARANTINE],
  [UnitStatus.IN_STOCK]: [UnitStatus.ALLOCATED, UnitStatus.QUARANTINE],
  [UnitStatus.ALLOCATED]: [UnitStatus.PICKED, UnitStatus.IN_STOCK, UnitStatus.QUARANTINE],
  [UnitStatus.PICKED]: [UnitStatus.SHIPPED, UnitStatus.ALLOCATED, UnitStatus.QUARANTINE],
  [UnitStatus.SHIPPED]: [UnitStatus.INBOUND], // Returned item flow
  [UnitStatus.QUARANTINE]: [UnitStatus.IN_STOCK, UnitStatus.SHIPPED], // Shipped for disposal or return to vendor
};

export class StatusManager {
  /**
   * Validates if a transition from currentStatus to nextStatus is allowed.
   */
  static isValidTransition(currentStatus: UnitStatus, nextStatus: UnitStatus): boolean {
    if (currentStatus === nextStatus) return true;
    const allowed = ValidTransitions[currentStatus];
    return allowed?.includes(nextStatus) ?? false;
  }

  /**
   * Throws an error if the transition is invalid.
   */
  static validateTransition(currentStatus: UnitStatus, nextStatus: UnitStatus): void {
    if (!this.isValidTransition(currentStatus, nextStatus)) {
      throw new Error(`Invalid status transition: ${currentStatus} -> ${nextStatus}`);
    }
  }

  /**
   * Updates a unit's status, validates the transition, and logs it.
   */
  static async updateStatus(tx: any, unitId: string, nextStatus: UnitStatus, changedBy: string = 'SYSTEM') {
    const unit = await tx.serializedUnit.findUnique({
      where: { id: unitId },
      select: { id: true, status: true }
    })

    if (!unit) throw new Error(`Unit not found: ${unitId}`)

    const fromStatus = unit.status as UnitStatus
    if (fromStatus === nextStatus) return unit

    this.validateTransition(fromStatus, nextStatus)

    const updatedUnit = await tx.serializedUnit.update({
      where: { id: unitId },
      data: { status: nextStatus }
    })

    await tx.statusAuditLog.create({
      data: {
        unitId,
        fromStatus,
        toStatus: nextStatus,
        changedBy
      }
    })

    return updatedUnit
  }

  /**
   * Updates multiple units' status, validates transitions, and logs them.
   */
  static async updateManyStatus(tx: any, where: any, nextStatus: UnitStatus, changedBy: string = 'SYSTEM_BULK') {
    const units = await tx.serializedUnit.findMany({
      where,
      select: { id: true, status: true }
    })

    for (const unit of units) {
      if (unit.status !== nextStatus) {
        this.validateTransition(unit.status as UnitStatus, nextStatus)
        
        await tx.serializedUnit.update({
          where: { id: unit.id },
          data: { status: nextStatus }
        })

        await tx.statusAuditLog.create({
          data: {
            unitId: unit.id,
            fromStatus: unit.status,
            toStatus: nextStatus,
            changedBy
          }
        })
      }
    }
  }
}
