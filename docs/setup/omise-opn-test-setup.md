# Omise / Opn Test Payment Setup

Wellnest supports Omise / Opn as a first Thailand-ready payment provider foundation.

## Dashboard Status

Use Omise test mode first.

Test mode creates no real payment.

## Required Dashboard Values

Keep these values private:

- Test secret key
- Test public key
- Test webhook secret

Do not paste secret values into chat, documents, Git, screenshots, or public tickets.

## Local Environment

Set these in the local `.env` file only:

```env
PAYMENT_PROVIDER=omise
PAYMENT_SECRET_KEY=<same as OMISE_SECRET_KEY for compatibility>
PAYMENT_WEBHOOK_SECRET=<same as OMISE_WEBHOOK_SECRET for compatibility>
PAYMENT_WEBHOOK_URL=
OMISE_SECRET_KEY=<test secret key>
OMISE_PUBLIC_KEY=<test public key>
OMISE_WEBHOOK_SECRET=<test webhook secret>
OMISE_PAYMENT_METHOD=promptpay
OMISE_API_BASE_URL=https://api.omise.co
```

## How Payment Creation Works

Wellnest creates an Omise PromptPay charge from the API server.

The charge includes metadata:

- `payment_id`
- `booking_id`
- `customer_id`

This lets the Omise webhook map a completed charge back to the Wellnest payment record.

## How Webhook Verification Works

Omise signs webhook requests using:

- `Omise-Signature`
- `Omise-Signature-Timestamp`

Wellnest verifies the signature with HMAC SHA-256 against:

```text
<timestamp>.<raw webhook body>
```

The webhook secret must be treated as confidential.

## Local Testing Limitation

Omise requires a public HTTPS webhook endpoint.

For local testing, use a tunnel such as ngrok or Cloudflare Tunnel:

```text
https://<temporary-tunnel-domain>/webhooks/payment
```

Add that URL to the Omise test webhook settings.

## Test Flow

1. Create a booking in Wellnest.
2. Create a payment intent.
3. Wellnest creates an Omise PromptPay charge.
4. In Omise test dashboard, open the charge.
5. Use Actions to mark the charge Successful or Failed.
6. Omise sends `charge.complete` to Wellnest.
7. Wellnest verifies the signature and updates the booking payment status.

## Production Notes

- Live account approval is required before real payments.
- Live keys are separate from test keys.
- Webhook secret is separate for test and live mode.
- The checkout and refund/cancellation policy must be visible to customers before real payment.
