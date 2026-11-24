/**
 * Contact masking for values the API returns unmasked (users list/detail).
 * `maskPii` (features/search) is for free text; these are for known fields.
 * Never returns middle characters of the local part or middle digits.
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return "";
  const at = email.lastIndexOf("@");
  if (at < 1) return "••••";
  const local = email.slice(0, at);
  const domain = email.slice(at);
  if (local.length <= 2) return `${local[0]}••••${domain}`;
  return `${local[0]}••••${local[local.length - 1]}${domain}`;
}

/** "+94771234567" | "0771234567" | "94771234567" -> "+94 77 ••• 4567". */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  const last4 = digits.slice(-4);
  let national: string | null = null;
  if (digits.length === 11 && digits.startsWith("94")) national = digits.slice(2);
  else if (digits.length === 10 && digits.startsWith("0")) national = digits.slice(1);
  else if (digits.length === 9) national = digits;
  if (national) return `+94 ${national.slice(0, 2)} ••• ${last4}`;
  return digits.length >= 4 ? `••••${last4}` : "••••";
}
