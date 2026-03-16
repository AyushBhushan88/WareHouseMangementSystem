import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding warehouse hierarchy...')

  // 1. Create Warehouse
  const wh = await prisma.location.upsert({
    where: { code: 'WH-01' },
    update: {},
    create: {
      code: 'WH-01',
      type: 'WAREHOUSE',
      path: 'WH-01'
    }
  })

  // 2. Create Zones
  const zoneA = await prisma.location.upsert({
    where: { code: 'ZONE-A' },
    update: {},
    create: {
      code: 'ZONE-A',
      type: 'ZONE',
      parentId: wh.id,
      path: `${wh.code}/ZONE-A`
    }
  })

  // 3. Create ASRS
  const asrs01 = await prisma.location.upsert({
    where: { code: 'ASRS-01' },
    update: {},
    create: {
      code: 'ASRS-01',
      type: 'ASRS',
      parentId: zoneA.id,
      path: `${zoneA.path}/ASRS-01`
    }
  })

  // 4. Create Bins
  for (let i = 1; i <= 10; i++) {
    const binCode = `BIN-${100 + i}`
    await prisma.location.upsert({
      where: { code: binCode },
      update: {},
      create: {
        code: binCode,
        type: 'BIN',
        parentId: asrs01.id,
        path: `${asrs01.path}/${binCode}`
      }
    })
  }

  // 5. Create a SKU
  const sku = await prisma.sKU.upsert({
    where: { code: 'SKU-001' },
    update: {},
    create: {
      code: 'SKU-001',
      name: 'Industrial Valve X-200',
      description: 'High-value serialized valve unit'
    }
  })

  // 6. Create some units
  await prisma.serializedUnit.upsert({
    where: { serialNumber: 'SER-A100' },
    update: {},
    create: {
      serialNumber: 'SER-A100',
      skuId: sku.id,
      locationId: (await prisma.location.findUnique({ where: { code: 'BIN-101' } }))!.id,
      status: 'IN_STOCK'
    }
  })

  await prisma.serializedUnit.upsert({
    where: { serialNumber: 'SER-A101' },
    update: {},
    create: {
      serialNumber: 'SER-A101',
      skuId: sku.id,
      status: 'INBOUND'
    }
  })

  console.log('Seeding complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
