# Sprint 1C Database Runner

Sprint 1C adds database runner scripts for PostgreSQL.

## Scripts

```text
pnpm db:check
pnpm db:migrate
pnpm db:seed
```

## Required Environment

Create `.env` from `.env.example` and set:

```text
DATABASE_URL=postgresql://HOST:5432/DATABASE_NAME
```

## Current Machine Status

This environment did not have `psql`, `postgres`, or Docker installed at the time Sprint 1C was prepared.

That means the runner is ready, but actual migration execution requires installing or providing PostgreSQL first.

## Migration Behavior

`db:migrate`:
- Creates `schema_migrations` table if missing
- Runs SQL files in `infra/database/migrations`
- Records applied filenames
- Skips migrations already applied
- Runs each migration in a transaction

## Seed Behavior

`db:seed`:
- Runs SQL files in `infra/database/seeds`
- Demo seed uses `ON CONFLICT DO NOTHING`
- Safe to run more than once

## API Behavior

`GET /health` includes database status:

```json
{
  "status": "ok",
  "service": "wellnest-api",
  "database": {
    "status": "not_configured"
  }
}
```

When `DATABASE_URL` is configured and reachable, database status should become `ok`.

## Next Step

Install/provide PostgreSQL, then run:

```text
pnpm db:check
pnpm db:migrate
pnpm db:seed
pnpm dev:api
```
