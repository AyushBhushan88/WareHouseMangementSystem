import { PrismaClient } from '@prisma/client'
import { StatusManager, UnitStatus } from './services/status-manager.js'

const prismaClient = new PrismaClient()

export const prisma = prismaClient.$extends({
  query: {
    serializedUnit: {
      async update({ args, query }) {
        const { where, data } = args
        
        // If status is being updated, validate the transition
        if (data.status && typeof data.status === 'string') {
          const nextStatus = data.status as UnitStatus
          
          // Fetch current status
          const currentUnit = await prismaClient.serializedUnit.findUnique({
            where,
            select: { status: true }
          })
          
          if (currentUnit) {
            StatusManager.validateTransition(currentUnit.status as UnitStatus, nextStatus)
          }
        }
        
        return query(args)
      },
      async updateMany({ args, query }) {
        const { where, data } = args
        
        // updateMany is trickier because we can't easily fetch current statuses for all matches
        // For Phase 1, we'll enforce that bulk updates must result in a valid transition 
        // for ALL items matching the criteria.
        if (data.status && typeof data.status === 'string') {
          const nextStatus = data.status as UnitStatus
          
          const units = await prismaClient.serializedUnit.findMany({
            where,
            select: { status: true, serialNumber: true }
          })
          
          for (const unit of units) {
            try {
              StatusManager.validateTransition(unit.status as UnitStatus, nextStatus)
            } catch (err: any) {
              throw new Error(`Bulk update failed for ${unit.serialNumber}: ${err.message}`)
            }
          }
        }
        
        return query(args)
      }
    }
  }
})
