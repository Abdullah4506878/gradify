require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const hash = await bcrypt.hash('Test@123', 12);
  const user = await prisma.user.update({
    where: { email: 'su92-bssem-f23-001@superior.edu.pk' },
    data: { password: hash }
  });
  console.log('Password updated:', user.email);
  await prisma.$disconnect();
}

main().catch(console.error);
