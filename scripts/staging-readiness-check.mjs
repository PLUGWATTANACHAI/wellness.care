import { loadDotEnv } from "./env.mjs";

loadDotEnv();

const requiredForStaging = [
  "APP_ENV",
  "DATABASE_URL",
  "JWT_SECRET",
  "REFRESH_TOKEN_SECRET",
  "OTP_SECRET",
  "PAYMENT_PROVIDER",
  "OMISE_SECRET_KEY",
  "OMISE_WEBHOOK_SECRET",
];

const failures = [];
const warnings = [];

if (process.env.APP_ENV !== "staging") {
  warnings.push("APP_ENV is not staging. This check is designed for the staging API.");
}

if (process.env.WELLNEST_ENABLE_DEMO_AUTH === "true") {
  failures.push("WELLNEST_ENABLE_DEMO_AUTH must not be true on staging.");
}

for (const key of requiredForStaging) {
  const value = process.env[key]?.trim();
  if (!value) failures.push(`${key} is required for staging.`);
}

if (process.env.PAYMENT_PROVIDER !== "omise") {
  failures.push("PAYMENT_PROVIDER must be omise for the Omise staging test.");
}

if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  failures.push("JWT_SECRET should be at least 32 characters.");
}

if (process.env.REFRESH_TOKEN_SECRET && process.env.REFRESH_TOKEN_SECRET.length < 32) {
  failures.push("REFRESH_TOKEN_SECRET should be at least 32 characters.");
}

if (!process.env.PAYMENT_WEBHOOK_URL?.startsWith("https://")) {
  warnings.push("PAYMENT_WEBHOOK_URL should be the final HTTPS Render webhook endpoint.");
}

console.log("Wellnest Staging Readiness Check");
console.log("================================");

for (const warning of warnings) console.log(`WARN - ${warning}`);

if (failures.length > 0) {
  for (const failure of failures) console.log(`FAIL - ${failure}`);
  process.exit(1);
}

console.log("OK - Staging readiness gate passed.");
