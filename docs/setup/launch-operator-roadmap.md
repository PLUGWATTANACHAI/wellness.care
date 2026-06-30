# Wellnest Launch Operator Roadmap

This roadmap is the step-by-step operating guide from staging app to real downloadable app.

## Working Rule

เอ็นทำเอง:

- code/config/checklist updates
- API and database validation
- staging smoke tests
- release documentation
- GitHub backup and `codex.work` sync

พี่ปลั๊กต้องกดเอง:

- account signup
- payment/card confirmation
- OTP/2FA/email verification
- business/legal information confirmation
- final app store submission approval

## Stage 1 - Expo / EAS Account

Goal: prepare the build system that creates Android APK/AAB and iOS builds.

พี่ปลั๊กเตรียม:

- email account to own the Expo account
- display name or organization name
- access to email OTP / 2FA

เอ็นทำต่อหลังพี่ login:

- run `eas init`
- attach Expo project ID to `apps/mobile/app.json`
- verify `eas.json`
- create first Android preview build

Entry:

- https://expo.dev/signup

Pass condition:

- Expo account exists.
- Project can be linked with EAS.
- Android preview build starts successfully.

## Stage 2 - Android Internal Download

Goal: create an APK that พี่ปลั๊ก can install and test before store release.

พี่ปลั๊กเตรียม:

- Android phone for test install
- Google account on the phone
- permission to install internal APK if needed

เอ็นทำ:

- build Android preview APK
- share install link or downloaded APK path
- smoke test customer booking flow on real phone

Pass condition:

- App installs on a real Android device.
- Customer can open app, login, choose service, confirm address, and reach booking/payment flow.

## Stage 3 - OTP/SMS Staging

Goal: login works without demo auth.

พี่ปลั๊กเตรียม:

- SMS provider account or temporary webhook provider
- sender name if provider requires it
- test phone number

เอ็นทำ:

- configure `SMS_PROVIDER=webhook`
- add provider URL/key to Render env
- request OTP through staging API
- verify that `devOtp` is not returned
- verify OTP login creates a session

Pass condition:

- Customer/provider login works with real SMS delivery.
- Demo auth remains disabled.

## Stage 4 - Google Play Console

Goal: prepare Android closed testing and later public Play Store release.

พี่ปลั๊กเตรียม:

- Google account
- card for one-time registration fee
- legal name or organization details
- government ID if Google requests verification
- Android device for account/device verification

เอ็นทำ after account ready:

- prepare Android production app bundle
- guide Play Console app creation
- prepare closed testing track checklist
- prepare data safety answers

Entry:

- https://play.google.com/console/signup

Pass condition:

- Play Console account is active.
- App record exists.
- Closed testing setup is ready.

## Stage 5 - Apple Developer / TestFlight

Goal: prepare iOS TestFlight and App Store release.

พี่ปลั๊กเตรียม:

- Apple Account with 2FA
- Apple Developer Program enrollment
- legal name or organization details
- payment method for annual membership
- iPhone for TestFlight test

เอ็นทำ after account ready:

- guide App Store Connect setup
- build iOS preview/production with EAS
- prepare TestFlight tester flow
- prepare privacy labels

Entry:

- https://developer.apple.com/programs/enroll/

Pass condition:

- Apple Developer membership is active.
- App Store Connect app record exists.
- TestFlight build can be uploaded.

## Stage 6 - Store Listing Assets

Goal: prepare the public-facing app store page.

พี่ปลั๊กเตรียม:

- app display name
- company/operator name
- support email
- support phone
- privacy policy URL
- app support URL
- app icon approval
- screenshots approval

เอ็นทำ:

- draft short description
- draft full description
- draft keywords
- draft screenshots checklist
- draft privacy/data safety answers

Pass condition:

- Store listing is ready for closed testing or review.

## Stage 7 - Production Go/No-Go

Goal: avoid launching before critical risks are closed.

Must pass:

- production API ready
- production database backups enabled
- Omise live approved and webhook tested
- SMS/OTP production working
- Google Maps production key restricted
- location consent and retention rules verified
- customer support workflow ready
- refund/cancellation policy ready
- account deletion process ready
- real-device QA complete

Pass condition:

- Internal beta is stable.
- No demo auth.
- No test payment keys.
- No unrestricted map keys.
- No missing privacy/support policy.

## Immediate Next Step

Start Stage 1: Expo / EAS Account.

เอ็น should open Expo signup, wait for พี่ปลั๊ก login/verify email, then run EAS linking and Android preview build.
