# Payment Provider Setup

Wellnest now uses a payment provider adapter instead of hardcoding sandbox payment creation.

## Development Mode

Use:

```env
PAYMENT_PROVIDER=sandbox
WELLNEST_ENABLE_DEMO_AUTH=true
```

Sandbox payment confirmation is only allowed outside production/demo-disabled environments.

## Production Mode

Recommended first integration path:

```env
APP_ENV=production
WELLNEST_ENABLE_DEMO_AUTH=false
PAYMENT_PROVIDER=omise
PAYMENT_SECRET_KEY=...
PAYMENT_WEBHOOK_SECRET=...
OMISE_SECRET_KEY=...
OMISE_WEBHOOK_SECRET=...
OMISE_PAYMENT_METHOD=promptpay
```

For the detailed Omise / Opn test setup, see `docs/setup/omise-opn-test-setup.md`.

## Create Payment Webhook

Wellnest sends:

```json
{
  "paymentId": "pay_xxx",
  "bookingId": "book_xxx",
  "amount": 1490,
  "currency": "THB",
  "customerId": "usr_customer_001"
}
```

Expected response:

```json
{
  "id": "provider-payment-id",
  "checkoutUrl": "https://checkout.example/pay/..."
}
```

The current mobile app still uses sandbox confirmation in development.

## Payment Confirmation Callback

Production payment status must be confirmed by `POST /webhooks/payment`.

Wellnest expects:

```json
{
  "id": "evt_provider_001",
  "type": "payment.succeeded",
  "paymentId": "pay_xxx",
  "status": "succeeded",
  "amount": 1490
}
```

Required header:

```http
x-wellnest-signature: <hmac_sha256_hex>
```

Signature rule:

- Use `PAYMENT_WEBHOOK_SECRET`.
- Sign the canonical JSON payload with HMAC SHA-256.
- Canonical JSON means object keys sorted alphabetically before `JSON.stringify`.
- The current supported statuses are `succeeded` and `failed`.

Webhook safety behavior:

- Duplicate `id` values are accepted but not processed twice.
- Payment amount must match the original Wellnest payment intent.
- Provider must match the original payment intent provider.
- Non-sandbox payments are confirmed only through this verified callback.

## Production Requirements

- `PAYMENT_PROVIDER` must not be `sandbox`.
- `PAYMENT_WEBHOOK_URL` must be HTTPS.
- `PAYMENT_SECRET_KEY` must be stored only in production secrets.
- `PAYMENT_WEBHOOK_SECRET` must be used to verify provider callbacks.
- Sandbox confirmation endpoint must not be used in production.
- Provider webhook signature verification must pass before real money.
- Webhook events should be monitored for duplicates, invalid signatures, and amount mismatches.

## Provider Options

Possible providers:

- Omise
- Stripe
- 2C2P
- GB Prime Pay
- Opn Payments
- Bank transfer/QR payment provider with webhook support

## Current Implementation

Supported providers:

- `sandbox` for development
- `webhook` for production adapter testing
- `omise` for Omise / Opn PromptPay charge creation and verified webhook callbacks
- `omise` card charge creation is prepared for tokenized card payments

Next required step:

- add the Omise test keys and test webhook URL, then run the full PromptPay test flow
- add Omise public-key tokenization / hosted checkout in the customer app before enabling card live payment
