import { describe, expect, it } from "vitest";
import { currentVersion, planKeySync } from "@/lib/crypto/keysync";

describe("planKeySync", () => {
  it("first run creates version 1 for me and my friends", () => {
    expect(planKeySync("me", ["a"], [])).toEqual({
      createVersion: 1,
      shares: [
        { recipient: "me", version: 1 },
        { recipient: "a", version: 1 },
      ],
      revoke: [],
    });
  });

  it("a new friend gets every existing version", () => {
    const rows = [
      { recipient_id: "me", key_version: 1 },
      { recipient_id: "me", key_version: 2 },
      { recipient_id: "a", key_version: 1 },
      { recipient_id: "a", key_version: 2 },
    ];
    const plan = planKeySync("me", ["a", "b"], rows);
    expect(plan.createVersion).toBeNull();
    expect(plan.revoke).toEqual([]);
    expect(plan.shares).toEqual([
      { recipient: "b", version: 1 },
      { recipient: "b", version: 2 },
    ]);
  });

  it("nothing to do when in sync", () => {
    const rows = [
      { recipient_id: "me", key_version: 1 },
      { recipient_id: "a", key_version: 1 },
    ];
    expect(planKeySync("me", ["a"], rows)).toEqual({ createVersion: null, shares: [], revoke: [] });
  });

  it("an ex-friend triggers rotation and revocation", () => {
    const rows = [
      { recipient_id: "me", key_version: 1 },
      { recipient_id: "a", key_version: 1 },
      { recipient_id: "x", key_version: 1 },
    ];
    const plan = planKeySync("me", ["a"], rows);
    expect(plan.createVersion).toBe(2);
    expect(plan.revoke).toEqual(["x"]);
    expect(plan.shares).toEqual([
      { recipient: "me", version: 2 },
      { recipient: "a", version: 2 },
    ]);
    expect(plan.shares.some((s) => s.recipient === "x")).toBe(false);
  });

  it("currentVersion is my highest own version", () => {
    expect(currentVersion([], "me")).toBeNull();
    expect(
      currentVersion(
        [
          { recipient_id: "me", key_version: 1 },
          { recipient_id: "a", key_version: 3 },
          { recipient_id: "me", key_version: 2 },
        ],
        "me",
      ),
    ).toBe(2);
  });
});
