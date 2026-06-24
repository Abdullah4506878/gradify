require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const oldEmails = [
    'ali.hassan@superior.edu.pk',
    'hamza.khan@superior.edu.pk',
    'ahmad.malik@superior.edu.pk'
  ];

  const users = await prisma.user.findMany({
    where: { email: { in: oldEmails } }
  });

  const userIds = users.map(u => u.id);

  // Delete enrollments first
  await prisma.enrollment.deleteMany({ where: { userId: { in: userIds } } });

  // Delete groups where these users are leaders
  await prisma.group.deleteMany({ where: { leaderId: { in: userIds } } });

  // Now delete the users
  const result = await prisma.user.deleteMany({
    where: { id: { in: userIds } }
  });

  console.log('Deleted:', result.count, 'old students');
}

main().catch(console.error).finally(() => prisma.$disconnect());
