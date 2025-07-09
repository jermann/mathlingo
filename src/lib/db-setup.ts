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

async function setup() {
  // Add topic and difficulty columns to attempts
  await pool.query(`
    CREATE TABLE IF NOT EXISTS attempts (
      id SERIAL PRIMARY KEY,
      user_id TEXT,
      question_text TEXT NOT NULL,
      student_answer TEXT NOT NULL,
      llm_answer TEXT NOT NULL,
      time_taken_seconds INTEGER,
      points INTEGER,
      topic TEXT,
      difficulty INTEGER,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS feedback (
      id SERIAL PRIMARY KEY,
      attempt_id INTEGER REFERENCES attempts(id) ON DELETE CASCADE,
      thumbs_up BOOLEAN,
      comment TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Add columns if they don't exist (for migrations)
  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attempts' AND column_name='topic') THEN
        ALTER TABLE attempts ADD COLUMN topic TEXT;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attempts' AND column_name='difficulty') THEN
        ALTER TABLE attempts ADD COLUMN difficulty INTEGER;
      END IF;
    END $$;
  `);

  await pool.end();
  console.log('Database setup complete.');
}

setup().catch((err) => {
  console.error('Database setup failed:', err);
  process.exit(1);
}); 