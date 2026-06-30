# Wellnest App Download Readiness

This checklist prepares Wellnest for real user download through TestFlight, App Store, and Google Play.

## Current Mobile Release Foundation

- Expo / React Native app exists at `apps/mobile`.
- iOS bundle identifier: `com.wellnest.app`.
- Android package name: `com.wellnest.app`.
- EAS build config exists at `apps/mobile/eas.json`.
- Internal tester builds can be produced before public store release.

## Accounts พี่ปลั๊กต้องเตรียม

- Apple Developer Program account for App Store Connect and TestFlight.
- Google Play Console developer account for Android closed testing and production release.
- Expo account for EAS Build and Submit.
- Business display name, support email, support phone, privacy policy URL, and app support URL.
- Store assets: app icon, splash screen, screenshots, short description, full description, keywords, and category.

## Build Flow

From `apps/mobile`:

```bash
pnpm build:preview:android
pnpm build:preview:ios
```

Use preview builds for internal testing:

- Android preview build creates an installable APK for testers.
- iOS preview build requires Apple signing and is usually distributed through TestFlight or registered devices.

Production builds:

```bash
pnpm build:production:android
pnpm build:production:ios
```

Store submission:

```bash
pnpm submit:production:android
pnpm submit:production:ios
```

## Required Before Public Download

- Production API URL configured in the mobile app.
- Demo auth disabled.
- OTP/SMS login working without returning `devOtp`.
- Omise live account approved and live webhook tested.
- Google Maps production keys restricted by iOS bundle identifier and Android package/signing certificate.
- Privacy policy reviewed for PDPA, real-time location, retention period, payment, and support access.
- Account deletion flow or documented support process is ready.
- Crash reporting and error monitoring enabled.
- Customer, provider, and admin support process is ready.
- TestFlight and Google Play closed testing completed on real devices.

## Store Review Notes

- Explain location usage clearly: service address pinning, provider ETA, and active-booking tracking only.
- Do not request background location unless a future version truly needs it.
- Payment, booking cancellation, refund, and support contact policies must be visible.
- Provider app access should be restricted to approved providers.
- Screenshots should show the real booking flow, address confirmation, payment, tracking, and profile/support screens.

## First Download Milestone

The first practical target is not public launch. It should be:

1. Android internal APK for พี่ปลั๊ก and selected testers.
2. iOS TestFlight build for selected testers.
3. Closed beta with OTP/SMS, Omise test/live readiness, location tracking, and admin support checks.
4. Public App Store / Play Store submission after legal, payment, support, and QA gates pass.
