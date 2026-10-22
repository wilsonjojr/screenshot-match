import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import type {
  AppNotification,
  GoalPeriod,
  GoalType,
  PlannerState,
  StudyGoal,
  StudySession,
} from "./types";

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 9);

const WEEK = { weekStartsOn: 1 as const };

/** Period window: starts at the chosen day, ends at end of that day / week (Mon–Sun) / calendar month. */
export function periodEnd(period: GoalPeriod, start: Date): Date {
  if (period === "daily") return endOfDay(start);
  if (period === "weekly") return endOfWeek(start, WEEK);
  return endOfMonth(start);
}

export function goalPhase(g: StudyGoal, now: Date): "scheduled" | "active" | "paused" | "closed" {
  if (g.status === "closed") return "closed";
  if (new Date(g.startDate) > now) return "scheduled";
  return g.status;
}

/** Minutes of a session that fall inside [from, to]. */
export function overlapMinutes(s: StudySession, from: Date, to: Date): number {
  const a = Math.max(new Date(s.startedAt).getTime(), from.getTime());
  const b = Math.min(new Date(s.endedAt).getTime(), to.getTime());
  return b > a ? (b - a) / 60000 : 0;
}

/** Split a session into minutes per local day (handles midnight crossing). */
export function minutesByDay(s: StudySession): Map<string, number> {
  const out = new Map<string, number>();
  let cur = new Date(s.startedAt);
  const end = new Date(s.endedAt);
  while (cur < end) {
    const dayEnd = addDays(startOfDay(cur), 1);
    const segEnd = dayEnd < end ? dayEnd : end;
    const key = format(cur, "yyyy-MM-dd");
    out.set(key, (out.get(key) ?? 0) + (segEnd.getTime() - cur.getTime()) / 60000);
    cur = segEnd;
  }
  return out;
}

export function studyMinutes(state: PlannerState, from: Date, to: Date, subjectId?: string | null) {
  return state.sessions
    .filter((s) => s.subjectId && (!subjectId || s.subjectId === subjectId))
    .reduce((sum, s) => sum + overlapMinutes(s, from, to), 0);
}

export function studiedDays(state: PlannerState, from: Date, to: Date, subjectId?: string | null) {
  const days = new Set<string>();
  for (const s of state.sessions) {
    if (!s.subjectId || (subjectId && s.subjectId !== subjectId)) continue;
    for (const [day, mins] of minutesByDay(s)) {
      const d = new Date(day + "T12:00:00");
      if (mins > 0 && d >= startOfDay(from) && d <= to) days.add(day);
    }
  }
  return days.size;
}

/** Distinct existing tasks with at least one completion inside the window. */
export function completedTasks(state: PlannerState, from: Date, to: Date, subjectId?: string | null) {
  const taskMap = new Map(state.tasks.map((t) => [t.id, t]));
  const ids = new Set<string>();
  for (const c of state.completions) {
    const t = taskMap.get(c.taskId);
    if (!t || (subjectId && t.subjectId !== subjectId)) continue;
    const at = new Date(c.completedAt);
    if (at >= from && at <= to) ids.add(c.taskId);
  }
  return ids.size;
}

export function subjectPercent(state: PlannerState, subjectId: string | null): number | null {
  const ts = state.tasks.filter((t) => t.subjectId === subjectId);
  if (!ts.length) return null;
  return (ts.filter((t) => t.status === "Concluída").length / ts.length) * 100;
}

export function goalProgress(state: PlannerState, g: StudyGoal): number | null {
  if (g.status === "closed") return g.finalProgress;
  const from = new Date(g.startDate);
  const to = new Date(g.endDate);
  switch (g.type) {
    case "time":
      return Math.round(studyMinutes(state, from, to, g.subjectId));
    case "tasks":
      return completedTasks(state, from, to, g.subjectId);
    case "days":
      return studiedDays(state, from, to, g.subjectId);
    case "subject": {
      const p = subjectPercent(state, g.subjectId);
      return p === null ? null : Math.round(p);
    }
  }
}

export function formatMinutes(m: number) {
  const h = Math.floor(m / 60);
  const mm = Math.round(m % 60);
  if (!h) return `${mm} min`;
  return mm ? `${h}h ${mm}min` : `${h}h`;
}

export function formatGoalValue(type: GoalType, v: number | null) {
  if (v === null) return "—";
  if (type === "time") return formatMinutes(v);
  if (type === "subject") return `${Math.round(v)}%`;
  if (type === "days") return `${v} ${v === 1 ? "dia" : "dias"}`;
  return `${v} ${v === 1 ? "tarefa" : "tarefas"}`;
}

export function goalPercent(g: StudyGoal, progress: number | null) {
  if (progress === null || g.targetValue <= 0) return null;
  return Math.min(100, (progress / g.targetValue) * 100);
}

export const GOAL_SUGGESTIONS: Record<GoalType, Record<GoalPeriod, number>> = {
  time: { daily: 120, weekly: 600, monthly: 2400 },
  tasks: { daily: 3, weekly: 10, monthly: 30 },
  days: { daily: 1, weekly: 5, monthly: 20 },
  subject: { daily: 100, weekly: 100, monthly: 100 },
};

/**
 * Applies automatic transitions: closes achieved/expired goals (snapshotting results)
 * and generates deduplicated notifications. Returns the same object when nothing changed.
 */
export function reconcile(state: PlannerState, now = new Date()): PlannerState {
  let changed = false;
  const notifications = [...state.notifications];
  const keys = new Set(notifications.map((n) => n.deduplicationKey));
  const push = (n: Omit<AppNotification, "id" | "createdAt" | "readAt">) => {
    if (keys.has(n.deduplicationKey)) return;
    keys.add(n.deduplicationKey);
    notifications.unshift({ ...n, id: uid(), createdAt: now.toISOString(), readAt: null });
    changed = true;
  };

  const goals = state.goals.map((g) => {
    const phase = goalPhase(g, now);
    if (phase === "closed" || phase === "scheduled") return g;
    const progress = goalProgress(state, g);
    const reached = progress !== null && progress >= g.targetValue;
    const ended = new Date(g.endDate) < now;
    if ((phase === "active" && reached) || ended) {
      changed = true;
      const reason = reached ? "achieved" : "expired";
      if (reason === "achieved")
        push({
          type: "goal_achieved",
          goalId: g.id,
          title: "Meta atingida",
          message: `Você concluiu a meta “${g.name}”. Parabéns!`,
          deduplicationKey: `achieved:${g.id}`,
        });
      return {
        ...g,
        status: "closed" as const,
        finalProgress: progress ?? 0,
        closureReason: reason as "achieved" | "expired",
        closedAt: (ended ? new Date(g.endDate) : now).toISOString(),
        updatedAt: now.toISOString(),
      };
    }
    const daysLeft = differenceInCalendarDays(new Date(g.endDate), now);
    if (daysLeft >= 0 && daysLeft <= 2) {
      push({
        type: "goal_ending",
        goalId: g.id,
        title: "Meta perto do fim",
        message:
          daysLeft === 0
            ? `Hoje é o último dia da meta “${g.name}”.`
            : `Faltam ${daysLeft} ${daysLeft === 1 ? "dia" : "dias"} para o fim da meta “${g.name}”.`,
        deduplicationKey: `ending:${g.id}:${format(now, "yyyy-MM-dd")}`,
      });
    }
    return g;
  });

  return changed ? { ...state, goals, notifications } : state;
}

// ---------- Analytics ----------
export type Grouping = "day" | "week" | "month";

export interface Bucket {
  label: string;
  from: Date;
  to: Date;
}

export function buildBuckets(grouping: Grouping, from: Date, to: Date): Bucket[] {
  const out: Bucket[] = [];
  let cur =
    grouping === "day" ? startOfDay(from) : grouping === "week" ? startOfWeek(from, WEEK) : startOfMonth(from);
  while (cur <= to && out.length < 400) {
    const end =
      grouping === "day" ? endOfDay(cur) : grouping === "week" ? endOfWeek(cur, WEEK) : endOfMonth(cur);
    const label =
      grouping === "day"
        ? format(cur, "dd/MM", { locale: ptBR })
        : grouping === "week"
          ? `${format(cur, "dd/MM")}–${format(end, "dd/MM")}`
          : format(cur, "MMM/yy", { locale: ptBR });
    out.push({ label, from: cur, to: end });
    cur = grouping === "day" ? addDays(cur, 1) : grouping === "week" ? addWeeks(cur, 1) : addMonths(cur, 1);
  }
  return out;
}

export function lastSevenRange(grouping: Grouping, now = new Date()) {
  if (grouping === "day") return { from: startOfDay(addDays(now, -6)), to: endOfDay(now) };
  if (grouping === "week") return { from: startOfWeek(addWeeks(now, -6), WEEK), to: endOfWeek(now, WEEK) };
  return { from: startOfMonth(addMonths(now, -6)), to: endOfMonth(now) };
}

/** Success rate among naturally closed goals (achieved / achieved+expired) closed in window. */
export function successRate(state: PlannerState, from: Date, to: Date): number | null {
  const closed = state.goals.filter(
    (g) =>
      g.status === "closed" &&
      (g.closureReason === "achieved" || g.closureReason === "expired") &&
      g.closedAt &&
      new Date(g.closedAt) >= from &&
      new Date(g.closedAt) <= to,
  );
  if (!closed.length) return null;
  return (closed.filter((g) => g.closureReason === "achieved").length / closed.length) * 100;
}

export interface Metrics {
  hours: number;
  tasks: number;
  days: number;
  success: number | null;
}

export function metricsFor(state: PlannerState, from: Date, to: Date): Metrics {
  return {
    hours: Math.round((studyMinutes(state, from, to) / 60) * 10) / 10,
    tasks: completedTasks(state, from, to),
    days: studiedDays(state, from, to),
    success: successRate(state, from, to),
  };
}

export function percentChange(a: number | null, b: number | null): number | null {
  if (a === null || b === null || a === 0) return null;
  return ((b - a) / a) * 100;
}

/** Consecutive studied days ending today or yesterday. */
export function studyStreak(state: PlannerState, now = new Date()) {
  const days = new Set<string>();
  for (const s of state.sessions) if (s.subjectId) for (const d of minutesByDay(s).keys()) days.add(d);
  let cur = startOfDay(now);
  if (!days.has(format(cur, "yyyy-MM-dd"))) cur = addDays(cur, -1);
  let n = 0;
  while (days.has(format(cur, "yyyy-MM-dd"))) {
    n++;
    cur = addDays(cur, -1);
  }
  return n;
}
