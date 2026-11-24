/**
 * Stopgap: the API may not pre-mask PII in search `subtitle` (unverified, no
 * admin credentials were available). Conservative: masks anything that looks
 * like an email or a phone number. Remove once the API guarantees masking.
 */
export function maskPii(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*(@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g, "$1•••$2")
    .replace(/(\+?\d[\d\s-]{6,}\d)/g, (m) => {
      const digits = m.replace(/\D/g, "");
      return digits.length >= 8 ? `${m.trim().slice(0, 3)}••••${digits.slice(-2)}` : m;
    });
}
