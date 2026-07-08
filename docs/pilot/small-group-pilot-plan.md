# Wellnest Small-Group Pilot Plan

Purpose: test Wellnest with a small trusted group before paying for Google Play Console or Apple Developer Program.

## Pilot Choice

- Android: use the APK link for invited testers.
- iPhone: use the Wellnest Pilot PWA in Safari or Chrome. This avoids TestFlight for now.
- Public pilot link: deploy `wellnest-pilot` as a Render Static Site from `render.yaml`.
- Admin/operator: use the existing staging/admin flow when needed.
- Store launch: wait until booking flow, payment behavior, support cases, location consent, and tester feedback are stable.

## Current iPhone / PWA Pilot Link

https://wellnest-pilot.onrender.com/

## Address Search Status

- Google Maps Search button is available now without an API key.
- In-app Google Places autocomplete is prepared but needs `VITE_GOOGLE_MAPS_API_KEY`.
- Setup details: `docs/pilot/google-maps-address-search.md`.

## Current Android APK

APK link:

https://expo.dev/accounts/plugwattanachai/projects/wellnest/builds/28c76be0-7ae7-4ddf-9fa3-b4428507d629

Note: APK install may show Android security warnings because it is not installed from Google Play. Use only trusted testers. This build is connected to Expo OTA updates, so normal JavaScript/UI fixes can be updated without reinstalling; native permission or build-setting changes still need a new APK.

## Pilot Group

Recommended first group: 10 to 20 people.

Tester mix:

- 5 to 8 Android users
- 3 to 6 iPhone users
- 2 to 4 condo residents or target customers
- 1 to 2 provider-side testers

## Pilot Duration

Run for 7 to 14 days.

## Free Public Link Setup

Use Render Static Site for the first public pilot link.

Expected service:

- Name: `wellnest-pilot`
- Type: Static Site
- Build command: `pnpm install --frozen-lockfile && pnpm build:pilot`
- Publish directory: `apps/pilot/dist`
- Auto deploy: off for safer manual control during pilot

Current public link:

https://wellnest-pilot.onrender.com/

Daily checks:

- Can testers open and use the app?
- Can testers understand service selection?
- Can testers choose date, time, and address?
- Can testers understand payment state and booking confirmation?
- Can testers understand provider tracking and privacy wording?
- Are there confusing screens or blocked steps?

## What Counts as Ready for Paid Store Setup

- At least 80 percent of testers can complete a booking without help.
- No critical payment, login, location, or booking assignment issue remains.
- Tester feedback has been reviewed and prioritized.
- Privacy/PDPA consent wording is accepted by the business owner.
- Support process is clear for refunds, complaints, cancellations, and safety cases.

## No-Store-Fee Limitation

- Android APK can be shared directly, but it is less polished than Google Play distribution.
- iPhone cannot be broadly sideloaded for free. A web/PWA pilot is the practical no-fee option.
- TestFlight and App Store distribution require Apple Developer Program membership.
- Google Play distribution requires a Google Play Console account.
