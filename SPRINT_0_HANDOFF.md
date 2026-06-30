# Sprint 0 Handoff

Status: scaffold ready

Sprint 1 foundation has started. See:

- `docs/architecture/sprint-1-foundation.md`
- `docs/architecture/api-contract-sprint-1.md`

Sprint 1B dependency/API run passed. See:

- `outputs/wellnest_app_spec/15_Sprint_1B_Dependency_API_Run_Result.md`

## What Exists

- Monorepo workspace
- Expo / React Native mobile skeleton
- Admin web skeleton
- Node.js + TypeScript API skeleton
- Shared TypeScript types
- Shared config and validators
- PostgreSQL initial schema
- Demo seed data
- Privacy/location rules documentation
- Day-1 demo flow documentation

## What Is Not Done Yet

- Dependencies are installed in this repo
- API uses dev mock responses only
- Local auth uses `x-wellnest-role` dev header only
- Database is not connected to the API yet
- Mobile app is not connected to API screens yet
- Admin dashboard is not connected to real API data yet
- Payment, Google Maps, realtime, push notification are not integrated yet
- App Store / Google Play setup is not started yet

## Recommended Next Commit

1. Install dependencies with pnpm.
2. Choose backend framework final path: keep Fastify or switch to NestJS.
3. Add database client and migration runner.
4. Connect `/services` and `/bookings` to PostgreSQL.
5. Add auth token model and role guards.
6. Add first API tests for booking ownership and provider location.

## Owner Notes

This scaffold follows the chosen build path:

- Expo / React Native mobile app
- Admin web dashboard
- Backend API
- PostgreSQL
