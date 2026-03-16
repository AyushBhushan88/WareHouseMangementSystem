import Fastify from 'fastify'
import { prisma } from './db.js'
import { StatusManager, UnitStatus } from './services/status-manager.js'
import { SerialIdentifier } from './services/serial-identifier.js'

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
      location: true
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
  const { status, locationCode, barcode, tagId } = request.body as { 
    status: UnitStatus, 
    locationCode?: string,
    barcode?: string,
    tagId?: string
  }

  // 1. Identify and parse the serial from the identifier (could be a barcode)
  const serialNumber = SerialIdentifier.parse(identifier)
  SerialIdentifier.validate(serialNumber)

  // 2. Find the unit
  const unit = await prisma.serializedUnit.findUnique({
    where: { serialNumber }
  })

  if (!unit) {
    return reply.status(404).send({ error: 'Unit not found' })
  }

  // 3. Resolve location if provided
  let locationId = unit.locationId
  if (locationCode) {
    const loc = await prisma.location.findUnique({ where: { code: locationCode } })
    if (!loc) return reply.status(400).send({ error: 'Invalid location code' })
    locationId = loc.id
  }

  // 4. Update the unit (Status transition is enforced in prisma extension)
  try {
    const updatedUnit = await prisma.serializedUnit.update({
      where: { id: unit.id },
      data: { 
        status, 
        locationId,
        barcode: barcode || unit.barcode,
        tagId: tagId || unit.tagId,
        lastSeenAt: new Date()
      }
    })
    return updatedUnit
  } catch (err: any) {
    return reply.status(400).send({ error: err.message })
  }
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
