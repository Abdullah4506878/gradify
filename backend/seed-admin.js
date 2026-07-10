const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');

const adapter = new PrismaPg({
  connectionString: 'postgresql://postgres:gradify123@localhost:5432/gradify',
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = 'admin@gradify.com';
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('Super Admin already exists:', existing.email);
    return;
  }
  const hash = await bcrypt.hash('optimse@prime123', 12);
  const admin = await prisma.user.create({
    data: {
      email,
      name: 'Super Admin',
      password: hash,
      role: 'SUPER_ADMIN',
    },
  });
  console.log('✓ Super Admin created:', admin.email);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
