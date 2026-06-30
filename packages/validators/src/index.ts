export function assertNonEmpty(value: unknown, fieldName: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldName} is required`);
  }
}

export function isValidBookingCode(value: string): boolean {
  return /^#WN-\d{6,}$/.test(value);
}

