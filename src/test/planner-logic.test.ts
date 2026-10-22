import { describe, expect, it } from "vitest";
import { emptyState } from "@/lib/planner/store";
import { minutesByDay, percentChange, periodEnd, reconcile, studiedDays, successRate } from "@/lib/planner/logic";
import type { PlannerState, StudyGoal, StudySession } from "@/lib/planner/types";

const session = (start: Date, end: Date, subjectId: string | null = "s1"): StudySession => ({
  id: Math.random().toString(), subjectId, startedAt: start.toISOString(), endedAt: end.toISOString(),
  durationMinutes: (end.getTime() - start.getTime()) / 60000, source: "manual", createdAt: "", updatedAt: "",
});
const goal = (p: Partial<StudyGoal>): StudyGoal => ({
  id: "g", name: "G", type: "time", period: "weekly", targetValue: 60, subjectId: null,
  startDate: new Date(2026, 0, 5).toISOString(), endDate: periodEnd("weekly", new Date(2026, 0, 5)).toISOString(),
  status: "active", createdAt: "", updatedAt: "", finalProgress: null, closureReason: null, closedAt: null, ...p,
});

describe("planner rules", () => {
  it("splits a 23:30–00:30 session into 30 + 30 minutes", () => {
    const m = minutesByDay(session(new Date(2026, 0, 5, 23, 30), new Date(2026, 0, 6, 0, 30)));
    expect([...m.values()]).toEqual([30, 30]);
  });

  it("counts several sessions on one day as one studied day, ignoring sessions without subject", () => {
    const s: PlannerState = { ...emptyState(), sessions: [
      session(new Date(2026, 0, 5, 8), new Date(2026, 0, 5, 9)),
      session(new Date(2026, 0, 5, 14), new Date(2026, 0, 5, 15)),
      session(new Date(2026, 0, 6, 8), new Date(2026, 0, 6, 9), null),
    ] };
    expect(studiedDays(s, new Date(2026, 0, 1), new Date(2026, 0, 31))).toBe(1);
  });

  it("weekly period ends on Sunday", () => {
    expect(periodEnd("weekly", new Date(2026, 0, 7)).getDay()).toBe(0);
  });

  it("closes a goal as achieved when the target is reached", () => {
    const s: PlannerState = { ...emptyState(), goals: [goal({})], sessions: [session(new Date(2026, 0, 6, 8), new Date(2026, 0, 6, 9, 30))] };
    const r = reconcile(s, new Date(2026, 0, 6, 12));
    expect(r.goals[0].closureReason).toBe("achieved");
    expect(r.goals[0].finalProgress).toBe(90);
  });

  it("closes a paused goal as expired when its period ends", () => {
    const s: PlannerState = { ...emptyState(), goals: [goal({ status: "paused" })] };
    expect(reconcile(s, new Date(2026, 0, 20)).goals[0].closureReason).toBe("expired");
  });

  it("success rate ignores deleted goals", () => {
    const closed = (r: StudyGoal["closureReason"]) => goal({ id: r!, status: "closed", closureReason: r, closedAt: new Date(2026, 0, 10).toISOString() });
    const s: PlannerState = { ...emptyState(), goals: [closed("achieved"), closed("expired"), closed("deleted")] };
    expect(successRate(s, new Date(2026, 0, 1), new Date(2026, 0, 31))).toBe(50);
  });

  it("percent change from zero is not calculable", () => {
    expect(percentChange(0, 5)).toBeNull();
  });
});
