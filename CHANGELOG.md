# Wellnest Changelog

## 2026-06-20

### Added

- Sprint 0 monorepo scaffold for mobile, API, admin, shared packages, and database migrations
- Sprint 1 foundation docs and API contracts
- Sprint 1C database runner scripts
- Secret audit command
- Git and primary machine transfer setup docs
- Sprint 1D solo local workflow and `pnpm status`
- Sprint 1E private Git preparation and `pnpm prepush`
- Sprint 1F cloud PostgreSQL provider selection docs
- Software update policy and dependency freshness report command
- Supabase dev database connection, migration, seed, and API health check
- Sprint 2A booking API database integration with provider/admin booking lists
- Sprint 2B mobile/admin UI connected to real Supabase-backed API
- Sprint 2C booking flow UI polish, role tabs, provider actions, and admin refresh
- Sprint 2D provider location event storage and customer latest-location API guards
- Sprint 2E mobile location tracking UI, provider location consent gate, and real API verification
- Sprint 2F admin safety location access controls with reason capture, Supabase audit logs, and dashboard UI
- Sprint 2G payment sandbox API, customer payment actions, and admin payment visibility
- Sprint 2H signed demo auth tokens, auth session storage, and token-backed customer/provider/admin API calls
- Sprint 2I profile/account persistence for customer address, provider status, and admin account visibility
- Sprint 2J in-app notifications, booking event timeline, and admin operations timeline panel
- Sprint 2K Google Maps address foundation, customer map address save flow, and provider service radius check
- Sprint 2L address confirmation in booking flow with real customer profile address and selected schedule
- Sprint 2M booking review before payment with customer confirmation gate
- Sprint 2N provider availability check before booking creation with API and customer UI gate
- Sprint 2O price breakdown before payment with coins discount, platform fee, and net payment amount
- Sprint 2P booking slot hold during payment with provider assignment after successful payment
- Sprint 2Q payment hold countdown and expired booking cleanup command
- Sprint 2R provider service skills and working hours filters for availability matching
- Sprint 2S admin provider operations UI for service skills and working hours management
- Sprint 2T admin audit logs for provider skills and working hours updates
- Sprint 2U provider leave/holiday calendar with availability blocking and admin audit logs
- Sprint 2V provider assignment policy with balanced distance, rating, workload score, and booking assignment audit records
- Sprint 2W provider offer, accept/reject, timeout processing hook, and fallback queue logic
- Sprint 2X admin manual reassignment with eligible provider candidates, re-offer action, and audit log
- Sprint 2Y admin provider offer history with rank, status, expiry, response, and manual reason visibility
- Sprint 2Z booking communication events with admin internal notes, all-party notes, and visibility safeguards
- Sprint 3A customer/provider communication UI with booking-level messages in the mobile customer and provider screens
- Sprint 3B message notifications with unread inbox, customer/provider inbox switch, and mark-as-read action
- Sprint 3C private support and safety escalation from customer/provider conversations with admin-only incident visibility
- Sprint 3D admin support triage with support case table, open/in-review/resolved statuses, and dashboard workflow
- Sprint 3E reporter-visible support case status for customer/provider with safe resolution note display
- Sprint 3F demo walkthrough panel and repeatable demo reset helper for cleaner local testing
- Sprint 3G real local demo launcher and updated end-to-end demo walkthrough docs
- Sprint 4A production auth gate with demo auth disabled in production and production readiness check command
- Sprint 4B OTP auth foundation with hashed OTP challenges and bearer session creation
- Sprint 4C SMS provider foundation with console dev provider and production webhook adapter
- Sprint 4D payment provider foundation with sandbox dev provider and production webhook adapter
- Sprint 4E payment webhook verification with HMAC signatures, idempotent event storage, and verified payment confirmation
- Sprint 4F Omise / Opn test payment provider foundation with PromptPay charge creation and Omise webhook signature support
- Sprint 4H staging HTTPS API deployment foundation with Render blueprint and staging readiness gate
- Small-group pilot web/PWA app for no-store-fee Android APK + iPhone browser testing
- Pilot tester plan, instructions, feedback form, and invitation message template

### Notes

- Supabase dev database is connected for current local development
- Real `.env` files must not be committed
- Important project files are mirrored to `codex.work/wellnest-project`
