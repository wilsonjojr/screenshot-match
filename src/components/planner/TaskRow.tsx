import { format, isBefore, startOfDay } from "date-fns";
import { Check, ExternalLink, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlanner } from "@/lib/planner/store";
import { TASK_STATUSES, type Task } from "@/lib/planner/types";
import { Chip, Confirm, NativeSelect, SubjectIcon } from "./ui";
import { TaskDialog, fromDateInput } from "./forms";

export function TaskRow({ task }: { task: Task }) {
  const { state, actions } = usePlanner();
  const subject = state.subjects.find((s) => s.id === task.subjectId);
  const done = task.status === "Concluída";
  const overdue = !done && task.dueDate && isBefore(fromDateInput(task.dueDate), startOfDay(new Date()));
  const completions = state.completions.filter((c) => c.taskId === task.id);

  return (
    <div className="paper-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <SubjectIcon subject={subject} />
      <div className="min-w-0 flex-1">
        <p className={done ? "font-medium text-muted-foreground line-through" : "font-medium"}>{task.title}</p>
        <p className="truncate text-sm text-muted-foreground">{task.description}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <Chip>{subject?.name ?? "—"}</Chip>
          <Chip tone={task.priority === "Alta" ? "destructive" : task.priority === "Média" ? "accent" : "muted"}>{task.priority}</Chip>
          <Chip>{task.category}</Chip>
          <Chip>{task.estimatedTime} min</Chip>
          {task.dueDate && <Chip tone={overdue ? "destructive" : "muted"}>{overdue ? "Atrasada · " : "Prazo "}{format(fromDateInput(task.dueDate), "dd/MM")}</Chip>}
          {completions.length > 0 && (
            <span className="text-xs text-muted-foreground" title={completions.map((c) => format(new Date(c.completedAt), "dd/MM/yyyy HH:mm")).join("\n")}>
              Concluída {completions.length}× · última {format(new Date(completions[completions.length - 1].completedAt), "dd/MM")}
            </span>
          )}
          {task.links.map((l, i) => (
            <a key={i} href={l} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-xs text-primary underline">
              <ExternalLink className="h-3 w-3" /> link {i + 1}
            </a>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <NativeSelect aria-label="Status" value={task.status} onChange={(e) => actions.setTaskStatus(task.id, e.target.value as Task["status"])} className="h-8">
          {TASK_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </NativeSelect>
        {done ? (
          <Button size="icon" variant="ghost" aria-label="Reabrir" onClick={() => actions.setTaskStatus(task.id, "Pendente")}><RotateCcw className="h-4 w-4" /></Button>
        ) : (
          <Button size="icon" variant="ghost" aria-label="Concluir" onClick={() => actions.setTaskStatus(task.id, "Concluída")}><Check className="h-4 w-4" /></Button>
        )}
        <TaskDialog task={task} trigger={<Button size="icon" variant="ghost" aria-label="Editar"><Pencil className="h-4 w-4" /></Button>} />
        <Confirm
          trigger={<Button size="icon" variant="ghost" aria-label="Excluir" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>}
          title="Excluir tarefa?"
          text="O progresso das metas ativas será recalculado. Metas encerradas não mudam."
          confirmLabel="Excluir"
          onConfirm={() => actions.deleteTask(task.id)}
        />
      </div>
    </div>
  );
}
