require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const adapter = new PrismaPg({ 
  connectionString: process.env.DATABASE_URL 
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const user = await prisma.user.create({
    data: {
      email: 'manager@gradify.com',
      name: 'FYP Manager',
      password: '$2b$12$k4Z.NDS8/pbm4hdKuMVsC.v9VsGA3kge83VFnDJ6RBe5qsxb4cy7.',
      role: 'MANAGER'
    }
  });
  console.log('Created user:', user.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());