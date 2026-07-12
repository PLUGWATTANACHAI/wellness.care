# Provider App Foundation Plan

## Decision

Provider should be a separate app, package, and release bundle from the customer mobile app.

The customer app owns customer discovery, booking, payment, customer location/address, customer notifications, and customer support entry points. The provider app owns provider authentication, provider job operations, live job status, provider navigation, provider location consent, and provider-facing support entry points.

This separation keeps customer UX changes from accidentally affecting provider operations and allows Provider to have its own app store release, permissions wording, device testing, analytics, and incident response.

## Package Boundary

Recommended workspace shape:

- `apps/mobile`: customer mobile app. No provider screens should be added here.
- `apps/provider-pilot`: provider pilot app and build target.
- `apps/admin`: internal operations console.
- `packages/types`: shared domain types, including `UserRole`, `BookingStatus`, `Booking`, `LocationEvent`, and consent records.

Provider should have its own package name and bundle identifiers:

- Workspace package: `@wellnest/provider-pilot`
- Future native iOS bundle: `com.wellnest.provider`
- Future Android application id: `com.wellnest.provider`
- Future display name: `Wellnest Provider`

Customer should keep its existing identifiers and release channel. Provider should not import customer screens or navigation stacks.

## Auth And Role Model

Provider app must authenticate as a provider user, not as a customer session with a provider screen flag.

Minimum auth requirements:

- Login requests identify the desired role as `provider`.
- API requests carry a provider session token.
- API authorization checks reject non-provider roles from provider job endpoints.
- Provider user records must include verification state before jobs can be accepted.
- If one phone number can hold multiple roles, role selection must happen before session creation and be reflected in the token/session.

Recommended API surface:

- `POST /auth/otp/start` with `{ phone, role: "provider" }`
- `POST /auth/otp/verify` returns a token scoped to `role: "provider"`
- `GET /provider/me`
- `GET /provider/jobs`
- `POST /provider/jobs/:bookingId/accept`
- `POST /provider/jobs/:bookingId/reject`
- `POST /provider/jobs/:bookingId/status`
- `POST /provider/jobs/:bookingId/location-consent`
- `POST /provider/jobs/:bookingId/location-events`
- `GET /provider/jobs/:bookingId/messages`
- `POST /provider/jobs/:bookingId/messages`
- `POST /provider/jobs/:bookingId/support-status`

## Provider Job Inbox

The Provider home screen should start with a job inbox, not the customer booking home.

Inbox states:

- Offered jobs: provider can accept or reject before offer expiry.
- Accepted active job: provider sees customer area, scheduled time, service, current status, and navigation action.
- Empty state: provider can see online/availability state and next expected action.
- Suspended/unverified state: provider sees why they cannot accept jobs yet.

Job cards should include:

- Booking code
- Service name and duration
- Scheduled time
- Customer display name or masked name
- Pickup/service area, not full exact address until policy allows it
- Offer expiry
- Pay estimate if approved by operations
- Required action: accept, reject, navigate, update status, contact support

## Accept Job Flow

Accepting a job is an explicit mutation, not a local UI state change.

Flow:

1. Provider opens an offered job.
2. Provider reviews service, time, area, and policy notes.
3. Provider taps Accept.
4. API validates provider role, offer status, expiry, verification, skills, working hours, leave windows, and active job limits.
5. API writes booking status `provider_accepted` and a status event.
6. Provider app refreshes the active job and reveals navigation and location consent steps.

Rejected or expired offers should return the provider to inbox without keeping stale accept buttons visible.

## Navigation

Provider navigation should be a provider app action after job acceptance.

Minimum behavior:

- Do not show exact customer address before the job is accepted.
- After acceptance, show navigation action using the device map app.
- Navigation should open from provider current location to service address.
- If the provider has not granted device location permission, show a permission prompt and fallback to destination-only navigation.
- Navigation action should be logged as a provider job event for support visibility.

Future native app should implement platform-specific map opening:

- iOS: Apple Maps or Google Maps if installed.
- Android: Google Maps intent.

## Location Sharing Consent

Provider live location is sensitive and must be consented separately from navigation.

Provider app must show a dedicated consent step before sending live location events:

- What is shared: provider live location while traveling to an accepted active booking.
- Who can see it: the customer for the active booking and authorized admin/support with reason logging.
- When it starts: after provider accepts a job and turns on sharing.
- When it stops: service start, completion, cancellation, expiry, or manual stop if policy allows.
- Retention: follow the location privacy rules, currently 72 hours by default for raw provider events.

Consent write:

- `consentType: "location_sharing"`
- `sourceScreen: "provider_active_job"`
- `documentVersion`: current location policy version

Provider app should not silently share background location without this consent.

## Status Update Flow

Provider status updates must be constrained to valid booking transitions.

Initial provider statuses:

- `provider_accepted`
- `provider_preparing`
- `provider_on_the_way`
- `arrived_at_lobby`
- `service_started`
- `completed`

Rules:

- Status changes are API mutations and create `BookingStatusEvent` records.
- Status changes should be idempotent when the same status is submitted twice.
- Invalid transitions return an actionable API error.
- Customer-facing notifications should be triggered by server-side events, not directly by Provider UI.

## Chat And Support Messages

Provider app needs a job-scoped chat/support foundation for active operational issues, not a general customer inbox.

Minimum pilot behavior:

- Provider sees a `Support Messages` section for the selected job.
- Messages are scoped by booking id and can include provider, customer, and authorized support/admin authors.
- Quick replies allow common operational updates such as `On my way`, `Arrived at lobby`, and `Need support`.
- Support status actions should create auditable support events, not only local UI messages.
- Customer contact visibility should follow booking privacy rules and should not reveal exact address before acceptance.

Recommended API surface:

- `GET /provider/jobs/:bookingId/messages` returns job-scoped messages visible to the provider.
- `POST /provider/jobs/:bookingId/messages` sends a provider message or quick reply.
- `POST /provider/jobs/:bookingId/support-status` records support-needed, access-delayed, customer-unreachable, or resolved states.
- `GET /provider/jobs/:bookingId/support-status` can be added if the app needs persistent badges or escalation state.

Suggested message fields:

- `id`
- `bookingId`
- `authorRole`: `provider`, `customer`, `support`, or `admin`
- `authorDisplayName`
- `body`
- `createdAt`
- `deliveryState`: `sent`, `delivered`, `seen`, or `failed`
- `supportEventType` when a message is generated from a support status action

## Navigation Structure

Provider app navigation should be separate from customer navigation.

Recommended screens:

- `ProviderAuthScreen`: phone/OTP login with provider role.
- `ProviderJobInboxScreen`: offered and active jobs.
- `ProviderJobDetailScreen`: job detail, accept/reject, policy summary.
- `ProviderActiveJobScreen`: current status, navigation, location sharing, support.
- `ProviderProfileScreen`: verification, skills, working hours, leave windows.
- `ProviderPrivacyScreen`: location consent, data policy, support contact.

For the current pilot scaffold, these are represented as sections in `apps/provider-pilot` so the provider workflow can build independently before native navigation is introduced.

## Current Scaffold

`apps/provider-pilot` is a minimal standalone Provider pilot app with:

- Separate package: `@wellnest/provider-pilot`
- Separate Vite build output under `apps/provider-pilot/dist`
- Provider-only mock auth session with `role: "provider"`
- Provider API bridge for `/auth/login`, `GET /provider/jobs`, accept/reject/status, and booking communications
- Pilot fallback data when staging has no jobs or a pilot API call cannot confirm the mutation
- Job inbox
- Accept job action with API sync attempt
- Navigation action placeholder
- Location sharing consent toggle
- Booking status update controls with API sync attempt
- Job-scoped `Support Messages` section with sample conversation, quick replies, and support-needed action

The scaffold intentionally avoids importing or editing customer app files. It is a foundation for product and API alignment, not final native Provider app code.

## Implementation Guardrails

- Do not add provider operational screens to `apps/mobile`.
- Do not reuse customer navigation for provider job operations.
- Do not show exact customer location before provider acceptance.
- Do not send provider live location without explicit provider consent.
- Do not let UI-only state be the source of truth for job acceptance or status.
- Keep admin override and support visibility in `apps/admin`, not Provider app.

## Next Engineering Slice

1. Add provider-specific message aliases if operations wants `/provider/jobs/:bookingId/messages` instead of the shared `/bookings/:id/communications`.
2. Persist provider location consent from Provider pilot to the backend consent/audit tables.
3. Replace the remaining mock exact address/navigation data with booking address policy data from API.
4. Add native Provider app package when app store testing begins.
5. Add provider status transition tests, message visibility tests, and location consent audit tests.
