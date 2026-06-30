import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { createPgPoolConfig } from "./db-config.mjs";
import { loadDotEnv } from "./env.mjs";

loadDotEnv();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not configured. Copy .env.example to .env and set a real PostgreSQL URL.");
  process.exit(1);
}

const seedsDir = path.join(process.cwd(), "infra", "database", "seeds");
const pool = new pg.Pool(createPgPoolConfig());

try {
  const files = (await fs.readdir(seedsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = await fs.readFile(path.join(seedsDir, file), "utf8");
    await pool.query(sql);
    console.log(`seeded ${file}`);
  }
} finally {
  await pool.end();
}
