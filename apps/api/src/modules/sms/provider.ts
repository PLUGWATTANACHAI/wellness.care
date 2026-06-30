import { isDemoAuthAllowed } from "../../core/auth/current-user";

export interface SendOtpSmsInput {
  phone: string;
  otp: string;
  expiresInSeconds: number;
}

export interface SmsDeliveryResult {
  provider: "console" | "webhook";
  delivered: boolean;
  providerReference?: string;
}

export async function sendOtpSms(input: SendOtpSmsInput): Promise<SmsDeliveryResult> {
  const provider = process.env.SMS_PROVIDER;

  if (!provider || provider === "console") {
    if (!isDemoAuthAllowed()) throw new Error("SMS_PROVIDER_REQUIRED");

    console.log(
      JSON.stringify({
        level: "info",
        event: "sms.otp.dev",
        phone: maskPhone(input.phone),
        otp: input.otp,
        expiresInSeconds: input.expiresInSeconds,
      }),
    );

    return {
      provider: "console",
      delivered: true,
      providerReference: "console_dev",
    };
  }

  if (provider === "webhook") {
    return sendWebhookSms(input);
  }

  throw new Error("SMS_PROVIDER_UNSUPPORTED");
}

async function sendWebhookSms(input: SendOtpSmsInput): Promise<SmsDeliveryResult> {
  const url = process.env.SMS_WEBHOOK_URL;
  const apiKey = process.env.SMS_API_KEY;

  if (!url || !apiKey) throw new Error("SMS_PROVIDER_REQUIRED");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      to: input.phone,
      template: "wellnest_otp",
      variables: {
        otp: input.otp,
        expiresInMinutes: Math.ceil(input.expiresInSeconds / 60),
      },
    }),
  });

  if (!response.ok) {
    throw new Error("SMS_DELIVERY_FAILED");
  }

  const body = (await response.json().catch(() => undefined)) as { id?: string; messageId?: string } | undefined;

  return {
    provider: "webhook",
    delivered: true,
    providerReference: body?.id ?? body?.messageId,
  };
}

function maskPhone(phone: string) {
  const trimmed = phone.trim();
  if (trimmed.length <= 4) return "****";
  return `${trimmed.slice(0, 2)}***${trimmed.slice(-2)}`;
}
