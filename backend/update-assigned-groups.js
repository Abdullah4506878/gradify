require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const result = await prisma.group.updateMany({
    where: { fypId: { not: null } },
    data: { supervisorAssigned: true }
  });
  console.log('Updated:', result.count, 'groups');
}

main().catch(console.error).finally(() => prisma.$disconnect());
