# Render Staging API Setup

This setup creates a stable HTTPS API URL for Omise test webhooks.

Temporary tunnels are not recommended for payment webhook verification because they can expire, fail DNS resolution, or change URL.

## Goal

Deploy the Wellnest API to a stable staging URL:

```text
https://wellnest-api-staging.onrender.com
```

Then set Omise test webhook endpoint:

```text
https://wellnest-api-staging.onrender.com/webhooks/payment
```

If Render gives a different URL, use that Render URL instead.

## Render Blueprint

The project includes:

```text
render.yaml
```

Render can read this file and create the `wellnest-api-staging` web service.

The staging blueprint uses Render's free web service plan first to avoid requiring billing details during webhook testing.

The build command intentionally uses Render's available `pnpm` directly. Do not run `corepack enable` on Render because the platform image can expose `/usr/bin/pnpm` on a read-only filesystem.

## Required Render Environment Variables

Set these as private environment variables in Render.

Do not paste secret values into chat or docs.

```env
DATABASE_URL=<Supabase connection string>
PAYMENT_SECRET_KEY=<Omise test secret key>
PAYMENT_WEBHOOK_SECRET=<Omise test webhook secret>
OMISE_SECRET_KEY=<Omise test secret key>
OMISE_WEBHOOK_SECRET=<Omise test webhook secret>
```

Render can generate:

```env
JWT_SECRET
REFRESH_TOKEN_SECRET
OTP_SECRET
```

## Staging Defaults

These are already defined in `render.yaml`:

```env
APP_ENV=staging
WELLNEST_ENABLE_DEMO_AUTH=false
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=true
PAYMENT_PROVIDER=omise
OMISE_PAYMENT_METHOD=promptpay
OMISE_API_BASE_URL=https://api.omise.co
LOCATION_RETENTION_HOURS=72
ADMIN_LOCATION_ACCESS_MINUTES=15
```

## Deploy Steps

1. Push the latest Wellnest code to a private GitHub repository.
2. Open Render.
3. Create a new Blueprint from the GitHub repository.
4. Select `render.yaml`.
5. Fill the private environment variables.
6. Deploy the web service.
7. Open:

```text
https://<render-service-url>/health
```

Expected result:

```json
{
  "status": "ok",
  "service": "wellnest-api",
  "database": {
    "status": "ok"
  }
}
```

## Omise Webhook Setup

After Render is live:

1. Open Omise Dashboard test mode.
2. Go to Settings > Webhooks.
3. Set endpoint:

```text
https://<render-service-url>/webhooks/payment
```

4. Confirm the webhook secret in Render matches the current Omise test webhook secret.
5. Create a new Wellnest Omise test charge.
6. In Omise charge detail, choose Testing > Mark as paid.
7. Confirm Omise Recent Deliveries shows a 2xx status.
8. Confirm Wellnest payment and booking move forward from the verified webhook.

## Do Not Use For Real Launch Yet

This is staging.

Before real launch:

- Finish live merchant approval.
- Replace test Omise keys with live keys.
- Use a production domain.
- Enable real SMS provider.
- Enable monitoring and error alerts.
- Review refund/cancellation policy.
- Review PDPA/privacy requirements.
