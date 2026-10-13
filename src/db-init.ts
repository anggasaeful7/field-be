import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DB_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const schemaPath = path.resolve(process.cwd(), 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf-8');

  console.log('Connecting to Neon PostgreSQL...');
  const client = await pool.connect();
  try {
    console.log('Executing schema.sql...');
    await client.query(sql);
    console.log('Database initialized successfully with schema and seed data.');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('Database initialization failed:', err);
  process.exit(1);
});
