import Fastify from 'fastify'
import { prisma } from './db.js'
import { StatusManager, UnitStatus } from './services/status-manager.js'

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

  return unit
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
