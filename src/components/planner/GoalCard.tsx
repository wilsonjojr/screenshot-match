import { format } from "date-fns";
import { Copy, Pause, Pencil, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlanner } from "@/lib/planner/store";
import { formatGoalValue, goalPercent, goalPhase, goalProgress } from "@/lib/planner/logic";
import { GOAL_TYPE_LABEL, PERIOD_LABEL, type StudyGoal } from "@/lib/planner/types";
import { Bar, Chip, Confirm } from "./ui";
import { GoalDialog } from "./forms";

export function GoalCard({ goal, compact }: { goal: StudyGoal; compact?: boolean }) {
  const { state, actions } = usePlanner();
  const phase = goalPhase(goal, new Date());
  const progress = phase === "scheduled" ? 0 : goalProgress(state, goal);
  const pct = goalPercent(goal, progress);
  const subject = state.subjects.find((s) => s.id === goal.subjectId);

  return (
    <div className="paper-card flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-lg font-medium leading-tight">{goal.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {GOAL_TYPE_LABEL[goal.type]} · {PERIOD_LABEL[goal.period]} · {subject?.name ?? "Geral"}
          </p>
        </div>
        {phase === "paused" && <Chip tone="accent">Pausada</Chip>}
        {phase === "scheduled" && <Chip>Agendada</Chip>}
      </div>
      <div>
        <div className="mb-1.5 flex items-baseline justify-between text-sm">
          <span>
            <strong>
              {goal.type === "subject" && progress === null
                ? "Sem tarefas"
                : formatGoalValue(goal.type, progress)}
            </strong>
            <span className="text-muted-foreground">
              {" "}
              de {formatGoalValue(goal.type, goal.targetValue)}
            </span>
          </span>
          <span className="font-semibold text-primary">
            {pct === null ? "—" : `${Math.round(pct)}%`}
          </span>
        </div>
        <Bar value={pct} />
      </div>
      <p className="text-xs text-muted-foreground">
        {format(new Date(goal.startDate), "dd/MM/yyyy")} –{" "}
        {format(new Date(goal.endDate), "dd/MM/yyyy")}
        {goal.pausedBySubjectArchive &&
          phase === "paused" &&
          " · pausada porque a matéria foi arquivada"}
      </p>
      {!compact && (
        <div className="flex flex-wrap gap-1">
          <GoalDialog
            goal={goal}
            trigger={
              <Button size="sm" variant="ghost">
                <Pencil className="h-3.5 w-3.5" /> Editar
              </Button>
            }
          />
          {phase === "active" && (
            <Button size="sm" variant="ghost" onClick={() => actions.pauseGoal(goal.id)}>
              <Pause className="h-3.5 w-3.5" /> Pausar
            </Button>
          )}
          {phase === "paused" && (
            <Button size="sm" variant="ghost" onClick={() => actions.resumeGoal(goal.id)}>
              <Play className="h-3.5 w-3.5" /> Retomar
            </Button>
          )}
          {phase !== "scheduled" && (
            <GoalDialog
              goal={goal}
              duplicate
              trigger={
                <Button size="sm" variant="ghost">
                  <Copy className="h-3.5 w-3.5" /> Duplicar
                </Button>
              }
            />
          )}
          <Confirm
            trigger={
              <Button size="sm" variant="ghost" className="text-destructive">
                <Trash2 className="h-3.5 w-3.5" /> Excluir
              </Button>
            }
            title="Excluir meta?"
            text={
              phase === "scheduled"
                ? "A meta agendada será removida."
                : "A meta será encerrada e ficará registrada no histórico como excluída."
            }
            confirmLabel="Excluir"
            onConfirm={() => actions.deleteGoal(goal.id, progress, phase === "scheduled")}
          />
        </div>
      )}
    </div>
  );
}
