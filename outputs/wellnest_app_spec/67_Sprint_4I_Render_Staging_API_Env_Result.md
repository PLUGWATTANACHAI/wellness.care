# Sprint 4I - Render Staging API Environment Result

Date: 2026-06-30

## Completed

- Added required private staging environment variables to Render without committing secrets.
- Triggered a Render rebuild/deploy after environment updates.
- Fixed Supabase pooled database TLS behavior for Render staging:
  - `DATABASE_SSL=true`
  - `DATABASE_SSL_REJECT_UNAUTHORIZED=false`
- Verified the public staging API health endpoint:
  - `https://wellnest-api-staging.onrender.com/health`
  - Result: API status `ok`, database status `ok`

## Notes

- Render generated the JWT, refresh-token, and OTP secrets from the Blueprint.
- Omise/Opn test payment keys and webhook secret are configured in Render as private environment variables.
- The staging API is now ready for the next payment webhook validation step.

## Next

1. Point the Omise webhook endpoint to:
   - `https://wellnest-api-staging.onrender.com/webhooks/payment`
2. Create a staging test booking/payment.
3. Confirm Omise webhook delivery updates the payment status in the database.
