# Wellnest Editable Mobile Foundation

Purpose: keep the mobile app easy to change after launch without rebuilding the whole product every time.

## What Is Editable Now

- Shared colors, spacing, border radius, text weight, and default copy live in `apps/mobile/src/design/theme.ts`.
- Reusable UI pieces live in `apps/mobile/src/components`.
- The Account/Profile address screen now uses shared card, button, text field, and section header components.
- OTA updates can change most React Native screen UI, copy, styling, validation, booking flow logic, and small bug fixes while the installed app runtime stays compatible.

## What Should Become Admin-Editable Later

- Service categories, service names, duration, and price.
- Promotion banners and home screen campaign slots.
- Provider profile cards shown on the customer home screen.
- Coins and points campaign rules.
- Cancellation/refund policy text.
- Support contact text and FAQ.

These should move from hardcoded screen content into Supabase tables and an Admin Dashboard before public launch.

## What Needs A New Store Build

- New native packages.
- Expo SDK or React Native version upgrades.
- Permission changes, such as new background location behavior.
- App icon, splash screen, bundle identifier, package name, and native signing changes.
- Runtime version changes.

## Editing Rule

For future work, create new reusable UI in `apps/mobile/src/components` first when a pattern repeats. Keep product rules and repeated wording in one place instead of copying them into many screens.
