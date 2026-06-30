export function createPgPoolConfig() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }

  const sslEnabled = process.env.DATABASE_SSL === "true" || connectionString.includes("supabase.com");
  const rejectUnauthorized = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false";

  return {
    connectionString,
    ssl: sslEnabled ? { rejectUnauthorized } : undefined,
  };
}
