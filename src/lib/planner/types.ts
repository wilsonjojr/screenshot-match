export type TaskStatus = "Pendente" | "Em andamento" | "Concluída";
export type Priority = "Baixa" | "Média" | "Alta";
export type PendingStatus = "Aberta" | "Em andamento" | "Resolvida";
export type GoalType = "time" | "tasks" | "days" | "subject";
export type GoalPeriod = "daily" | "weekly" | "monthly";
export type GoalStatus = "active" | "paused" | "closed";
export type ClosureReason = "achieved" | "expired" | "deleted";

export const TASK_CATEGORIES = [
  "Leitura",
  "Exercícios",
  "Aula",
  "Revisão",
  "Projeto",
  "Prova",
] as const;
export const PRIORITIES: Priority[] = ["Baixa", "Média", "Alta"];
export const TASK_STATUSES: TaskStatus[] = ["Pendente", "Em andamento", "Concluída"];
export const PENDING_STATUSES: PendingStatus[] = ["Aberta", "Em andamento", "Resolvida"];

export interface Subject {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  subjectId: string;
  title: string;
  description: string;
  dueDate: string | null;
  status: TaskStatus;
  priority: Priority;
  estimatedTime: number;
  category: string;
  links: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskCompletion {
  id: string;
  taskId: string;
  completedAt: string;
}

export interface PendingItem {
  id: string;
  title: string;
  description: string;
  status: PendingStatus;
  subjectId: string | null;
  priority: Priority;
  createdAt: string;
  updatedAt: string;
}

export interface StudyGoal {
  id: string;
  name: string;
  type: GoalType;
  period: GoalPeriod;
  targetValue: number; // minutes for time, count for tasks/days, percent for subject
  subjectId: string | null;
  startDate: string; // ISO
  endDate: string; // ISO
  status: GoalStatus;
  pausedBySubjectArchive?: boolean;
  createdAt: string;
  updatedAt: string;
  finalProgress: number | null; // snapshot at closure
  closureReason: ClosureReason | null;
  closedAt: string | null;
}

export interface StudySession {
  id: string;
  subjectId: string | null;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  source: "timer" | "manual";
  createdAt: string;
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  type: "goal_achieved" | "goal_ending";
  goalId: string | null;
  title: string;
  message: string;
  createdAt: string;
  readAt: string | null;
  deduplicationKey: string;
}

export interface Settings {
  activeTimer: { subjectId: string | null; startedAt: string } | null;
  longSessionMinutes: number;
}

export interface PlannerState {
  subjects: Subject[];
  tasks: Task[];
  completions: TaskCompletion[];
  pending: PendingItem[];
  goals: StudyGoal[];
  sessions: StudySession[];
  notifications: AppNotification[];
  settings: Settings;
}

export const GOAL_TYPE_LABEL: Record<GoalType, string> = {
  time: "Tempo de estudo",
  tasks: "Tarefas concluídas",
  days: "Dias estudados",
  subject: "Progresso por matéria",
};
export const PERIOD_LABEL: Record<GoalPeriod, string> = {
  daily: "Diária",
  weekly: "Semanal",
  monthly: "Mensal",
};
export const CLOSURE_LABEL: Record<ClosureReason, string> = {
  achieved: "Meta atingida",
  expired: "Período encerrado",
  deleted: "Excluída pelo aluno",
};
