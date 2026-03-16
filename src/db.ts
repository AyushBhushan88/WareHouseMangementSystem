import { PrismaClient } from '@prisma/client'
import { StatusManager, UnitStatus } from './services/status-manager.js'

const prismaClient = new PrismaClient()

export const prisma = prismaClient.$extends({
  query: {
    serializedUnit: {
      async update({ args, query }) {
        const { where, data } = args
        
        // Fetch current state for validation and logging
        const currentUnit = await prismaClient.serializedUnit.findUnique({
          where,
          select: { id: true, status: true }
        })

        if (!currentUnit) return query(args)

        // If status is being updated, validate and log
        if (data.status && typeof data.status === 'string') {
          const nextStatus = data.status as UnitStatus
          const fromStatus = currentUnit.status as UnitStatus
          
          if (fromStatus !== nextStatus) {
            StatusManager.validateTransition(fromStatus, nextStatus)
            
            // Perform the update first
            const result = await query(args)
            
            // Log the transition
            await prismaClient.statusAuditLog.create({
              data: {
                unitId: currentUnit.id,
                fromStatus,
                toStatus: nextStatus,
                changedBy: 'SYSTEM' // Could be passed via context in the future
              }
            })
            
            return result
          }
        }
        
        return query(args)
      },
      async updateMany({ args, query }) {
        const { where, data } = args
        
        if (data.status && typeof data.status === 'string') {
          const nextStatus = data.status as UnitStatus
          
          const units = await prismaClient.serializedUnit.findMany({
            where,
            select: { id: true, status: true, serialNumber: true }
          })
          
          for (const unit of units) {
            if (unit.status !== nextStatus) {
              StatusManager.validateTransition(unit.status as UnitStatus, nextStatus)
              
              // Log for each unit (performance consideration for huge batches, but okay for Phase 2)
              await prismaClient.statusAuditLog.create({
                data: {
                  unitId: unit.id,
                  fromStatus: unit.status,
                  toStatus: nextStatus,
                  changedBy: 'SYSTEM_BULK'
                }
              })
            }
          }
        }
        
        return query(args)
      }
    }
  }
})
