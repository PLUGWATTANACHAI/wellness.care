# Wellnest Real Demo Flow

Use this flow to test the current Supabase-backed prototype.

## Start Demo

Open this file from Finder:

- `เปิด Wellnest Real Demo.command`

It starts:

- API at `http://127.0.0.1:4000`
- Admin Dashboard at `http://127.0.0.1:5173`
- Mobile Expo dev server

Keep the Terminal window open while testing.

## Reset Demo Data

Before a clean test run:

```bash
pnpm demo:reset
```

This keeps the seed users, services, address, and seed booking, but removes generated test bookings and related demo records.

## Customer Flow

1. Open the mobile app.
2. Use `Demo Run > 1 Book`.
3. Confirm the saved condo address.
4. Check provider availability.
5. Create booking.
6. Review before payment.
7. Proceed to payment.
8. Pay test.
9. Send a customer-provider message.
10. Create a support request if needed.

## Provider Flow

1. Use `Demo Run > 2 Provider`.
2. Review the latest job.
3. Accept the job.
4. Tap `On the way`.
5. Allow location.
6. Send location.
7. Reply to the customer message.

## Inbox Flow

1. Use `Demo Run > 3 Inbox`.
2. Switch between Customer and Provider inbox.
3. Check unread notifications.
4. Mark notifications as read.

## Admin Flow

1. Open Admin Dashboard at `http://127.0.0.1:5173`.
2. Review live bookings.
3. Review Communication Notes.
4. Review Support Triage.
5. Move a case to `in_review`.
6. Resolve a case with a resolution note.

## Privacy Flow

1. Use `Demo Run > 4 Privacy`.
2. Review privacy and location consent surfaces.

## Current Demo Limits

This is a local prototype, not a production app store release.

Production still needs:

- real customer/provider authentication
- real payment gateway
- production Google Maps setup
- cloud deployment
- app store build and review
- PDPA/security review
- QA on real devices
