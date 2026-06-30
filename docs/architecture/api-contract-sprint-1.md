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

## Bookings

```text
POST /bookings
GET /bookings/:id
```

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

