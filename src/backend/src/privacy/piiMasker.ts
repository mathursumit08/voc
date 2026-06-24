const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const phonePattern = /(?<!\d)(?:\+?91[\s-]?)?(?:[6-9]\d{9})(?!\d)/g;

export function maskPii(value: string) {
  // Keep masking deterministic so repeated uploads produce stable processed text.
  return value
    .replace(emailPattern, "[EmailMasked]")
    .replace(phonePattern, "[PhoneMasked]");
}

