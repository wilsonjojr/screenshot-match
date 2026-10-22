import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlanner } from "@/lib/planner/store";
import { formatMinutes, goalPhase, subjectPercent } from "@/lib/planner/logic";
import { Bar, Chip, EmptyState, PageHeader, Stat, SubjectIcon, subjectColor } from "@/components/planner/ui";
import { TaskDialog } from "@/components/planner/forms";
import { TaskRow } from "@/components/planner/TaskRow";
import { GoalCard } from "@/components/planner/GoalCard";
import { TASK_STATUSES } from "@/lib/planner/types";
import { CheckCircle2, Clock, ListTodo } from "lucide-react";

export const Route = createFileRoute("/materias/$id")({
  head: () => ({
    meta: [
      { title: "Detalhes da matéria — Caderno" },
      { name: "description", content: "Tarefas, metas e progresso de uma matéria." },
      { property: "og:title", content: "Detalhes da matéria — Caderno" },
      { property: "og:description", content: "Tarefas, metas e progresso de uma matéria." },
    ],
  }),
  component: SubjectDetail,
});

function SubjectDetail() {
  const { id } = Route.useParams();
  const { state } = usePlanner();
  const s = state.subjects.find((x) => x.id === id);
  if (!s) return <EmptyState title="Matéria não encontrada" text="Ela pode ter sido removida." action={<Link to="/materias" className="text-primary underline">Voltar</Link>} />;
  const tasks = state.tasks.filter((t) => t.subjectId === id);
  const goals = state.goals.filter((g) => g.subjectId === id && goalPhase(g, new Date()) !== "closed");
  const p = subjectPercent(state, id);
  const total = state.sessions.filter((x) => x.subjectId === id).reduce((a, x) => a + x.durationMinutes, 0);

  return (
    <>
      <Link to="/materias" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Matérias</Link>
      <div className="mb-2 flex items-center gap-3">
        <SubjectIcon subject={s} className="h-12 w-12" />
        {s.archived && <Chip tone="accent">Arquivada</Chip>}
      </div>
      <PageHeader title={s.name} subtitle={s.description || undefined} actions={!s.archived && <TaskDialog defaultSubjectId={id} trigger={<Button><Plus className="h-4 w-4" /> Nova tarefa</Button>} />} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={CheckCircle2} label="Conclusão" value={p === null ? "—" : `${Math.round(p)}%`} hint="das tarefas existentes" />
        <Stat icon={ListTodo} label="Tarefas" value={tasks.length} hint={TASK_STATUSES.map((st) => `${tasks.filter((t) => t.status === st).length} ${st.toLowerCase()}`).join(" · ")} />
        <Stat icon={Clock} label="Tempo total" value={formatMinutes(total)} hint="em sessões registradas" />
      </div>
      <div className="mt-4"><Bar value={p} color={subjectColor(s.color)} /></div>

      {goals.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-2xl font-semibold">Metas desta matéria</h2>
          <div className="grid gap-4 md:grid-cols-2">{goals.map((g) => <GoalCard key={g.id} goal={g} />)}</div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="mb-4 text-2xl font-semibold">Tarefas</h2>
        {tasks.length ? <div className="grid gap-3">{tasks.map((t) => <TaskRow key={t.id} task={t} />)}</div> : <EmptyState title="Sem tarefas" text="Adicione leituras, exercícios ou revisões para esta matéria." />}
      </section>
    </>
  );
}
