import { describe, expect, it } from "vitest";
import {
  addDays,
  computeStreak,
  dayLabel,
  isMilestone,
  localDate,
  rankLeaderboard,
  weeklyScore,
  weekStart,
} from "@/lib/streaks";

const T = "2026-11-10"; // a Tuesday

describe("computeStreak", () => {
  it("is 0 with no entries", () => {
    expect(computeStreak([], T)).toEqual({ current: 0, longest: 0, today: false, atRisk: false });
  });

  it("counts consecutive days ending today", () => {
    expect(computeStreak(["2026-11-08", "2026-11-09", T], T).current).toBe(3);
  });

  it("not yet today: the run ending yesterday is still alive", () => {
    const s = computeStreak(["2026-11-08", "2026-11-09"], T);
    expect(s).toMatchObject({ current: 2, today: false, atRisk: true });
  });

  it("a gap resets the current streak but keeps the longest", () => {
    const s = computeStreak(["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-08"], T);
    expect(s.current).toBe(0);
    expect(s.longest).toBe(4);
  });

  it("several entries on one day count once", () => {
    expect(computeStreak([T, T, T, "2026-11-09"], T).current).toBe(2);
  });

  it("deleting today's last entry makes today uncounted again", () => {
    const before = computeStreak(["2026-11-09", T], T);
    const after = computeStreak(["2026-11-09"], T);
    expect(before).toMatchObject({ current: 2, today: true });
    expect(after).toMatchObject({ current: 1, today: false, atRisk: true });
  });

  it("crosses month and year boundaries", () => {
    expect(computeStreak(["2025-12-30", "2025-12-31", "2026-01-01"], "2026-01-01").current).toBe(3);
    expect(computeStreak(["2024-02-28", "2024-02-29", "2024-03-01"], "2024-03-01").current).toBe(3);
  });

  it("ignores future dates", () => {
    expect(computeStreak([addDays(T, 1)], T).current).toBe(0);
  });
});

describe("timezones", () => {
  it("the same instant is a different local day in different zones", () => {
    const instant = new Date("2026-11-10T03:30:00Z");
    expect(localDate("UTC", instant)).toBe("2026-11-10");
    expect(localDate("America/Los_Angeles", instant)).toBe("2026-11-09");
    expect(localDate("Asia/Tokyo", instant)).toBe("2026-11-10");
    expect(localDate("Pacific/Kiritimati", new Date("2026-11-10T11:00:00Z"))).toBe("2026-11-11");
  });
});

describe("milestones", () => {
  it("3, 7, 14, 30, 50, 100, 365, then every 100", () => {
    const hits = Array.from({ length: 700 }, (_, i) => i + 1).filter(isMilestone);
    expect(hits).toEqual([3, 7, 14, 30, 50, 100, 365, 400, 500, 600, 700]);
  });
});

describe("weekly leaderboard", () => {
  it("weeks start on Monday", () => {
    expect(weekStart("2026-11-10")).toBe("2026-11-09");
    expect(weekStart("2026-11-09")).toBe("2026-11-09");
    expect(weekStart("2026-11-15")).toBe("2026-11-09"); // Sunday
  });

  it("counts at most 3 entries per day, this week only", () => {
    const dates = ["2026-11-08", "2026-11-09", "2026-11-09", "2026-11-09", "2026-11-09", "2026-11-09", T];
    expect(weeklyScore(dates, T)).toBe(4); // Sunday 8th is last week; 5 on Monday capped to 3; +1 today
  });

  it("ties break by streak, then display name", () => {
    const ranked = rankLeaderboard([
      { id: "1", display_name: "zoe", score: 5, streak: 2 },
      { id: "2", display_name: "Amy", score: 5, streak: 2 },
      { id: "3", display_name: "bob", score: 5, streak: 9 },
      { id: "4", display_name: "cat", score: 7, streak: 0 },
    ]);
    expect(ranked.map((r) => [r.id, r.rank])).toEqual([
      ["4", 1],
      ["3", 2],
      ["2", 3],
      ["1", 4],
    ]);
  });
});

describe("dayLabel", () => {
  it("names today and yesterday", () => {
    expect(dayLabel(T, T)).toBe("Today");
    expect(dayLabel("2026-11-09", T)).toBe("Yesterday");
    expect(dayLabel("2026-11-08", T)).toBe("Sun 8 Nov");
  });
});
