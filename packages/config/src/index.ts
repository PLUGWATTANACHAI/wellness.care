export const locationPolicyDefaults = {
  rawLocationRetentionHours: 72,
  adminExactAccessMinutes: 15,
  providerLocationMode: "active_booking_only",
} as const;

export const supportedServiceCategories = [
  "Massage",
  "Beauty & Relax",
  "Wellness Products",
  "Other",
] as const;

