# API Contract Sprint 1

Base URL:

```text
http://localhost:4000
```

## Health

```text
GET /health
```

## Auth

```text
POST /auth/login
GET /me
```

Local dev role header:

```text
x-wellnest-role: customer | provider | admin
```

## Services

```text
GET /services
```

Returns active service catalog.

## Partner Clinics

```text
GET /partner-clinics
GET /partner-clinics/:id
GET /partner-clinics/:id/slots
```

Customer app use:
- Show partner clinic cards on Home.
- Open a clinic detail page before date/time selection.
- Show clinic promotions and clinic-specific service packages.
- Load available clinic slots before confirmation.

## Bookings

```text
POST /bookings
GET /bookings/:id
```

Partner clinic booking can include:

```json
{
  "serviceId": "svc_beauty_90",
  "addressId": "addr_river_001",
  "scheduledAt": "2026-07-12T11:00:00.000Z",
  "partnerClinicId": "clinic_sathorn_wellness"
}
```

When `partnerClinicId` is present, backend stores `booking_channel = partner_clinic`.

Access:
- Customer: own booking only
- Provider: assigned booking only
- Admin: admin role only

## Provider Jobs

```text
POST /provider/jobs/:id/accept
POST /provider/jobs/:id/status
POST /provider/jobs/:id/location
```

Access:
- Provider role required
- Location update must match assigned provider

## Customer Tracking

```text
GET /bookings/:id/provider-location
```

Access:
- Customer must own booking

## Payments

```text
POST /payments/create-intent
POST /webhooks/payment
```

Payment webhook must become idempotent before launch.

## Privacy

```text
GET /privacy/documents/current
POST /privacy/consents
```

## Admin

```text
GET /admin/bookings
POST /admin/bookings/:id/location-access
GET /admin/audit-logs
```

Admin exact location access body:

```json
{
  "reasonCode": "safety",
  "reasonNote": "Customer requested support"
}
```
