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
}
