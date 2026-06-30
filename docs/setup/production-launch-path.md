# Wellnest Production Launch Path

This file tracks the move from local prototype to real launch.

## Production Gate

Run:

```bash
pnpm production:check
```

The command fails if production-critical settings are missing or unsafe.

## Non-Negotiable Before Real Users

- Demo auth disabled in production.
- Real customer/provider authentication selected and integrated.
- Real payment gateway configured and webhook verified.
- Google Maps production key locked down by app/package/bundle restrictions.
- API deployed to cloud with HTTPS.
- Database backups enabled.
- Error monitoring enabled.
- PDPA consent and privacy notice reviewed.
- Location retention job scheduled.
- Admin/support operating process defined.
- iOS and Android builds tested on real devices.

## Current Production Status

Current state:

- Local Supabase-backed prototype.
- Demo auth remains available only outside production.
- Payment has a sandbox provider and a verified webhook provider foundation.
- Mobile runs through Expo dev flow.
- Admin runs through local Vite dev/build.

Not yet production:

- App Store / Play Store release.
- Real payment gateway contract, credentials, settlement testing, and provider-specific callback mapping.
- Real OTP/social login.
- Cloud API deployment.
- Production observability and incident process.

## Target Path

1. Production auth.
2. SMS provider for OTP.
3. Production payment provider.
4. Real payment gateway callback mapping and settlement QA.
5. Production maps and location privacy controls.
6. Cloud deployment.
7. Mobile production builds.
8. QA and security review.
9. Store submission.
