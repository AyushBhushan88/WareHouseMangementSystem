import Fastify from 'fastify'
import { prisma } from './db.js'
import { StatusManager, UnitStatus } from './services/status-manager.js'
import { SerialIdentifier } from './services/serial-identifier.js'
import { ReceivingService } from './services/receiving-service.js'

const fastify = Fastify({
  logger: true
})

// Serial Lookup: GET /v1/units/:serialNumber
fastify.get('/v1/units/:serialNumber', async (request, reply) => {
  const { serialNumber } = request.params as { serialNumber: string }
  const unit = await prisma.serializedUnit.findUnique({
    where: { serialNumber },
    include: {
      sku: true,
      location: true,
      inboundShipment: true
    }
  })

  if (!unit) {
    return reply.status(404).send({ error: 'Serial number not found' })
  }

  // Format breadcrumb path: "WH-01/ZONE-A/ASRS-01/BIN-101" -> "WH-01 > ZONE-A > ASRS-01 > BIN-101"
  const locationPath = unit.location?.path?.replace(/\//g, ' > ') || 'IN_TRANSIT'

  return {
    ...unit,
    locationPath
  }
})

// Unit Scan/Update: PATCH /v1/units/:identifier/scan
fastify.patch('/v1/units/:identifier/scan', async (request, reply) => {
  const { identifier } = request.params as { identifier: string }
  const { status, locationCode, barcode, tagId, asnExternalId } = request.body as { 
    status: UnitStatus, 
    locationCode?: string,
    barcode?: string,
    tagId?: string,
    asnExternalId?: string
  }

  // 1. Identify and parse the serial from the identifier (could be a barcode)
  const serialNumber = SerialIdentifier.parse(identifier)
  SerialIdentifier.validate(serialNumber)

  // 2. Resolve location if provided
  let locationId: string | undefined
  if (locationCode) {
    const loc = await prisma.location.findUnique({ where: { code: locationCode } })
    if (!loc) return reply.status(400).send({ error: 'Invalid location code' })
    locationId = loc.id
  }

  // 3. Handle explicit ASN receiving if requested
  if (asnExternalId && status === UnitStatus.IN_STOCK) {
    try {
      const receivedUnit = await ReceivingService.receiveUnit(serialNumber, asnExternalId, locationId)
      return receivedUnit
    } catch (err: any) {
      return reply.status(400).send({ error: err.message })
    }
  }

  // 4. Fallback to generic scan/update
  const unit = await prisma.serializedUnit.findUnique({ where: { serialNumber } })
  if (!unit) return reply.status(404).send({ error: 'Unit not found' })

  try {
    return await prisma.$transaction(async (tx) => {
      if (status) {
        await StatusManager.updateStatus(tx, unit.id, status, 'API_SCAN')
      }

      const updatedUnit = await tx.serializedUnit.update({
        where: { id: unit.id },
        data: {
          locationId: locationId || unit.locationId,
          barcode: barcode || unit.barcode,
          tagId: tagId || unit.tagId,
          lastSeenAt: new Date()
        },
        include: { sku: true, location: true }
      })
      return updatedUnit
    })
  } catch (err: any) {
    return reply.status(400).send({ error: err.message })
  }
  })
// ERP Webhook: POST /v1/integrations/erp/asn
fastify.post('/v1/integrations/erp/asn', async (request, reply) => {
  const { externalId, vendor, items } = request.body as {
    externalId: string,
    vendor: string,
    items: Array<{ skuCode: string, expectedQty: number }>
  }

  try {
    const shipment = await prisma.inboundShipment.create({
      data: {
        externalId,
        vendor,
        status: 'PENDING',
        items: {
          create: await Promise.all(items.map(async item => {
            const sku = await prisma.sKU.findUnique({ where: { code: item.skuCode } })
            if (!sku) throw new Error(`SKU not found: ${item.skuCode}`)
            return {
              skuId: sku.id,
              expectedQty: item.expectedQty
            }
          }))
        }
      },
      include: { items: true }
    })
    return shipment
  } catch (err: any) {
    return reply.status(400).send({ error: err.message })
  }
})

// Inbound Shipment Detail: GET /v1/inbound/shipments/:externalId
fastify.get('/v1/inbound/shipments/:externalId', async (request, reply) => {
  const { externalId } = request.params as { externalId: string }
  const shipment = await prisma.inboundShipment.findUnique({
    where: { externalId },
    include: {
      items: { include: { sku: true } },
      units: true
    }
  })

  if (!shipment) return reply.status(404).send({ error: 'ASN not found' })
  return shipment
})

// Unit History: GET /v1/units/:serialNumber/history
fastify.get('/v1/units/:serialNumber/history', async (request, reply) => {
  const { serialNumber } = request.params as { serialNumber: string }
  const unit = await prisma.serializedUnit.findUnique({
    where: { serialNumber },
    include: {
      auditLogs: {
        orderBy: { timestamp: 'desc' }
      }
    }
  })

  if (!unit) {
    return reply.status(404).send({ error: 'Unit not found' })
  }

  return unit.auditLogs
})

// Location Navigation: GET /v1/locations/:code
fastify.get('/v1/locations/:code', async (request, reply) => {
  const { code } = request.params as { code: string }
  const location = await prisma.location.findUnique({
    where: { code },
    include: {
      children: true
    }
  })

  if (!location) {
    return reply.status(404).send({ error: 'Location not found' })
  }

  return location
})

// Location Hierarchy: GET /v1/locations/:code/tree
fastify.get('/v1/locations/:code/tree', async (request, reply) => {
  const { code } = request.params as { code: string }
  
  // Basic recursive tree fetcher
  const getTree = async (locCode: string): Promise<any> => {
    const loc = await prisma.location.findUnique({
      where: { code: locCode },
      include: { children: true }
    })
    
    if (!loc) return null
    
    const childrenTrees = await Promise.all(
      loc.children.map(child => getTree(child.code))
    )
    
    return {
      ...loc,
      children: childrenTrees.filter(Boolean)
    }
  }

  const tree = await getTree(code)
  if (!tree) {
    return reply.status(404).send({ error: 'Location not found' })
  }

  return tree
})

// Health Check
fastify.get('/health', async () => {
  return { status: 'ok' }
})

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' })
    console.log('Server is running on http://localhost:3000')
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
