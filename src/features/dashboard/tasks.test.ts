import { describe, expect, it } from "vitest";
import { allowedTasks } from "./tasks";

describe("allowedTasks", () => {
  it("super admin sees all four", () => {
    expect(allowedTasks({ role: "super_admin", permissions: [] }).map((t) => t.key)).toEqual([
      "applications", "payoutAccounts", "disputes", "moderation",
    ]);
  });
  it("hides tasks outside the role's permissions", () => {
    expect(allowedTasks({ role: "moderator", permissions: ["moderation.decide"] }).map((t) => t.key)).toEqual(["moderation"]);
    expect(allowedTasks({ role: "support", permissions: [] })).toEqual([]);
  });
});
