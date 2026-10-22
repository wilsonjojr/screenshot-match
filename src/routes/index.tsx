import { createFileRoute, Link } from "@tanstack/react-router";
import { endOfDay, endOfWeek, startOfDay, startOfWeek } from "date-fns";
import { CalendarCheck, CheckCircle2, Clock, Flame, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlanner } from "@/lib/planner/store";
import { completedTasks, formatMinutes, goalPhase, studiedDays, studyMinutes, studyStreak, subjectPercent } from "@/lib/planner/logic";
import { GoalCard } from "@/components/planner/GoalCard";
import { Bar, Chip, EmptyState, PageHeader, Stat, SubjectIcon, subjectColor } from "@/components/planner/ui";
import { GoalDialog, SessionDialog } from "@/components/planner/forms";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Início — Caderno, planejador de estudos" },
      { name: "description", content: "Resumo das suas metas, tarefas, pendências e horas de estudo." },
      { property: "og:title", content: "Caderno — planejador de estudos" },
      { property: "og:description", content: "Organize matérias, tarefas, metas e sessões de estudo." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { state } = usePlanner();
  const now = new Date();
  const wFrom = startOfWeek(now, { weekStartsOn: 1 });
  const wTo = endOfWeek(now, { weekStartsOn: 1 });
  const active = state.goals
    .filter((g) => goalPhase(g, now) === "active")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 3);
  const subjects = state.subjects.filter((s) => !s.archived);
  const tasks = state.tasks.filter((t) => subjects.some((s) => s.id === t.subjectId));
  const counts = { p: tasks.filter((t) => t.status === "Pendente").length, a: tasks.filter((t) => t.status === "Em andamento").length, c: tasks.filter((t) => t.status === "Concluída").length };
  const openPending = state.pending.filter((p) => p.status !== "Resolvida");
  const streak = studyStreak(state, now);

  return (
    <>
      <PageHeader
        title="Bom estudo!"
        subtitle="Um resumo da sua rotina desta semana."
        actions={
          <>
            <SessionDialog trigger={<Button variant="outline"><Clock className="h-4 w-4" /> Registrar estudo</Button>} />
            <GoalDialog trigger={<Button><Plus className="h-4 w-4" /> Nova meta</Button>} />
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={Clock} label="Hoje" value={formatMinutes(Math.round(studyMinutes(state, startOfDay(now), endOfDay(now))))} hint="tempo estudado" />
        <Stat icon={Clock} label="Esta semana" value={formatMinutes(Math.round(studyMinutes(state, wFrom, wTo)))} hint={`${studiedDays(state, wFrom, wTo)} dias estudados`} />
        <Stat icon={CheckCircle2} label="Tarefas na semana" value={completedTasks(state, wFrom, wTo)} hint="concluídas" />
        <Stat icon={Flame} label="Sequência" value={`${streak} ${streak === 1 ? "dia" : "dias"}`} hint="dias seguidos estudando" />
      </div>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Metas ativas</h2>
          <Link to="/metas" className="text-sm text-primary underline-offset-4 hover:underline">Ver todas</Link>
        </div>
        {active.length ? (
          <div className="grid gap-4 md:grid-cols-3">{active.map((g) => <GoalCard key={g.id} goal={g} compact />)}</div>
        ) : (
          <EmptyState icon={CalendarCheck} title="Nenhuma meta ativa" text="Defina um objetivo de tempo, tarefas ou dias de estudo para acompanhar seu progresso." action={<GoalDialog trigger={<Button size="sm">Criar meta</Button>} />} />
        )}
      </section>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        <section className="paper-card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Matérias</h2>
            <Link to="/materias" className="text-sm text-primary hover:underline">Gerenciar</Link>
          </div>
          {subjects.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {subjects.slice(0, 6).map((s) => {
                const p = subjectPercent(state, s.id);
                return (
                  <Link key={s.id} to="/materias/$id" params={{ id: s.id }} className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted">
                    <SubjectIcon subject={s} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{s.name}</p>
                      <Bar value={p} color={subjectColor(s.color)} />
                    </div>
                    <span className="text-xs text-muted-foreground">{p === null ? "—" : `${Math.round(p)}%`}</span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Cadastre sua primeira matéria para começar.</p>
          )}
        </section>
        <section className="flex flex-col gap-6">
          <div className="paper-card p-5">
            <div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-semibold">Tarefas</h2><Link to="/tarefas" className="text-sm text-primary hover:underline">Abrir</Link></div>
            <div className="flex flex-wrap gap-2"><Chip>{counts.p} pendentes</Chip><Chip tone="accent">{counts.a} em andamento</Chip><Chip tone="success">{counts.c} concluídas</Chip></div>
          </div>
          <div className="paper-card p-5">
            <div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-semibold">Pendências</h2><Link to="/pendencias" className="text-sm text-primary hover:underline">Abrir</Link></div>
            {openPending.length ? (
              <ul className="space-y-1 text-sm">{openPending.slice(0, 4).map((p) => <li key={p.id} className="truncate">• {p.title}</li>)}</ul>
            ) : <p className="text-sm text-muted-foreground">Nada em aberto.</p>}
          </div>
          <Link to="/analise" className="paper-card p-5 text-sm hover:bg-muted">Ver análise histórica →</Link>
        </section>
      </div>
    </>
  );
}
