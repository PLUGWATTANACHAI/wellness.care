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

## Closed Tester Mode

For a no-SMS-cost staging pilot, set a private 6-digit tester code in Render:

```env
APP_ENV=staging
WELLNEST_ENABLE_DEMO_AUTH=false
WELLNEST_TESTER_OTP_CODE=123456
```

The API will accept the tester code for OTP challenges but will not return the code in the response unless demo auth is enabled. Share the code only with the closed tester group. Do not set this variable in production.

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
- `WELLNEST_TESTER_OTP_CODE` must be empty in production.

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
