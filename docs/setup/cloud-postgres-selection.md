# Cloud PostgreSQL Selection

## Recommended MVP Provider

Use Supabase PostgreSQL first for Wellnest MVP.

Reason:

- Easy dashboard for a solo founder
- Managed PostgreSQL
- Clear backup documentation
- Can support future Auth, Storage, and Realtime needs
- Easier to inspect data while building the MVP

## Alternative

Neon is the strongest alternative if the project needs a more database-focused serverless PostgreSQL workflow with branching.

## Environment Plan

Start with:

```text
wellnest-dev
```

Add later:

```text
wellnest-staging
wellnest-production
```

Production should not be created until booking, location consent, payment sandbox, backup, restore test, and legal review are ready.

## Connection String Handling

Do not commit the real `DATABASE_URL`.

Store it only in:

- local `.env`
- hosting provider secret manager
- founder-owned password manager

## First Database Setup Checklist

- Founder owns the provider account
- 2FA is enabled where available
- Project is named `wellnest-dev`
- Region is selected intentionally
- No customer data is stored
- `DATABASE_URL` is placed only in `.env`
- `pnpm db:check` passes
- `pnpm db:migrate` passes
- `pnpm db:seed` passes
- API `/health` returns database status `ok`

## Current Dev Project

The current Supabase development project is:

- Organization: `Wellness.happy`
- Project display name: `Plug's Project owner`
- Project ref: `fmxyuyxihmcknvmrbnfn`
- Local connection mode: `Session pooler`

Do not store the database password in this document.

## Current Setup Status

Completed on 2026-06-20:

- Supabase password reset completed
- Local `.env` configured
- Migration applied
- Demo seed applied
- API `/health` returns database status `ok`

The real database password is stored only in local `.env`.

## Source Review Date

Provider information was reviewed on 2026-06-20 from official provider documentation and pricing pages.
