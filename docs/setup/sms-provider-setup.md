# SMS Provider Setup

Wellnest OTP login sends a 6-digit OTP through the SMS provider layer.

## Development Mode

Use:

```env
SMS_PROVIDER=console
WELLNEST_ENABLE_DEMO_AUTH=true
```

In development, the API logs the OTP and returns `devOtp` from `/auth/otp/request`.

Do not use this in production.

## Production Mode

Recommended first production path:

```env
APP_ENV=production
WELLNEST_ENABLE_DEMO_AUTH=false
SMS_PROVIDER=webhook
SMS_WEBHOOK_URL=https://your-sms-gateway.example/send
SMS_API_KEY=...
OTP_SECRET=...
```

The webhook receives:

```json
{
  "to": "+66812345678",
  "template": "wellnest_otp",
  "variables": {
    "otp": "123456",
    "expiresInMinutes": 5
  }
}
```

Expected response:

```json
{
  "id": "provider-message-id"
}
```

## Production Requirements

- `SMS_PROVIDER` must not be `console`.
- `SMS_WEBHOOK_URL` must be HTTPS.
- `SMS_API_KEY` must be stored only in production secrets.
- OTP must not be logged in production.
- `/auth/otp/request` must not return `devOtp` in production.
- SMS provider delivery failure should block OTP login.

## Provider Options

Possible SMS providers:

- Twilio
- AWS SNS
- Firebase phone auth adapter
- Thai SMS gateway with HTTPS API
- Make webhook connected to a vetted SMS gateway

## Current Implementation

Supported providers:

- `console` for development
- `webhook` for production integration

The webhook adapter keeps the app flexible while the final SMS vendor is selected.
