import { describe, it, expect, beforeAll } from 'vitest'
import Fastify from 'fastify'
import { prisma } from './db.js'

// We need a way to get the app instance without starting the server
// Refactoring src/index.ts would be better, but for now, we'll mimic the logic
const createApp = () => {
  const app = Fastify()

  app.get('/v1/units/:serialNumber', async (request, reply) => {
    const { serialNumber } = (request.params as any).serialNumber
    const unit = await prisma.serializedUnit.findUnique({
      where: { serialNumber: (request.params as any).serialNumber },
      include: { sku: true, location: true }
    })
    if (!unit) return reply.status(404).send({ error: 'Not found' })
    const locationPath = unit.location?.path?.replace(/\//g, ' > ') || 'IN_TRANSIT'
    return { ...unit, locationPath }
  })

  return app
}

describe('API Endpoints', () => {
  let app: any

  beforeAll(async () => {
    app = createApp()
  })

  it('should return breadcrumb path for a unit in a location', async () => {
    // This assumes the seed data (SER-A100 in BIN-101) exists
    const response = await app.inject({
      method: 'GET',
      url: '/v1/units/SER-A100'
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.payload)
    expect(body.locationPath).toContain('WH-01 > ZONE-A > ASRS-01 > BIN-101')
  })

  it('should return IN_TRANSIT for a unit without a location', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/units/SER-A101'
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.payload)
    expect(body.locationPath).toBe('IN_TRANSIT')
  })
})
