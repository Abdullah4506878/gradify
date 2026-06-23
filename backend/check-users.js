require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.user.update({
    where: { email: 'ali.ahmed@superior.edu.pk' },
    data: { role: 'MANAGER' }
  });
  console.log('Ali Ahmed role updated to MANAGER');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());