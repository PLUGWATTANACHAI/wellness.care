import type { CurrentUser } from "../../core/auth/current-user";
import { query } from "../../core/db/client";
import { createId } from "../bookings/repository";

export interface ConsentInput {
  consentType: "privacy_notice" | "location_sharing" | "provider_agreement" | "admin_access_policy" | "marketing";
  documentVersion: string;
  sourceScreen: string;
}

export async function recordConsent(user: CurrentUser, input: ConsentInput) {
  if (!process.env.DATABASE_URL) {
    return {
      id: "consent_dev_001",
      userId: user.id,
      consentType: input.consentType,
      documentVersion: input.documentVersion,
      acceptedAt: new Date().toISOString(),
    };
  }

  const rows = await query<{
    id: string;
    userId: string;
    consentType: string;
    documentVersion: string;
    acceptedAt: string;
  }>(
    `
      INSERT INTO consent_records (
        id,
        user_id,
        consent_type,
        document_version,
        source_screen
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        id,
        user_id AS "userId",
        consent_type AS "consentType",
        document_version AS "documentVersion",
        accepted_at AS "acceptedAt"
    `,
    [createId("consent"), user.id, input.consentType, input.documentVersion, input.sourceScreen],
  );

  return rows[0];
}
