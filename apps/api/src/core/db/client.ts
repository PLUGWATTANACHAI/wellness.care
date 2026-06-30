import pg from "pg";
import { createPgPoolConfig } from "./config";

const { Pool } = pg;

let pool: pg.Pool | undefined;

export function getDbPool() {
  if (!process.env.DATABASE_URL) {
    return undefined;
  }

  pool ??= new Pool(createPgPoolConfig());

  return pool;
}

export async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const db = getDbPool();
  if (!db) {
    throw new Error("DATABASE_URL is not configured");
  }

  const result = await db.query(sql, params);
  return result.rows as T[];
}

export async function getDatabaseHealth() {
  if (!process.env.DATABASE_URL) {
    return { status: "not_configured" as const };
  }

  try {
    const rows = await query<{ now: Date }>("SELECT now() AS now");
    return { status: "ok" as const, checkedAt: rows[0]?.now };
  } catch (error) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Unknown database error",
    };
  }
}
