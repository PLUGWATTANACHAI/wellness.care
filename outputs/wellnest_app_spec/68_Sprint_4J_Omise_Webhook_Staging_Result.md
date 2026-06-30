# Sprint 4J - Omise Webhook Staging Result

Date: 2026-06-30

## Completed

- Configured the Omise test webhook endpoint:
  - `https://wellnest-api-staging.onrender.com/webhooks/payment`
- Temporarily enabled staging demo auth only for test booking creation.
- Created a staging booking and Omise PromptPay test payment.
- Marked the Omise test charge as paid in the Omise dashboard.
- Confirmed Omise webhook reached the Render staging API and updated Wellnest state.
- Disabled staging demo auth again after the test.

## Test Records

- Booking ID: `book_mr0kyfjd_3z38s83a`
- Payment ID: `pay_mr0kyhq4_pix5ah5z`
- Omise charge ID: `chrg_test_686t8cm53zt1l210gyh`

## Verified Result

- Payment provider: `omise`
- Payment status: `succeeded`
- Booking status: `provider_offered`
- Staging health: `ok`
- Database health: `ok`
- Demo auth after test: disabled

## Notes

- This was a test-mode Omise payment. No real payment was made.
- The staging webhook path is now ready for continued provider-offer and booking lifecycle testing.
- Production launch still requires live Omise account approval, live keys, live webhook setup, and real SMS/OTP provider setup.
