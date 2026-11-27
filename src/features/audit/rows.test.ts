import { describe, expect, it } from "vitest";
import { actorLabel, describeAction, subject } from "./describe";
import { parseFilters } from "./filters";
import { toAuditRow } from "./rows";
import { auditEntrySchema } from "./schemas";

const ACTOR = "aaaaaaaa-5d4a-4b6f-9a7e-1c2d3e4f5a6b";
const TARGET = "bbbbbbbb-5d4a-4b6f-9a7e-1c2d3e4f5a6b";
const names = new Map([[ACTOR, "Dinusha Perera"]]);

describe("describe", () => {
  it("writes sentences for known actions and keeps unknown ones", () => {
    expect(describeAction("user.suspend")).toBe("Suspended user");
    expect(describeAction("booking.cancel")).toBe("booking.cancel");
  });
  it("links subjects that have a page", () => {
    expect(subject("payout_run", TARGET)).toEqual({ label: "payout run bbbbbbbb", href: `/payouts/runs/${TARGET}` });
    expect(subject("fee_settings", TARGET).href).toBeNull();
  });
  it("names the actor when possible", () => {
    expect(actorLabel("support", ACTOR, names)).toBe("Dinusha (Support)");
    expect(actorLabel("super_admin", TARGET, names)).toBe("Super admin · bbbbbbbb");
    expect(actorLabel("client", TARGET, names)).toBe("Client · bbbbbbbb");
    expect(actorLabel("system", ACTOR, names)).toBe("System");
  });
});

describe("toAuditRow", () => {
  const entry = auditEntrySchema.parse({
    id: "r1",
    actor_id: ACTOR,
    actor_role: "support",
    actor_email: "dinusha@stylebook.lk",
    action: "user.suspend",
    target_type: "user",
    target_id: TARGET,
    reason: "Called 0771234567 from nimal@example.com",
    ip_address: "10.4.2.17",
    meta: { account_name: "Secret Holder" },
    created_at: "2026-10-25T03:42:00Z",
  });
  const row = toAuditRow(entry, names, parseFilters({ area: "user." }, new Date("2026-11-27T00:00:00Z")));

  it("drops meta and actor email and masks the reason", () => {
    const json = JSON.stringify([entry, row]);
    for (const secret of ["Secret Holder", "dinusha@", "meta"]) expect(json).not.toContain(secret);
    expect(row.reason).toBe("Called 077••••67 from n•••@example.com");
  });

  it("links to the subject's history within the same dates only", () => {
    expect(row.historyHref).toBe(`/audit?from=2026-10-29&to=2026-11-27&targetType=user&targetId=${TARGET}`);
  });
});
