# Primary Machine Transfer Checklist

## Goal

Make the Wellnest project portable from a temporary MacBook to the primary work machine without losing source code, setup knowledge, or important configuration.

## Move Pack

The current move pack is kept at:

```text
../codex.work/wellnest-project
```

It should include:

- `wellnest-app`
- `massage-wellness-app`
- `outputs/wellnest_app_spec`
- `outputs/wellnest_production_package`
- `README_WELLNEST_MOVE.md`

It should not include:

- `node_modules`
- `.env`
- real API keys
- real customer data

## Steps On The Primary Machine

1. Copy `codex.work/wellnest-project` to the primary machine.
2. Open `wellnest-project/wellnest-app`.
3. Install Node.js and pnpm.
4. Install dependencies with `pnpm install`.
5. Create `.env` from `.env.example`.
6. Add development secrets from the chosen secret source.
7. Run `pnpm check:secrets`.
8. Run `pnpm check:structure`.
9. Run `pnpm typecheck`.
10. Run `pnpm db:check`.
11. Start API with `pnpm dev:api`.
12. Start mobile/admin apps only after API health is confirmed.

## Database Notes

The real database should be Cloud PostgreSQL, not a database stored only on the temporary MacBook.

Recommended environments:

- Development database
- Staging database
- Production database

Each environment must use a separate `DATABASE_URL`.

## After Transfer Is Confirmed

- Create or connect the private Git repository.
- Push `wellnest-app` to the private repository.
- Keep `codex.work/wellnest-project` as a portable backup pack.
- Refresh the move pack after each major project milestone.

## Transfer Verification

The transfer is complete only when all checks pass on the primary machine:

```bash
pnpm check:secrets
pnpm check:structure
pnpm typecheck
pnpm db:check
```

`pnpm db:check` may fail with a clear missing `DATABASE_URL` message before the cloud database is configured. That is acceptable during early setup.

