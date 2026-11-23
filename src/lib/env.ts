import "server-only";
import { z } from "zod";

const schema = z.object({
  API_BASE_URL: z.url().default("http://localhost:8000"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
});

let cached: z.infer<typeof schema> | undefined;

/** Validated server-only environment. Throws on first use if misconfigured. */
export function getEnv() {
  cached ??= schema.parse({
    API_BASE_URL: process.env.API_BASE_URL || undefined,
    SESSION_SECRET: process.env.SESSION_SECRET,
  });
  return cached;
}
