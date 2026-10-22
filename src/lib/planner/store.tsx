import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { periodEnd, reconcile, uid } from "./logic";
import type {
  GoalPeriod,
  GoalType,
  PendingItem,
  PlannerState,
  StudyGoal,
  StudySession,
  Subject,
  Task,
} from "./types";

const VERSION = 1;
const KEYS = {
  subjects: "study_planner_subjects",
  tasks: "study_planner_tasks",
  completions: "study_planner_task_completions",
  pending: "study_planner_pending_items",
  goals: "study_planner_goals",
  sessions: "study_planner_sessions",
  notifications: "study_planner_notifications",
  settings: "study_planner_settings",
} as const;

export const emptyState = (): PlannerState => ({
  subjects: [],
  tasks: [],
  completions: [],
  pending: [],
  goals: [],
  sessions: [],
  notifications: [],
  settings: { activeTimer: null, longSessionMinutes: 360 },
});

function load(): PlannerState {
  const base = emptyState();
  const out: PlannerState = { ...base };
  for (const [k, key] of Object.entries(KEYS) as [keyof PlannerState, string][]) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const data = parsed?.v === VERSION ? parsed.data : null;
      if (k === "settings") {
        if (data && typeof data === "object") out.settings = { ...base.settings, ...data };
      } else if (Array.isArray(data)) {
        (out as unknown as Record<string, unknown>)[k] = data.filter((x) => x && typeof x.id === "string");
      }
    } catch {
      console.warn("Dados corrompidos ignorados em", key);
    }
  }
  return out;
}

function save(prev: PlannerState | null, next: PlannerState) {
  for (const [k, key] of Object.entries(KEYS) as [keyof PlannerState, string][]) {
    if (prev && prev[k] === next[k]) continue;
    try {
      localStorage.setItem(key, JSON.stringify({ v: VERSION, data: next[k] }));
    } catch {
      toast.error("Não foi possível salvar: o armazenamento do navegador está cheio.");
    }
  }
}

const SUBJECT_COLORS = ["teal", "amber", "coral", "sky", "olive", "plum", "rose", "slate"];
const SUBJECT_ICONS = ["BookOpen", "Calculator", "FlaskConical", "Globe", "Languages", "Palette", "Music", "Code", "Landmark", "Atom"];
export { SUBJECT_COLORS, SUBJECT_ICONS };

const now = () => new Date().toISOString();

export type GoalInput = {
  name: string;
  type: GoalType;
  period: GoalPeriod;
  targetValue: number;
  subjectId: string | null;
  startDate: Date;
};

function makeActions(set: (fn: (s: PlannerState) => PlannerState) => void, get: () => PlannerState) {
  return {
    addSubject(d: { name: string; description: string; color?: string; icon?: string }) {
      const n = get().subjects.length;
      set((s) => ({
        ...s,
        subjects: [
          ...s.subjects,
          {
            id: uid(),
            name: d.name,
            description: d.description,
            color: d.color || SUBJECT_COLORS[n % SUBJECT_COLORS.length],
            icon: d.icon || SUBJECT_ICONS[n % SUBJECT_ICONS.length],
            archived: false,
            createdAt: now(),
            updatedAt: now(),
          },
        ],
      }));
    },
    updateSubject(id: string, d: Partial<Subject>) {
      set((s) => ({ ...s, subjects: s.subjects.map((x) => (x.id === id ? { ...x, ...d, updatedAt: now() } : x)) }));
    },
    archiveSubject(id: string) {
      set((s) => ({
        ...s,
        subjects: s.subjects.map((x) => (x.id === id ? { ...x, archived: true, updatedAt: now() } : x)),
        goals: s.goals.map((g) =>
          g.subjectId === id && g.status === "active"
            ? { ...g, status: "paused", pausedBySubjectArchive: true, updatedAt: now() }
            : g,
        ),
      }));
    },
    restoreSubject(id: string) {
      set((s) => ({ ...s, subjects: s.subjects.map((x) => (x.id === id ? { ...x, archived: false, updatedAt: now() } : x)) }));
    },

    saveTask(d: Omit<Task, "id" | "createdAt" | "updatedAt" | "status"> & { id?: string }) {
      set((s) => {
        if (d.id) return { ...s, tasks: s.tasks.map((t) => (t.id === d.id ? { ...t, ...d, id: t.id, updatedAt: now() } : t)) };
        return { ...s, tasks: [...s.tasks, { ...d, id: uid(), status: "Pendente", createdAt: now(), updatedAt: now() }] };
      });
    },
    setTaskStatus(id: string, status: Task["status"]) {
      set((s) => {
        const t = s.tasks.find((x) => x.id === id);
        if (!t || t.status === status) return s;
        const completions =
          status === "Concluída" ? [...s.completions, { id: uid(), taskId: id, completedAt: now() }] : s.completions;
        return { ...s, completions, tasks: s.tasks.map((x) => (x.id === id ? { ...x, status, updatedAt: now() } : x)) };
      });
    },
    deleteTask(id: string) {
      set((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }));
    },

    savePending(d: Omit<PendingItem, "id" | "createdAt" | "updatedAt"> & { id?: string }) {
      set((s) => {
        if (d.id) return { ...s, pending: s.pending.map((p) => (p.id === d.id ? { ...p, ...d, id: p.id, updatedAt: now() } : p)) };
        return { ...s, pending: [{ ...d, id: uid(), createdAt: now(), updatedAt: now() }, ...s.pending] };
      });
    },
    deletePending(id: string) {
      set((s) => ({ ...s, pending: s.pending.filter((p) => p.id !== id) }));
    },

    saveGoal(d: GoalInput, id?: string) {
      const start = d.startDate;
      const fields = {
        name: d.name,
        type: d.type,
        period: d.period,
        targetValue: d.targetValue,
        subjectId: d.subjectId,
        startDate: start.toISOString(),
        endDate: periodEnd(d.period, start).toISOString(),
      };
      set((s) => {
        if (id) return { ...s, goals: s.goals.map((g) => (g.id === id ? { ...g, ...fields, updatedAt: now() } : g)) };
        const g: StudyGoal = {
          ...fields,
          id: uid(),
          status: "active",
          createdAt: now(),
          updatedAt: now(),
          finalProgress: null,
          closureReason: null,
          closedAt: null,
        };
        return { ...s, goals: [g, ...s.goals] };
      });
    },
    pauseGoal(id: string) {
      set((s) => ({ ...s, goals: s.goals.map((g) => (g.id === id && g.status === "active" ? { ...g, status: "paused", updatedAt: now() } : g)) }));
    },
    resumeGoal(id: string) {
      set((s) => ({
        ...s,
        goals: s.goals.map((g) =>
          g.id === id && g.status === "paused" ? { ...g, status: "active", pausedBySubjectArchive: false, updatedAt: now() } : g,
        ),
      }));
    },
    deleteGoal(id: string, progress: number | null, scheduled: boolean) {
      set((s) => {
        if (scheduled) return { ...s, goals: s.goals.filter((g) => g.id !== id) };
        return {
          ...s,
          goals: s.goals.map((g) =>
            g.id === id
              ? { ...g, status: "closed", closureReason: "deleted", finalProgress: progress ?? 0, closedAt: now(), updatedAt: now() }
              : g,
          ),
        };
      });
    },

    startTimer(subjectId: string | null) {
      set((s) => ({ ...s, settings: { ...s.settings, activeTimer: { subjectId, startedAt: now() } } }));
    },
    cancelTimer() {
      set((s) => ({ ...s, settings: { ...s.settings, activeTimer: null } }));
    },
    saveSession(d: { subjectId: string | null; startedAt: Date; endedAt: Date; source: StudySession["source"] }, id?: string) {
      const durationMinutes = Math.round((d.endedAt.getTime() - d.startedAt.getTime()) / 60000);
      const fields = {
        subjectId: d.subjectId,
        startedAt: d.startedAt.toISOString(),
        endedAt: d.endedAt.toISOString(),
        durationMinutes,
      };
      set((s) => {
        const settings = d.source === "timer" && !id ? { ...s.settings, activeTimer: null } : s.settings;
        if (id) return { ...s, settings, sessions: s.sessions.map((x) => (x.id === id ? { ...x, ...fields, updatedAt: now() } : x)) };
        return {
          ...s,
          settings,
          sessions: [{ ...fields, id: uid(), source: d.source, createdAt: now(), updatedAt: now() }, ...s.sessions],
        };
      });
    },
    deleteSession(id: string) {
      set((s) => ({ ...s, sessions: s.sessions.filter((x) => x.id !== id) }));
    },

    markRead(id: string) {
      set((s) => ({ ...s, notifications: s.notifications.map((n) => (n.id === id && !n.readAt ? { ...n, readAt: now() } : n)) }));
    },
    markAllRead() {
      set((s) => ({ ...s, notifications: s.notifications.map((n) => (n.readAt ? n : { ...n, readAt: now() })) }));
    },
    updateSettings(d: Partial<PlannerState["settings"]>) {
      set((s) => ({ ...s, settings: { ...s.settings, ...d } }));
    },
  };
}

export type Actions = ReturnType<typeof makeActions>;

const Ctx = createContext<{ state: PlannerState; ready: boolean; actions: Actions } | null>(null);

export function PlannerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PlannerState>(emptyState);
  const [ready, setReady] = useState(false);
  const ref = useRef(state);
  ref.current = state;
  const saved = useRef<PlannerState | null>(null);

  useEffect(() => {
    const loaded = reconcile(load());
    setState(loaded);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    save(saved.current, state);
    saved.current = state;
  }, [state, ready]);

  useEffect(() => {
    if (!ready) return;
    const t = setInterval(() => setState((s) => reconcile(s)), 60_000);
    return () => clearInterval(t);
  }, [ready]);

  const set = useCallback((fn: (s: PlannerState) => PlannerState) => setState((s) => reconcile(fn(s))), []);
  const actions = useMemo(() => makeActions(set, () => ref.current), [set]);

  return <Ctx.Provider value={{ state, ready, actions }}>{children}</Ctx.Provider>;
}

export function usePlanner() {
  const c = useContext(Ctx);
  if (!c) throw new Error("usePlanner fora do provider");
  return c;
}
