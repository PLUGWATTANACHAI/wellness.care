import pg from "pg";
import { createPgPoolConfig } from "./db-config.mjs";
import { loadDotEnv } from "./env.mjs";

loadDotEnv();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not configured. Copy .env.example to .env and set a real PostgreSQL URL.");
  process.exit(1);
}

const pool = new pg.Pool(createPgPoolConfig());

try {
  const result = await pool.query("SELECT now() AS now");
  console.log(`Database OK: ${result.rows[0].now.toISOString()}`);
} finally {
  await pool.end();
}
