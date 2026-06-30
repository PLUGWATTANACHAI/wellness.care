# Sprint 4K - Provider, Customer Tracking, and Admin Location Access Staging Result

Date: 2026-06-30

## Scope

Validate the post-payment lifecycle on Render staging after the Omise webhook test:

- Provider can see and accept a paid booking.
- Provider can update job status to on the way.
- Provider can send real-time location while the booking is active.
- Customer can fetch the provider's latest location.
- Admin can open exact provider location with a required reason and a 15-minute access window.
- Demo auth is disabled again after validation.

## Environment

- API: https://wellnest-api-staging.onrender.com
- Render service: wellnest-api-staging
- Booking: `book_mr0kyfjd_3z38s83a`
- Customer: `usr_customer_001`
- Provider: `usr_provider_001`
- Admin: `usr_admin_001`

## Result

Passed.

The original provider offer had expired before this validation, so admin reassignment was used to create a fresh offer for the same provider. After reassignment, the provider lifecycle worked end to end.

## Evidence

| Step | Endpoint | Result |
| --- | --- | --- |
| Customer login for test window | `POST /auth/login` | 200 |
| Provider login for test window | `POST /auth/login` | 200 |
| Admin login for test window | `POST /auth/login` | 200 |
| Provider job list | `GET /provider/jobs` | 200, target booking found as `provider_offered` |
| First accept attempt | `POST /provider/jobs/:id/accept` | 409 `PROVIDER_OFFER_NOT_ACTIVE` |
| Admin reassign provider | `POST /admin/bookings/:id/reassign-provider` | 200, booking returned to `provider_offered` |
| Provider accept after reassignment | `POST /provider/jobs/:id/accept` | 200, booking became `provider_accepted` |
| Provider status update | `POST /provider/jobs/:id/status` | 200, booking became `provider_on_the_way` |
| Provider location update | `POST /provider/jobs/:id/location` | 200, location accepted |
| Customer tracking | `GET /bookings/:id/provider-location` | 200, latest location returned |
| Admin exact location access | `POST /admin/bookings/:id/location-access` | 200, `accessLevel=exact`, `expiresInMinutes=15` |
| Admin booking list | `GET /admin/bookings` | 200, target booking visible as `provider_on_the_way` |
| Demo auth closeout | `POST /auth/login` | 403 `DEMO_AUTH_DISABLED` |

## Location Test Point

- Latitude: `13.7217`
- Longitude: `100.5134`
- Accuracy: `15` meters

## Privacy and Safety Notes

- Provider location submission was accepted only after the booking was active.
- Customer tracking returned data only for the booking owner.
- Admin exact location access required a reason code and created a short access window.
- Demo auth was enabled only for the staging validation window and disabled immediately afterward.

## Next Recommended Step

Move to OTP/SMS staging validation so customer and provider login can be tested without demo auth.
