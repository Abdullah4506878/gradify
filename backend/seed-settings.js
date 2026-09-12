const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const adapter = new PrismaPg({ connectionString: 'postgresql://postgres:gradify123@localhost:5432/gradify' });
const prisma = new PrismaClient({ adapter });

const DEFAULTS = [
  { key: 'require_github_linkedin', value: 'false', label: 'Require GitHub & LinkedIn from students' },
  { key: 'show_supervisor_to_student', value: 'true', label: 'Show assigned supervisor to students' },
  { key: 'show_group_to_supervisor', value: 'true', label: 'Show assigned groups to supervisor' },
  { key: 'fyp_phase', value: 'FYP_1', label: 'Current FYP Phase (FYP_1 or FYP_2)' },
  { key: 'current_semester', value: 'AUTO', label: 'Current Semester (AUTO, FALL, SPRING)' },
  { key: 'current_year', value: 'AUTO', label: 'Current Year (AUTO or e.g. 2026)' },
  { key: 'show_phase_to_students', value: 'true', label: 'Show FYP phase to students' },
  { key: 'task_total_marks', value: '15', label: 'Total task marks' },
  { key: 'task_max_per_group', value: '16', label: 'Maximum tasks per group' },
  { key: 'github_tracking_enabled', value: 'true', label: 'Enable GitHub commit tracking' },
  { key: 'force_password_change', value: 'true', label: 'Force password change on first login' },
];

async function main() {
  for (const s of DEFAULTS) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
    console.log(`✔ ${s.key} = ${s.value}`);
  }
}

main()
  .then(() => { console.log('Done.'); process.exit(0); })
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
