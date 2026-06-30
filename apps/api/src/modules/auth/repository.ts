import crypto from "node:crypto";
import type { UserRole } from "@wellnest/types";
import { isDemoAuthAllowed, type CurrentUser } from "../../core/auth/current-user";
import { query } from "../../core/db/client";
import { createId } from "../bookings/repository";
import { sendOtpSms } from "../sms/provider";

export interface LoginInput {
  role: "customer" | "provider" | "admin";
}

export interface OtpRequestInput {
  phone: string;
  role: "customer" | "provider";
}

export interface OtpRequestResult {
  challengeId: string;
  expiresInSeconds: number;
  deliveryChannel: "sms";
  devOtp?: string;
}

export interface OtpVerifyInput {
  challengeId: string;
  phone: string;
  otp: string;
}

export interface LoginResult {
  accessToken: string;
  tokenType: "Bearer";
  expiresInSeconds: number;
  user: CurrentUser & {
    phoneVerified: boolean;
  };
}

const roleToUserId: Record<LoginInput["role"], string> = {
  customer: "usr_customer_001",
  provider: "usr_provider_001",
  admin: "usr_admin_001",
};

const otpExpiresInSeconds = 5 * 60;
const maxOtpAttempts = 5;

export async function loginDemoUser(input: LoginInput): Promise<LoginResult> {
  if (!isDemoAuthAllowed()) throw new Error("DEMO_AUTH_DISABLED");

  const userId = roleToUserId[input.role];
  const user = await getUserById(userId);
  if (!user) throw new Error("USER_NOT_FOUND");

  const expiresInSeconds = 60 * 60 * 8;
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
  const sessionId = createId("sess");
  const accessToken = signAccessToken({
    sessionId,
    userId: user.id,
    role: user.role,
    name: user.name,
    exp: Math.floor(expiresAt.getTime() / 1000),
  });

  if (process.env.DATABASE_URL) {
    await query(
      `
        INSERT INTO auth_sessions (id, user_id, expires_at, source)
        VALUES ($1, $2, $3, 'demo_login')
      `,
      [sessionId, user.id, expiresAt.toISOString()],
    );
  }

  return {
    accessToken,
    tokenType: "Bearer",
    expiresInSeconds,
    user,
  };
}

export async function requestOtpLogin(input: OtpRequestInput): Promise<OtpRequestResult> {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED");
  if (!isValidPhone(input.phone)) throw new Error("OTP_PHONE_INVALID");
  if (!process.env.SMS_PROVIDER && !isDemoAuthAllowed()) throw new Error("SMS_PROVIDER_REQUIRED");

  const user = await getUserByPhoneAndRole(input.phone, input.role);
  if (!user) throw new Error("USER_NOT_FOUND");

  const otp = createOtpCode();
  const challengeId = createId("otp");
  const expiresAt = new Date(Date.now() + otpExpiresInSeconds * 1000);

  await query(
    `
      INSERT INTO auth_otp_challenges (
        id,
        phone,
        role,
        otp_hash,
        expires_at
      )
      VALUES ($1, $2, $3, $4, $5)
    `,
    [challengeId, normalizePhone(input.phone), input.role, hashOtp(otp), expiresAt.toISOString()],
  );

  await sendOtpSms({
    phone: normalizePhone(input.phone),
    otp,
    expiresInSeconds: otpExpiresInSeconds,
  });

  return {
    challengeId,
    expiresInSeconds: otpExpiresInSeconds,
    deliveryChannel: "sms",
    ...(isDemoAuthAllowed() ? { devOtp: otp } : {}),
  };
}

export async function verifyOtpLogin(input: OtpVerifyInput): Promise<LoginResult> {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED");
  if (!input.challengeId || !isValidPhone(input.phone) || !/^[0-9]{6}$/.test(input.otp)) throw new Error("OTP_VERIFY_INVALID");

  const challenges = await query<{
    id: string;
    phone: string;
    role: "customer" | "provider";
    otpHash: string;
    attempts: number;
    expiresAt: string;
    consumedAt?: string;
  }>(
    `
      SELECT
        id,
        phone,
        role,
        otp_hash AS "otpHash",
        attempts,
        expires_at AS "expiresAt",
        consumed_at AS "consumedAt"
      FROM auth_otp_challenges
      WHERE id = $1
        AND phone = $2
    `,
    [input.challengeId, normalizePhone(input.phone)],
  );

  const challenge = challenges[0];
  if (!challenge) throw new Error("OTP_CHALLENGE_NOT_FOUND");
  if (challenge.consumedAt) throw new Error("OTP_CHALLENGE_CONSUMED");
  if (new Date(challenge.expiresAt).getTime() <= Date.now()) throw new Error("OTP_CHALLENGE_EXPIRED");
  if (challenge.attempts >= maxOtpAttempts) throw new Error("OTP_ATTEMPTS_EXCEEDED");

  if (!timingSafeEqual(hashOtp(input.otp), challenge.otpHash)) {
    await query("UPDATE auth_otp_challenges SET attempts = attempts + 1 WHERE id = $1", [challenge.id]);
    throw new Error("OTP_CODE_INVALID");
  }

  const user = await getUserByPhoneAndRole(input.phone, challenge.role);
  if (!user) throw new Error("USER_NOT_FOUND");

  await query("UPDATE auth_otp_challenges SET consumed_at = now() WHERE id = $1", [challenge.id]);

  return createSessionForUser(user, "otp_login");
}

export async function getMe(user: CurrentUser) {
  const dbUser = await getUserById(user.id);
  return dbUser ?? { ...user, phoneVerified: true };
}

export async function getUserById(id: string) {
  if (!process.env.DATABASE_URL) {
    const demoUsers: Record<string, CurrentUser & { phoneVerified: boolean }> = {
      usr_customer_001: { id: "usr_customer_001", role: "customer", name: "พี่ปลั๊ก ปภาวิน", phoneVerified: true },
      usr_provider_001: { id: "usr_provider_001", role: "provider", name: "นิดา สุขสบาย", phoneVerified: true },
      usr_admin_001: { id: "usr_admin_001", role: "safety_manager", name: "มินท์ Ops", phoneVerified: true },
    };

    return demoUsers[id];
  }

  const rows = await query<CurrentUser & { phoneVerified: boolean }>(
    `
      SELECT
        id,
        role,
        name,
        phone_verified AS "phoneVerified"
      FROM users
      WHERE id = $1
    `,
    [id],
  );

  return rows[0];
}

async function getUserByPhoneAndRole(phone: string, role: "customer" | "provider") {
  const rows = await query<CurrentUser & { phoneVerified: boolean }>(
    `
      SELECT
        id,
        role,
        name,
        phone_verified AS "phoneVerified"
      FROM users
      WHERE phone = $1
        AND role = $2
        AND phone_verified = TRUE
      LIMIT 1
    `,
    [normalizePhone(phone), role],
  );

  return rows[0];
}

async function createSessionForUser(user: CurrentUser & { phoneVerified: boolean }, source: "demo_login" | "otp_login"): Promise<LoginResult> {
  const expiresInSeconds = 60 * 60 * 8;
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
  const sessionId = createId("sess");
  const accessToken = signAccessToken({
    sessionId,
    userId: user.id,
    role: user.role,
    name: user.name,
    exp: Math.floor(expiresAt.getTime() / 1000),
  });

  if (process.env.DATABASE_URL) {
    await query(
      `
        INSERT INTO auth_sessions (id, user_id, expires_at, source)
        VALUES ($1, $2, $3, $4)
      `,
      [sessionId, user.id, expiresAt.toISOString(), source],
    );
  }

  return {
    accessToken,
    tokenType: "Bearer",
    expiresInSeconds,
    user,
  };
}

export function parseAccessToken(token: string): CurrentUser | undefined {
  const parts = token.split(".");
  if (parts.length !== 2) return undefined;

  const [payloadText, signature] = parts;
  const expectedSignature = createSignature(payloadText);
  if (!timingSafeEqual(signature, expectedSignature)) return undefined;

  try {
    const payload = JSON.parse(Buffer.from(payloadText, "base64url").toString("utf8")) as {
      userId?: string;
      role?: UserRole;
      name?: string;
      exp?: number;
    };

    if (!payload.userId || !payload.role || !payload.name || !payload.exp) return undefined;
    if (payload.exp * 1000 <= Date.now()) return undefined;

    return {
      id: payload.userId,
      role: payload.role,
      name: payload.name,
    };
  } catch {
    return undefined;
  }
}

function signAccessToken(payload: { sessionId: string; userId: string; role: UserRole; name: string; exp: number }) {
  const payloadText = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${payloadText}.${createSignature(payloadText)}`;
}

function createOtpCode() {
  return crypto.randomInt(100000, 1000000).toString();
}

function hashOtp(otp: string) {
  return crypto.createHmac("sha256", getOtpSecret()).update(otp).digest("base64url");
}

function getOtpSecret() {
  const secret = process.env.OTP_SECRET || process.env.JWT_SECRET || (isDemoAuthAllowed() ? "wellnest_dev_otp_secret_change_before_production" : undefined);
  if (!secret) throw new Error("OTP_SECRET_REQUIRED");
  return secret;
}

function normalizePhone(phone: string) {
  return phone.trim().replace(/\s+/g, "");
}

function isValidPhone(phone: string) {
  return /^\+?[0-9X-]{8,20}$/.test(normalizePhone(phone));
}

function createSignature(payloadText: string) {
  const secret = process.env.JWT_SECRET || (isDemoAuthAllowed() ? "wellnest_dev_auth_secret_change_before_production" : undefined);
  if (!secret) throw new Error("AUTH_SECRET_REQUIRED");

  return crypto.createHmac("sha256", secret).update(payloadText).digest("base64url");
}

function timingSafeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.byteLength !== rightBuffer.byteLength) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function mapAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : "";

  if (message === "USER_NOT_FOUND") {
    return { statusCode: 404, code: "USER_NOT_FOUND", message: "User not found" };
  }

  if (message === "DEMO_AUTH_DISABLED") {
    return { statusCode: 403, code: "DEMO_AUTH_DISABLED", message: "Demo login is disabled in this environment" };
  }

  if (message === "AUTH_SECRET_REQUIRED") {
    return { statusCode: 500, code: "AUTH_SECRET_REQUIRED", message: "JWT secret is required" };
  }

  if (message === "DATABASE_URL_REQUIRED") {
    return { statusCode: 500, code: "DATABASE_URL_REQUIRED", message: "Database URL is required" };
  }

  if (message === "SMS_PROVIDER_REQUIRED") {
    return { statusCode: 500, code: "SMS_PROVIDER_REQUIRED", message: "SMS provider is required for OTP delivery" };
  }

  if (message === "OTP_SECRET_REQUIRED") {
    return { statusCode: 500, code: "OTP_SECRET_REQUIRED", message: "OTP secret is required" };
  }

  if (message === "OTP_PHONE_INVALID" || message === "OTP_VERIFY_INVALID") {
    return { statusCode: 400, code: message, message: "OTP input is invalid" };
  }

  if (message === "OTP_CHALLENGE_NOT_FOUND") {
    return { statusCode: 404, code: "OTP_CHALLENGE_NOT_FOUND", message: "OTP challenge not found" };
  }

  if (message === "OTP_CHALLENGE_CONSUMED" || message === "OTP_CHALLENGE_EXPIRED" || message === "OTP_ATTEMPTS_EXCEEDED") {
    return { statusCode: 409, code: message, message: "OTP challenge is no longer valid" };
  }

  if (message === "OTP_CODE_INVALID") {
    return { statusCode: 401, code: "OTP_CODE_INVALID", message: "OTP code is invalid" };
  }

  return { statusCode: 500, code: "AUTH_OPERATION_FAILED", message: "Auth operation failed" };
}
