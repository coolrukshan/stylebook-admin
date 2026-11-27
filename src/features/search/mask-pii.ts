/**
 * Stopgap: the API may not pre-mask PII in search `subtitle` (unverified, no
 * admin credentials were available). Conservative: masks anything that looks
 * like an email or a phone number (ISO dates are left alone). Also used for
 * free-text audit reasons. Remove once the API guarantees masking.
 */
const ISO_DATE = /\b((?:19|20)\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01]))(?!\d)/;

const maskNumbers = (text: string) =>
  text.replace(/(\+?\d[\d\s-]{6,}\d)/g, (m) => {
    const digits = m.replace(/\D/g, "");
    return digits.length >= 8 ? `${m.trim().slice(0, 3)}••••${digits.slice(-2)}` : m;
  });

export function maskPii(text: string | null | undefined): string {
  if (!text) return "";
  const emailsMasked = text.replace(/([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*(@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g, "$1•••$2");
  // Splitting on a capture group leaves ISO dates at the odd indexes, untouched.
  return emailsMasked
    .split(ISO_DATE)
    .map((part, i) => (i % 2 ? part : maskNumbers(part)))
    .join("");
}
