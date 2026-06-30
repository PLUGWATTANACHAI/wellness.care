# Git + Secret Safety Setup

## Purpose

This document defines how Wellnest source code, environment files, and secret keys must be handled before the project is moved to a primary machine or shared with developers.

## Recommended Ownership

Important accounts should be owned by the product owner or company, not by an outside developer:

- GitHub or GitLab organization
- Cloud database provider
- Google Maps Platform
- Payment gateway
- Apple Developer account
- Google Play Console
- Monitoring and logging services

Developers should be invited with role-based access and removed when their work ends.

## Git Repository Rules

- Use a private repository for `wellnest-app`.
- Keep the default branch as `main`.
- Use feature branches for all work.
- Merge through pull requests after review.
- Do not commit generated dependencies such as `node_modules`.
- Do not commit local database dumps unless they are anonymized and intentionally approved.
- Do not commit real `.env` files.

## Files That May Be Committed

- Source code
- Type definitions
- API contracts
- Database migration SQL
- Seed data that contains demo-only data
- Documentation
- `.env.example`
- Lockfile

## Files That Must Not Be Committed

- `.env`
- `.env.local`
- `.env.production`
- Payment secret keys
- Google Maps private/server keys
- JWT secrets
- Database passwords
- Service account JSON files
- Production exports containing customer data
- Raw location history

## Environment File Policy

`.env.example` must list required variables without real production secrets.

Each machine should create its own `.env` file manually:

```env
APP_ENV=development
DATABASE_URL=
GOOGLE_MAPS_API_KEY=
PAYMENT_PROVIDER=
PAYMENT_SECRET_KEY=
PAYMENT_WEBHOOK_SECRET=
JWT_SECRET=
REFRESH_TOKEN_SECRET=
```

Production secrets should live in the hosting provider's secret manager, not in the repository.

## Before Sharing With A Developer

Run:

```bash
pnpm check:secrets
pnpm check:structure
pnpm typecheck
```

If `pnpm check:secrets` fails, do not share or push the repository until the finding is reviewed and fixed.

## If A Secret Is Accidentally Committed

1. Revoke or rotate the leaked key immediately.
2. Remove the secret from the repository.
3. Check commit history and remote repository exposure.
4. Inform affected service owners.
5. Create a new key and store it in the correct secret manager.

Do not rely only on deleting the line from the latest commit, because the old secret may still exist in Git history.

