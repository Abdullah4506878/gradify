require('dotenv').config();
const pg = require('pg');

const pool = new pg.Pool({
  host: 'localhost',
  port: 5432,
  database: 'gradify',
  user: 'postgres',
  password: 'gradify123',
});

async function main() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `UPDATE "TaskSubmission" SET "githubLink" = NULL WHERE "githubLink" = ''`
    );
    console.log(`Updated ${result.rowCount} TaskSubmission record(s) where githubLink was empty string.`);
  } finally {
    client.release();
    await pool.end();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
