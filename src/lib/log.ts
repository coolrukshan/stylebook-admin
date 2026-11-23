/**
 * Redacting logger. Rule: never log request bodies, search queries, reasons or
 * revealed values. Anything logged passes through `redact`, which masks known
 * PII keys at any depth. Sentry (not installed yet) must use the same scrub
 * list in `beforeSend`.
 */
export const PII_KEYS = [
  "email",
  "owner_email",
  "phone",
  "owner_phone",
  "account_number",
  "account_name",
  "password",
  "totp_code",
  "token",
  "access_token",
  "partial_token",
  "authorization",
  "q",
  "query",
  "search",
  "reason",
] as const;

const PII = new Set<string>(PII_KEYS);

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[truncated]";
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, PII.has(k.toLowerCase()) ? "[redacted]" : redact(v, depth + 1)]),
    );
  }
  return value;
}

export const log = {
  info: (msg: string, ctx?: unknown) => console.info(msg, ctx === undefined ? "" : redact(ctx)),
  warn: (msg: string, ctx?: unknown) => console.warn(msg, ctx === undefined ? "" : redact(ctx)),
  error: (msg: string, ctx?: unknown) => console.error(msg, ctx === undefined ? "" : redact(ctx)),
};
