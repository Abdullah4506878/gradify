require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const result = await prisma.user.updateMany({
    where: { universityId: null },
    data: { universityId: 1 }
  });
  console.log('Updated:', result.count, 'users');
}

main().catch(console.error).finally(() => prisma.$disconnect());
