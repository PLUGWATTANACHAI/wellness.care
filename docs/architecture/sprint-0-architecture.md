# Sprint 0 Architecture

The first real build uses:

- Expo / React Native for the mobile app
- One mobile app codebase with customer/provider role modes
- Web admin dashboard
- Node.js + TypeScript API
- PostgreSQL database
- Shared TypeScript contracts in `packages/types`

## Security Defaults

- Every booking endpoint must check ownership or assigned provider.
- Provider location updates are accepted only for active accepted bookings.
- Admin exact location access requires role, reason, and time-limited grant.
- Raw location retention defaults to 72 hours.
- Payment webhooks must be idempotent by provider event id.

## Next Architecture Decisions

- Backend framework final choice: Fastify vs NestJS
- Database hosting: Supabase Postgres, RDS, or Cloud SQL
- Realtime provider: Firebase, Supabase Realtime, or custom WebSocket
- Payment gateway: Omise, 2C2P, Stripe, or GB Prime Pay

