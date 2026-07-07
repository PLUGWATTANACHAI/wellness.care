# Wellnest Mobile OTA Update

Wellnest uses EAS Update for over-the-air updates after a tester or customer has installed a compatible Android or iOS build.

## Channels

- `development`: development client builds.
- `preview`: internal tester APK/TestFlight builds.
- `production`: store release builds.

## What Can Be Updated Without Reinstalling

- UI copy, colors, layouts, and most screen logic.
- JavaScript bug fixes.
- API request behavior that does not require native code changes.
- Static assets bundled through Expo updates.

## What Still Needs A New App Build

- New or changed Android/iOS permissions.
- New native libraries or Expo modules.
- Expo SDK upgrades.
- Native configuration changes.
- Any crash caused by native startup code.

## Preview Update Command

Run this after changing JavaScript/UI for testers on a compatible preview build:

```bash
pnpm --filter @wellnest/mobile exec eas update --channel preview --message "Describe the tester fix"
```

## Production Update Command

Run this only after testing the same change on preview:

```bash
pnpm --filter @wellnest/mobile exec eas update --channel production --message "Describe the production fix"
```

## Safety Rule

If `app.json`, `eas.json`, native permissions, native dependencies, Expo SDK, or `runtimeVersion` compatibility changes, create a new APK/AAB/TestFlight build instead of using OTA only.
