# Sprint 1 Foundation

Status: foundation scaffold in progress

## Added in Sprint 1

- API current-user helper using `x-wellnest-role` for local development
- Role guards:
  - customer
  - provider
  - admin roles
- Database client pattern for PostgreSQL
- Service repository with database fallback pattern
- Booking repository with demo fallback
- Booking ownership check
- Provider location guard
- Customer tracking guard
- Admin exact location reason requirement

## Local Dev Role Header

Until real auth is implemented, local API requests can use:

```text
x-wellnest-role: customer
x-wellnest-role: provider
x-wellnest-role: admin
```

This is for development only and must be replaced by real JWT/session auth.

## Key API Safety Rules

### Booking read

- Customer can read own booking
- Provider can read assigned booking
- Admin can read through admin role

### Provider location update

- Provider role required
- Booking must be assigned to provider
- Booking must not be `service_started`, `completed`, or `cancelled`

### Customer tracking

- Customer can read provider location only for own booking

### Admin exact location access

- Admin role required
- `reasonCode` required
- Access grant expires in 15 minutes

## Next Sprint 1 Work

- Replace local role header with real auth token
- Add passwordless/OTP login decision
- Add database client migrations runner
- Connect booking create to PostgreSQL
- Add payment provider sandbox
- Add tests for ownership and location access

