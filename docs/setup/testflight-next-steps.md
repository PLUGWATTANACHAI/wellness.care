# Wellnest TestFlight Next Steps

Status date: 2026-07-10

Apple Developer Program purchase is complete and the Apple Developer Account is no longer pending, based on พี่ปลั๊ก's update on 2026-07-10.

## App Store Connect App Record Fields

1. Open App Store Connect: https://appstoreconnect.apple.com/apps
2. Click `+` then `New App`.
3. Use these app identifiers:
   - App name: `Wellnest`
   - Platform: `iOS`
   - Bundle ID: `com.wellnest.app`
   - SKU: `wellnest-ios-001`
   - Primary language: `Thai` if available, otherwise `English (U.S.)`
   - User access: Full Access
4. If `com.wellnest.app` is not selectable, create or confirm the iOS bundle identifier in Certificates, Identifiers & Profiles first.
5. After the app record exists, create the iOS preview build with EAS.
6. Upload the build to TestFlight.
7. Add พี่ปลั๊ก as the first internal tester.
8. Test these flows on iPhone:
   - OTP login and session persistence.
   - Location permission popup.
   - Current location save.
   - Service selection and booking review.
   - PromptPay payment path.
   - Provider tracking display.
   - Profile edit and support/privacy screens.

## Draft App Store Metadata

App name:
Wellnest

Subtitle:
Condo wellness on demand

Category:
Health & Fitness

Short description:
Book trusted wellness services to your condo with address confirmation, secure payment, and provider tracking.

Thai short description:
จองบริการดูแลสุขภาพถึงคอนโด เลือกที่อยู่ ชำระเงิน และติดตามผู้ให้บริการได้ในแอพเดียว

Keywords draft:
wellness, massage, condo, home service, beauty, spa, health, booking, Bangkok, Thailand

Support URL:
TBD

Privacy Policy URL:
TBD

Marketing URL:
Optional for MVP.

## TestFlight Beta Review Notes Draft

Wellnest is an on-demand condo wellness booking app. This TestFlight build is for closed internal testing only.

Core test flow:

1. Sign in with the provided tester OTP.
2. Allow location permission.
3. Save current location or a searched address in Account.
4. Select a wellness service and available time.
5. Confirm address and provider availability.
6. Create a booking and open the PromptPay payment test flow.
7. Review provider tracking, messages, notifications, and privacy screens.

Location usage:

Wellnest uses location only to prepare the customer service address and show provider ETA for active bookings. Background location is not requested.

Payment:

Payments are routed through the staging API and Omise/Opn integration. Test users should not enter real card details during early TestFlight unless live payment readiness is explicitly confirmed.

## Privacy Answers To Prepare

Data collected:

- Name
- Phone number
- Email
- Service address
- Approximate or precise location when user allows location
- Booking history
- Payment status and payment provider references
- Customer-provider messages
- Support requests
- Device crash/error diagnostics when monitoring is enabled

Uses:

- Account management
- Booking and service fulfillment
- Payment confirmation
- Safety, support, fraud prevention, and service quality

Do not claim:

- Background location, unless a future native build adds it.
- Sale of personal data.
- Storing raw credit card numbers.

## Blockers Before Public Store Release

- Apple Developer membership must finish activation.
- Support URL and Privacy Policy URL must be published.
- Omise/Opn live payment must be approved and tested.
- SMS OTP provider must be connected for real users.
- Google Maps production keys must be restricted correctly.
- Account deletion/support process must be ready.
- Final Thai and English store screenshots must be captured from the real app.
