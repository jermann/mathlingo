import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/mathlingo_demo',
});

export async function query(text: string, params?: any[]) {
  const res = await pool.query(text, params);
  return res;
} 