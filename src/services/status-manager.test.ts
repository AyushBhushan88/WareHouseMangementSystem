import { describe, it, expect } from 'vitest'
import { StatusManager, UnitStatus } from './status-manager.js'

describe('StatusManager', () => {
  it('should allow valid transition INBOUND -> IN_STOCK', () => {
    expect(() => StatusManager.validateTransition(UnitStatus.INBOUND, UnitStatus.IN_STOCK)).not.toThrow()
  })

  it('should allow valid transition IN_STOCK -> ALLOCATED', () => {
    expect(() => StatusManager.validateTransition(UnitStatus.IN_STOCK, UnitStatus.ALLOCATED)).not.toThrow()
  })

  it('should reject invalid transition INBOUND -> SHIPPED', () => {
    expect(() => StatusManager.validateTransition(UnitStatus.INBOUND, UnitStatus.SHIPPED)).toThrow(/Invalid status transition/)
  })

  it('should allow staying in the same status', () => {
    expect(() => StatusManager.validateTransition(UnitStatus.IN_STOCK, UnitStatus.IN_STOCK)).not.toThrow()
  })
})
