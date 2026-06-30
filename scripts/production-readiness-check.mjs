import { loadDotEnv } from "./env.mjs";

loadDotEnv();

const requiredForProduction = [
  "APP_ENV",
  "DATABASE_URL",
  "JWT_SECRET",
  "REFRESH_TOKEN_SECRET",
  "OTP_SECRET",
  "SMS_PROVIDER",
  "SMS_API_KEY",
  "SMS_WEBHOOK_URL",
  "GOOGLE_MAPS_API_KEY",
  "PAYMENT_PROVIDER",
  "PAYMENT_SECRET_KEY",
  "PAYMENT_WEBHOOK_SECRET",
  "PAYMENT_WEBHOOK_URL",
  "SENTRY_DSN",
];

const weakValues = new Set(["", "sandbox", "demo", "changeme", "change_me", "test"]);

const failures = [];
const warnings = [];

if (process.env.APP_ENV !== "production") {
  warnings.push("APP_ENV is not production. This is fine for local demo, but not for launch.");
}

if (process.env.WELLNEST_ENABLE_DEMO_AUTH === "true") {
  failures.push("WELLNEST_ENABLE_DEMO_AUTH must not be true in production.");
}

for (const key of requiredForProduction) {
  const value = process.env[key]?.trim();
  if (!value) {
    failures.push(`${key} is required for production.`);
    continue;
  }

  if (weakValues.has(value.toLowerCase())) {
    failures.push(`${key} has a weak placeholder value.`);
  }
}

if (process.env.PAYMENT_PROVIDER === "omise") {
  for (const key of ["OMISE_SECRET_KEY", "OMISE_WEBHOOK_SECRET"]) {
    const value = process.env[key]?.trim();
    if (!value) failures.push(`${key} is required when PAYMENT_PROVIDER=omise.`);
    if (value && weakValues.has(value.toLowerCase())) failures.push(`${key} has a weak placeholder value.`);
  }
}

if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  failures.push("JWT_SECRET should be at least 32 characters.");
}

if (process.env.REFRESH_TOKEN_SECRET && process.env.REFRESH_TOKEN_SECRET.length < 32) {
  failures.push("REFRESH_TOKEN_SECRET should be at least 32 characters.");
}

if (!process.env.APP_STORE_TEAM_ID) {
  warnings.push("APP_STORE_TEAM_ID is not configured yet.");
}

if (!process.env.GOOGLE_PLAY_PACKAGE_NAME) {
  warnings.push("GOOGLE_PLAY_PACKAGE_NAME is not configured yet.");
}

console.log("Wellnest Production Readiness Check");
console.log("===================================");

for (const warning of warnings) {
  console.log(`WARN - ${warning}`);
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.log(`FAIL - ${failure}`);
  }

  process.exit(1);
}

console.log("OK - Production readiness gate passed.");
