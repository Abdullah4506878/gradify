require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');

const adapter = new PrismaPg({ 
  connectionString: process.env.DATABASE_URL 
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // University
  const university = await prisma.university.upsert({
    where: { code: 'TSU' },
    update: {},
    create: { name: 'The Superior University', code: 'TSU' }
  });
  console.log('University:', university.name);

  // Department
  const department = await prisma.department.upsert({
    where: { code_universityId: { code: 'SE', universityId: university.id } },
    update: {},
    create: { name: 'Software Engineering', code: 'SE', universityId: university.id }
  });
  console.log('Department:', department.name);

  // Program
  const program = await prisma.program.upsert({
    where: { code_departmentId: { code: 'BSSE', departmentId: department.id } },
    update: {},
    create: { name: 'BS Software Engineering', code: 'BSSE', departmentId: department.id }
  });
  console.log('Program:', program.name);

  // Academic Session
  const session = await prisma.academicSession.upsert({
    where: { semester_year_programId: { semester: 'FALL', year: 2026, programId: program.id } },
    update: {},
    create: { name: 'Fall 2026', semester: 'FALL', year: 2026, programId: program.id }
  });
  console.log('Session:', session.name);

  // FYP Phases
  const fyp1 = await prisma.fYPPhase.upsert({
    where: { phase_sessionId: { phase: 'FYP_1', sessionId: session.id } },
    update: {},
    create: { phase: 'FYP_1', sessionId: session.id }
  });
  console.log('FYP Phase:', fyp1.phase);

  // Manager user
  const hashedPassword = await bcrypt.hash('Test@123', 12);
  const manager = await prisma.user.upsert({
    where: { email: 'manager@gradify.com' },
    update: { universityId: university.id },
    create: {
      email: 'manager@gradify.com',
      name: 'FYP Manager',
      password: hashedPassword,
      role: 'MANAGER',
      universityId: university.id
    }
  });
  console.log('Manager:', manager.email);

  console.log('Seed complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());