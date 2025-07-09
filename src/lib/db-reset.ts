import { Pool } from 'pg';
import dotenv from 'dotenv';
import { execSync } from 'child_process';
dotenv.config({ path: '.env.local' });

function getDbNameFromUrl(url: string | undefined) {
  if (!url) return null;
  const match = url.match(/postgres(?:ql)?:\/\/[^/]+\/(\w+)/);
  return match ? match[1] : null;
}

const dbUrl = process.env.DATABASE_URL;
const dbName = getDbNameFromUrl(dbUrl);

// Try to create the database if it doesn't exist and we're using localhost
if (dbUrl && dbUrl.includes('localhost') && dbName === 'mathlingo_demo') {
  try {
    execSync(`createdb ${dbName}`);
    console.log(`Database '${dbName}' created (if it did not exist).`);
  } catch (e: any) {
    if (e.stderr && e.stderr.toString().includes('already exists')) {
      // Ignore if already exists
    } else {
      console.warn('Could not create database:', e.message);
    }
  }
}

const pool = new Pool({
  connectionString: dbUrl,
});

async function reset() {
  // Drop tables if they exist
  await pool.query('DROP TABLE IF EXISTS feedback');
  await pool.query('DROP TABLE IF EXISTS attempts');
  await pool.end();
  console.log('Tables dropped. Now re-running setup...');
  // Re-run setup
  const { execSync } = await import('child_process');
  execSync('npm run db:setup', { stdio: 'inherit' });
}

reset().catch((err) => {
  console.error('Database reset failed:', err);
  process.exit(1);
}); 