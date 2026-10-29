import { useEffect, useState, type ReactNode } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SUBJECT_COLORS, SUBJECT_ICONS, usePlanner, type GoalInput } from "@/lib/planner/store";
import { GOAL_SUGGESTIONS, formatGoalValue } from "@/lib/planner/logic";
import {
  GOAL_TYPE_LABEL,
  PENDING_STATUSES,
  PERIOD_LABEL,
  PRIORITIES,
  TASK_CATEGORIES,
  type GoalPeriod,
  type GoalType,
  type PendingItem,
  type StudyGoal,
  type StudySession,
  type Subject,
  type Task,
} from "@/lib/planner/types";
import { Field, NativeSelect, SubjectIcon, subjectColor } from "./ui";
import { LongSessionDialog } from "./LongSessionDialog";
import { cn } from "@/lib/utils";

export const toDateInput = (d: Date) => format(d, "yyyy-MM-dd");
export const fromDateInput = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

function FormDialog({
  trigger,
  title,
  open,
  setOpen,
  children,
  onSubmit,
}: {
  trigger: ReactNode;
  title: string;
  open: boolean;
  setOpen: (o: boolean) => void;
  children: ReactNode;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          {children}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Subject ----------
export function SubjectDialog({ trigger, subject }: { trigger: ReactNode; subject?: Subject }) {
  const { actions } = usePlanner();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", description: "", color: "", icon: "" });
  const [err, setErr] = useState("");
  useEffect(() => {
    if (open) {
      setF({
        name: subject?.name ?? "",
        description: subject?.description ?? "",
        color: subject?.color ?? "",
        icon: subject?.icon ?? "",
      });
      setErr("");
    }
  }, [open, subject]);
  return (
    <FormDialog
      trigger={trigger}
      title={subject ? "Editar matéria" : "Nova matéria"}
      open={open}
      setOpen={setOpen}
      onSubmit={() => {
        if (!f.name.trim()) return setErr("Informe o nome da matéria.");
        if (subject)
          actions.updateSubject(subject.id, {
            ...f,
            color: f.color || subject.color,
            icon: f.icon || subject.icon,
          });
        else actions.addSubject(f);
        toast.success(subject ? "Matéria atualizada." : "Matéria criada.");
        setOpen(false);
      }}
    >
      <Field label="Nome" htmlFor="s-name" error={err}>
        <Input id="s-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      </Field>
      <Field label="Descrição" htmlFor="s-desc">
        <Textarea
          id="s-desc"
          value={f.description}
          onChange={(e) => setF({ ...f, description: e.target.value })}
        />
      </Field>
      <div>
        <p className="mb-1.5 text-sm font-medium">
          Cor{" "}
          {!subject && (
            <span className="font-normal text-muted-foreground">(automática se não escolher)</span>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          {SUBJECT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Cor ${c}`}
              onClick={() => setF({ ...f, color: c })}
              className={cn(
                "h-7 w-7 rounded-full ring-offset-2 ring-offset-card",
                f.color === c && "ring-2 ring-foreground",
              )}
              style={{ background: subjectColor(c) }}
            />
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-sm font-medium">Ícone</p>
        <div className="flex flex-wrap gap-2">
          {SUBJECT_ICONS.map((i) => (
            <button
              key={i}
              type="button"
              aria-label={`Ícone ${i}`}
              onClick={() => setF({ ...f, icon: i })}
              className={cn("rounded-lg", f.icon === i && "ring-2 ring-foreground")}
            >
              <SubjectIcon
                subject={{ icon: i, color: f.color || subject?.color || "slate" } as Subject}
              />
            </button>
          ))}
        </div>
      </div>
    </FormDialog>
  );
}

// ---------- Task ----------
export function TaskDialog({
  trigger,
  task,
  defaultSubjectId,
}: {
  trigger: ReactNode;
  task?: Task;
  defaultSubjectId?: string;
}) {
  const { state, actions } = usePlanner();
  const subjects = state.subjects.filter((s) => !s.archived || s.id === task?.subjectId);
  const [open, setOpen] = useState(false);
  const blank = {
    subjectId: "",
    title: "",
    description: "",
    dueDate: "",
    priority: "Média",
    estimatedTime: "30",
    category: TASK_CATEGORIES[0] as string,
    links: [] as string[],
  };
  const [f, setF] = useState(blank);
  const [link, setLink] = useState("");
  const [errs, setErrs] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!open) return;
    setErrs({});
    setLink("");
    setF(
      task
        ? {
            ...task,
            dueDate: task.dueDate ?? "",
            estimatedTime: String(task.estimatedTime),
            links: [...task.links],
          }
        : { ...blank, subjectId: defaultSubjectId ?? subjects[0]?.id ?? "" },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const addLink = () => {
    const l = link.trim();
    if (!l) return;
    try {
      new URL(l);
    } catch {
      return setErrs({ ...errs, link: "Link inválido (use https://...)" });
    }
    setF({ ...f, links: [...f.links, l] });
    setLink("");
    setErrs({ ...errs, link: "" });
  };
  return (
    <FormDialog
      trigger={trigger}
      title={task ? "Editar tarefa" : "Nova tarefa"}
      open={open}
      setOpen={setOpen}
      onSubmit={() => {
        const e: Record<string, string> = {};
        if (!f.subjectId) e.subjectId = "Escolha uma matéria.";
        if (!f.title.trim()) e.title = "Informe o título.";
        if (!f.description.trim()) e.description = "Informe a descrição.";
        const est = Number(f.estimatedTime);
        if (!(est >= 0)) e.estimatedTime = "Informe minutos válidos.";
        setErrs(e);
        if (Object.keys(e).length) return;
        actions.saveTask({
          id: task?.id,
          subjectId: f.subjectId,
          title: f.title.trim(),
          description: f.description.trim(),
          dueDate: f.dueDate || null,
          priority: f.priority as Task["priority"],
          estimatedTime: est,
          category: f.category,
          links: f.links,
        });
        toast.success(task ? "Tarefa atualizada." : "Tarefa criada.");
        setOpen(false);
      }}
    >
      {!subjects.length && (
        <p className="text-sm text-destructive">Crie uma matéria antes de cadastrar tarefas.</p>
      )}
      <Field label="Matéria" htmlFor="t-sub" error={errs.subjectId}>
        <NativeSelect
          id="t-sub"
          value={f.subjectId}
          onChange={(e) => setF({ ...f, subjectId: e.target.value })}
        >
          <option value="">Selecione…</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Título" htmlFor="t-title" error={errs.title}>
        <Input
          id="t-title"
          value={f.title}
          onChange={(e) => setF({ ...f, title: e.target.value })}
        />
      </Field>
      <Field label="Descrição" htmlFor="t-desc" error={errs.description}>
        <Textarea
          id="t-desc"
          value={f.description}
          onChange={(e) => setF({ ...f, description: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Prazo (opcional)" htmlFor="t-due">
          <Input
            id="t-due"
            type="date"
            value={f.dueDate}
            onChange={(e) => setF({ ...f, dueDate: e.target.value })}
          />
        </Field>
        <Field label="Tempo estimado (min)" htmlFor="t-est" error={errs.estimatedTime}>
          <Input
            id="t-est"
            type="number"
            min={0}
            value={f.estimatedTime}
            onChange={(e) => setF({ ...f, estimatedTime: e.target.value })}
          />
        </Field>
        <Field label="Prioridade" htmlFor="t-pri">
          <NativeSelect
            id="t-pri"
            value={f.priority}
            onChange={(e) => setF({ ...f, priority: e.target.value })}
          >
            {PRIORITIES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Categoria" htmlFor="t-cat">
          <NativeSelect
            id="t-cat"
            value={f.category}
            onChange={(e) => setF({ ...f, category: e.target.value })}
          >
            {TASK_CATEGORIES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Field label="Links" htmlFor="t-link" error={errs.link}>
        <div className="flex gap-2">
          <Input
            id="t-link"
            placeholder="https://"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addLink();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={addLink}
            aria-label="Adicionar link"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {f.links.map((l, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded bg-muted px-2 py-1 text-xs"
          >
            <span className="truncate">{l}</span>
            <button
              type="button"
              aria-label="Remover link"
              onClick={() => setF({ ...f, links: f.links.filter((_, j) => j !== i) })}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </Field>
    </FormDialog>
  );
}

// ---------- Pending ----------
export function PendingDialog({ trigger, item }: { trigger: ReactNode; item?: PendingItem }) {
  const { state, actions } = usePlanner();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    title: "",
    description: "",
    status: "Aberta",
    subjectId: "",
    priority: "Média",
  });
  const [err, setErr] = useState("");
  useEffect(() => {
    if (open) {
      setErr("");
      setF(
        item
          ? { ...item, subjectId: item.subjectId ?? "" }
          : { title: "", description: "", status: "Aberta", subjectId: "", priority: "Média" },
      );
    }
  }, [open, item]);
  return (
    <FormDialog
      trigger={trigger}
      title={item ? "Editar pendência" : "Nova pendência"}
      open={open}
      setOpen={setOpen}
      onSubmit={() => {
        if (!f.title.trim()) return setErr("Informe o título.");
        actions.savePending({
          id: item?.id,
          title: f.title.trim(),
          description: f.description,
          status: f.status as PendingItem["status"],
          subjectId: f.subjectId || null,
          priority: f.priority as PendingItem["priority"],
        });
        toast.success("Pendência salva.");
        setOpen(false);
      }}
    >
      <Field label="Título" htmlFor="p-title" error={err}>
        <Input
          id="p-title"
          value={f.title}
          onChange={(e) => setF({ ...f, title: e.target.value })}
        />
      </Field>
      <Field label="Descrição" htmlFor="p-desc">
        <Textarea
          id="p-desc"
          value={f.description}
          onChange={(e) => setF({ ...f, description: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Status" htmlFor="p-st">
          <NativeSelect
            id="p-st"
            value={f.status}
            onChange={(e) => setF({ ...f, status: e.target.value })}
          >
            {PENDING_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Prioridade" htmlFor="p-pr">
          <NativeSelect
            id="p-pr"
            value={f.priority}
            onChange={(e) => setF({ ...f, priority: e.target.value })}
          >
            {PRIORITIES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Matéria" htmlFor="p-sub">
          <NativeSelect
            id="p-sub"
            value={f.subjectId}
            onChange={(e) => setF({ ...f, subjectId: e.target.value })}
          >
            <option value="">Nenhuma</option>
            {state.subjects
              .filter((s) => !s.archived)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </NativeSelect>
        </Field>
      </div>
    </FormDialog>
  );
}

// ---------- Goal ----------
export function GoalDialog({
  trigger,
  goal,
  duplicate,
}: {
  trigger: ReactNode;
  goal?: StudyGoal;
  duplicate?: boolean;
}) {
  const { state, actions } = usePlanner();
  const [open, setOpen] = useState(false);
  const subjects = state.subjects.filter((s) => !s.archived || s.id === goal?.subjectId);
  const [f, setF] = useState({
    name: "",
    type: "time" as GoalType,
    period: "weekly" as GoalPeriod,
    scope: "general",
    subjectId: "",
    target: "",
    hours: "",
    minutes: "",
    start: toDateInput(new Date()),
  });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const editing = goal && !duplicate;
  const started = editing && new Date(goal.startDate) <= new Date();
  useEffect(() => {
    if (!open) return;
    setErrs({});
    if (goal) {
      setF({
        name: duplicate ? `${goal.name} (cópia)` : goal.name,
        type: goal.type,
        period: goal.period,
        scope: goal.subjectId ? "subject" : "general",
        subjectId: goal.subjectId ?? "",
        target: goal.type === "time" ? "" : String(goal.targetValue),
        hours: goal.type === "time" ? String(Math.floor(goal.targetValue / 60)) : "",
        minutes: goal.type === "time" ? String(goal.targetValue % 60) : "",
        start: toDateInput(duplicate ? new Date() : new Date(goal.startDate)),
      });
    } else
      setF({
        name: "",
        type: "time",
        period: "weekly",
        scope: "general",
        subjectId: "",
        target: "",
        hours: "",
        minutes: "",
        start: toDateInput(new Date()),
      });
  }, [open, goal, duplicate]);

  const suggestion = GOAL_SUGGESTIONS[f.type][f.period];
  const needsSubject = f.type === "subject" || f.scope === "subject";

  return (
    <FormDialog
      trigger={trigger}
      title={editing ? "Editar meta" : duplicate ? "Duplicar meta" : "Nova meta"}
      open={open}
      setOpen={setOpen}
      onSubmit={() => {
        const e: Record<string, string> = {};
        if (!f.name.trim()) e.name = "Dê um nome à meta.";
        let target = 0;
        if (f.type === "time") target = (Number(f.hours) || 0) * 60 + (Number(f.minutes) || 0);
        else target = Number(f.target);
        if (!(target > 0) || !Number.isFinite(target)) e.target = "Informe um valor positivo.";
        if (f.type === "subject" && target > 100) e.target = "O percentual máximo é 100%.";
        if ((f.type === "tasks" || f.type === "days") && !Number.isInteger(target))
          e.target = "Use um número inteiro.";
        if (needsSubject && !f.subjectId) e.subjectId = "Escolha a matéria.";
        setErrs(e);
        if (Object.keys(e).length) return;
        const start = started ? new Date(goal!.startDate) : fromDateInput(f.start);
        const today = fromDateInput(toDateInput(new Date()));
        const input: GoalInput = {
          name: f.name.trim(),
          type: f.type,
          period: f.period,
          targetValue: target,
          subjectId: needsSubject ? f.subjectId : null,
          startDate: start < today && !started ? new Date() : start,
        };
        if (input.startDate.getTime() === today.getTime()) input.startDate = today;
        actions.saveGoal(input, editing ? goal.id : undefined);
        toast.success(editing ? "Meta atualizada." : "Meta criada.");
        setOpen(false);
      }}
    >
      <Field label="Nome" htmlFor="g-name" error={errs.name}>
        <Input
          id="g-name"
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
          placeholder="Ex.: Estudar 10h na semana"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo" htmlFor="g-type">
          <NativeSelect
            id="g-type"
            value={f.type}
            onChange={(e) =>
              setF({ ...f, type: e.target.value as GoalType, target: "", hours: "", minutes: "" })
            }
          >
            {(Object.keys(GOAL_TYPE_LABEL) as GoalType[]).map((t) => (
              <option key={t} value={t}>
                {GOAL_TYPE_LABEL[t]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Período" htmlFor="g-period">
          <NativeSelect
            id="g-period"
            value={f.period}
            onChange={(e) => setF({ ...f, period: e.target.value as GoalPeriod })}
          >
            {(Object.keys(PERIOD_LABEL) as GoalPeriod[]).map((t) => (
              <option key={t} value={t}>
                {PERIOD_LABEL[t]}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      {f.type !== "subject" && (
        <Field label="Abrangência">
          <div className="flex gap-2">
            {[
              ["general", "Geral"],
              ["subject", "Uma matéria"],
            ].map(([v, l]) => (
              <Button
                key={v}
                type="button"
                size="sm"
                variant={f.scope === v ? "default" : "outline"}
                onClick={() => setF({ ...f, scope: v })}
              >
                {l}
              </Button>
            ))}
          </div>
        </Field>
      )}
      {needsSubject && (
        <Field label="Matéria" htmlFor="g-sub" error={errs.subjectId}>
          <NativeSelect
            id="g-sub"
            value={f.subjectId}
            onChange={(e) => setF({ ...f, subjectId: e.target.value })}
          >
            <option value="">Selecione…</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
      )}
      {f.type === "time" ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Horas" htmlFor="g-h" error={errs.target}>
            <Input
              id="g-h"
              type="number"
              min={0}
              value={f.hours}
              placeholder={String(Math.floor(suggestion / 60))}
              onChange={(e) => setF({ ...f, hours: e.target.value })}
            />
          </Field>
          <Field label="Minutos" htmlFor="g-m">
            <Input
              id="g-m"
              type="number"
              min={0}
              max={59}
              value={f.minutes}
              placeholder="0"
              onChange={(e) => setF({ ...f, minutes: e.target.value })}
            />
          </Field>
        </div>
      ) : (
        <Field
          label={
            f.type === "subject"
              ? "Percentual-alvo (%)"
              : f.type === "days"
                ? "Quantidade de dias"
                : "Quantidade de tarefas"
          }
          htmlFor="g-t"
          error={errs.target}
        >
          <Input
            id="g-t"
            type="number"
            min={1}
            value={f.target}
            placeholder={String(suggestion)}
            onChange={(e) => setF({ ...f, target: e.target.value })}
          />
        </Field>
      )}
      <p className="-mt-2 text-xs text-muted-foreground">
        Sugestão: {formatGoalValue(f.type, suggestion)}
      </p>
      {!started && (
        <Field label="Data de início" htmlFor="g-start">
          <Input
            id="g-start"
            type="date"
            min={toDateInput(new Date())}
            value={f.start}
            onChange={(e) => setF({ ...f, start: e.target.value })}
          />
        </Field>
      )}
      <p className="text-xs text-muted-foreground">
        A data de término é calculada automaticamente (fim do dia, da semana de segunda a domingo ou
        do mês).
      </p>
    </FormDialog>
  );
}

// ---------- Session ----------
export function SessionDialog({
  trigger,
  session,
}: {
  trigger: ReactNode;
  session?: StudySession;
}) {
  const { state, actions } = usePlanner();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ subjectId: "", date: toDateInput(new Date()), start: "", end: "" });
  const [err, setErr] = useState("");
  const [long, setLong] = useState<{ start: Date; end: Date } | null>(null);
  useEffect(() => {
    if (!open) return;
    setErr("");
    if (session) {
      const s = new Date(session.startedAt);
      const e = new Date(session.endedAt);
      setF({
        subjectId: session.subjectId ?? "",
        date: toDateInput(s),
        start: format(s, "HH:mm"),
        end: format(e, "HH:mm"),
      });
    } else setF({ subjectId: "", date: toDateInput(new Date()), start: "", end: "" });
  }, [open, session]);
  const commit = (start: Date, end: Date) => {
    actions.saveSession(
      {
        subjectId: f.subjectId || null,
        startedAt: start,
        endedAt: end,
        source: session?.source ?? "manual",
      },
      session?.id,
    );
    toast.success("Sessão salva.");
    setOpen(false);
  };
  return (
    <>
      <FormDialog
        trigger={trigger}
        title={session ? "Editar sessão" : "Registrar sessão manual"}
        open={open}
        setOpen={setOpen}
        onSubmit={() => {
          if (!f.date || !f.start || !f.end) return setErr("Preencha data, início e término.");
          const day = fromDateInput(f.date);
          const [sh, sm] = f.start.split(":").map(Number);
          const [eh, em] = f.end.split(":").map(Number);
          const start = new Date(day);
          start.setHours(sh, sm, 0, 0);
          const end = new Date(day);
          end.setHours(eh, em, 0, 0);
          if (end <= start) end.setDate(end.getDate() + 1); // atravessa a meia-noite
          if (end > new Date()) return setErr("A sessão não pode terminar no futuro.");
          const mins = (end.getTime() - start.getTime()) / 60000;
          if (mins <= 0) return setErr("A duração precisa ser positiva.");
          if (mins > state.settings.longSessionMinutes) return setLong({ start, end });
          commit(start, end);
        }}
      >
        <Field label="Matéria" htmlFor="ss-sub">
          <NativeSelect
            id="ss-sub"
            value={f.subjectId}
            onChange={(e) => setF({ ...f, subjectId: e.target.value })}
          >
            <option value="">Sem matéria (não conta nas metas)</option>
            {state.subjects
              .filter((s) => !s.archived || s.id === session?.subjectId)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </NativeSelect>
        </Field>
        <Field label="Data de início" htmlFor="ss-date">
          <Input
            id="ss-date"
            type="date"
            max={toDateInput(new Date())}
            value={f.date}
            onChange={(e) => setF({ ...f, date: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Início" htmlFor="ss-start">
            <Input
              id="ss-start"
              type="time"
              value={f.start}
              onChange={(e) => setF({ ...f, start: e.target.value })}
            />
          </Field>
          <Field label="Término" htmlFor="ss-end">
            <Input
              id="ss-end"
              type="time"
              value={f.end}
              onChange={(e) => setF({ ...f, end: e.target.value })}
            />
          </Field>
        </div>
        <p className="text-xs text-muted-foreground">
          Se o término for menor que o início, a sessão é considerada até o dia seguinte.
        </p>
        {err && <p className="text-sm text-destructive">{err}</p>}
      </FormDialog>
      <LongSessionDialog
        open={!!long}
        start={long?.start ?? null}
        end={long?.end ?? null}
        onClose={() => setLong(null)}
        onConfirm={(end) => {
          commit(long!.start, end);
          setLong(null);
        }}
      />
    </>
  );
}
