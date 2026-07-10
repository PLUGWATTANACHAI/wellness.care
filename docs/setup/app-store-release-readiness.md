# Wellnest App Download Readiness

This checklist prepares Wellnest for real user download through TestFlight, App Store, and Google Play.

Official Apple references checked on 2026-07-10:

- Apple Developer Program: https://developer.apple.com/programs/
- TestFlight: https://developer.apple.com/testflight/

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

## iOS / App Store Status

Wellnest does not have an App Store or TestFlight release yet.

Current account status as of 2026-07-10:

- Apple Developer Program purchase was completed through Apple Thailand.
- Order confirmation page showed order number `W1880180783`.
- Apple Developer Account still shows `wattanachai payungwong (Pending)`.
- Apple says the purchase may take up to 48 hours to process.
- Next action after activation: open App Store Connect and create the Wellnest app record.

Apple allows a free Apple developer account to test apps on your own devices with Xcode, but TestFlight and App Store distribution require Apple Developer Program membership. Apple currently lists the Apple Developer Program at `$99 annual membership`.

TestFlight is the correct first iPhone testing path after enrollment:

- Internal testers: up to 100 App Store Connect team members.
- External testers: up to 10,000 testers.
- External TestFlight builds must pass Apple's beta app review before external testers can install.

## App Store Connect Setup Steps

1. Enroll in the Apple Developer Program as individual or organization.
2. Open App Store Connect and create a new app record for Wellnest.
3. Confirm bundle identifier: `com.wellnest.app`.
4. Add app name, SKU, category, support URL, privacy policy URL, and contact email.
5. Prepare iPhone screenshots from the real booking, address, payment, tracking, and profile flows.
6. Fill App Privacy details for account data, phone number, location, payment, support messages, analytics, and crash logs.
7. Create the first iOS preview build with EAS Build.
8. Upload to TestFlight.
9. Add internal testers first, then external testers after beta review.
10. Move to App Store public review only after payment, OTP, privacy, support, and provider operations pass QA.

## Update Policy After Users Install

- Small UI, wording, booking flow, validation, and screen logic fixes can usually be sent through Expo OTA updates when runtime compatibility stays the same.
- Native changes still need a new iOS/Android build and store review. Examples: permissions, SDK changes, native modules, app icon, splash screen, bundle/package identifiers, and runtime version changes.
- Public App Store production users should receive OTA updates only after the same update is tested on preview/internal testers first.

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

## Operator Roadmap

Use `docs/setup/launch-operator-roadmap.md` as the step-by-step launch guide.
