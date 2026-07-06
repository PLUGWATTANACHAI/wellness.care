# Wellnest Real App

Wellnest is a condo-focused wellness service marketplace with three product surfaces:

- Customer mobile app
- Provider mobile app
- Admin web dashboard
- Small-group pilot PWA for no-store-fee testing

Build decision:

- Mobile app: Expo / React Native
- Customer + Provider: one mobile codebase, separated by user role for MVP
- Admin: web dashboard
- Backend: Node.js + TypeScript API
- Database: PostgreSQL
- Maps: Google Maps Platform
- Realtime: to be selected during Sprint 0
- Payment: to be selected during Sprint 0

## Sprint 0 Goal

Sprint 0 is complete when:

- Mobile app skeleton runs locally
- Admin dashboard skeleton runs locally
- API skeleton runs locally
- Database schema and seed files exist
- Shared TypeScript types exist
- `.env.example` documents required secrets
- Developer setup is clear

## Repository Structure

```text
wellnest-app/
  apps/
    mobile/   Expo / React Native app for customer and provider roles
    admin/    Admin web dashboard
    api/      Backend API
    pilot/    Small-group web/PWA pilot for Android and iPhone testers
  packages/
    types/       Shared TypeScript types
    validators/  Shared validation helpers
    config/      Shared config helpers
  infra/
    database/
      migrations/
      seeds/
  docs/
  scripts/
```

## Developer Setup

This is a scaffold. After dependencies are installed, expected commands are:

```text
pnpm install
pnpm status
pnpm dev
pnpm dev:pilot
pnpm build:pilot
pnpm lint
pnpm typecheck
pnpm test
```

Before pushing to a private Git repository:

```text
pnpm prepush
```

## Day-1 Checklist

- Copy `.env.example` to `.env`
- Create local PostgreSQL database
- Run migration in `infra/database/migrations`
- Run seed in `infra/database/seeds`
- Start API
- Start mobile app
- Start admin dashboard
- Login with demo customer/provider/admin users

## Database Commands

After PostgreSQL is available and `DATABASE_URL` is configured:

```text
pnpm db:check
pnpm db:migrate
pnpm db:seed
```

## Security Notes

- Never commit real secrets
- Keep dev/staging/production keys separated
- Run `pnpm check:secrets` before sharing code
- Run `pnpm prepush` before pushing to Git
- Restrict Google Maps keys per platform
- Payment webhook must be idempotent
- Exact location admin access must require reason and audit log
- Location updates must be scoped to active accepted bookings only
