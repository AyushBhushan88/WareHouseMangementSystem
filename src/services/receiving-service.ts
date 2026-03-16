import { prisma } from '../db.js'
import { StatusManager, UnitStatus } from './status-manager.js'

export class ReceivingService {
  /**
   * Receives a serialized unit against an active Inbound Shipment (ASN).
   */
  static async receiveUnit(serialNumber: string, shipmentExternalId: string, locationId?: string) {      
    return await prisma.$transaction(async (tx) => {
      // 1. Find the shipment
      const shipment = await tx.inboundShipment.findUnique({
        where: { externalId: shipmentExternalId },
        include: { items: true }
      })

      if (!shipment) throw new Error(`ASN not found: ${shipmentExternalId}`)
      if (shipment.status === 'COMPLETED' || shipment.status === 'CANCELLED') {
        throw new Error(`ASN is already ${shipment.status}`)
      }

      // 2. Find the unit
      const unit = await tx.serializedUnit.findUnique({
        where: { serialNumber }
      })

      if (!unit) throw new Error(`Unit not found: ${serialNumber}`)
      if (unit.status !== UnitStatus.INBOUND) {
        throw new Error(`Unit is in status ${unit.status}, expected INBOUND`)
      }

      // 3. Match SKU in ASN
      const asnItem = shipment.items.find(item => item.skuId === unit.skuId)
      if (!asnItem) {
        throw new Error(`SKU ${unit.skuId} is not expected in ASN ${shipmentExternalId}`)
      }

      // 4. Update ASN Item Received Qty
      await tx.inboundItem.update({
        where: { id: asnItem.id },
        data: { receivedQty: { increment: 1 } }
      })

      // 5. Update Unit Status and Link to Shipment via StatusManager
      const updatedUnit = await StatusManager.updateStatus(tx, unit.id, UnitStatus.IN_STOCK, 'RECEIVING_SERVICE')

      // Additional link to shipment and location
      await tx.serializedUnit.update({
        where: { id: unit.id },
        data: {
          inboundShipmentId: shipment.id,
          locationId: locationId || unit.locationId,
          lastSeenAt: new Date()
        }
      })

      return updatedUnit
    })
  }
}
