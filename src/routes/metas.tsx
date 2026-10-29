import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { format } from "date-fns";
import { Goal, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePlanner } from "@/lib/planner/store";
import { formatGoalValue, goalPercent, goalPhase } from "@/lib/planner/logic";
import {
  CLOSURE_LABEL,
  GOAL_TYPE_LABEL,
  PERIOD_LABEL,
  type ClosureReason,
  type GoalPeriod,
  type GoalType,
  type StudyGoal,
} from "@/lib/planner/types";
import { Chip, EmptyState, NativeSelect, PageHeader } from "@/components/planner/ui";
import { GoalDialog } from "@/components/planner/forms";
import { GoalCard } from "@/components/planner/GoalCard";

export const Route = createFileRoute("/metas")({
  head: () => ({
    meta: [
      { title: "Metas — Caderno" },
      {
        name: "description",
        content: "Metas de tempo, tarefas, dias estudados e progresso por matéria.",
      },
      { property: "og:title", content: "Metas — Caderno" },
      {
        property: "og:description",
        content: "Metas de tempo, tarefas, dias estudados e progresso por matéria.",
      },
    ],
  }),
  component: Goals,
});

function Goals() {
  const { state } = usePlanner();
  const now = new Date();
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [period, setPeriod] = useState("");
  const [reason, setReason] = useState("");
  const [sort, setSort] = useState("recent");

  const filtered = state.goals
    .filter(
      (g) =>
        (!q || g.name.toLowerCase().includes(q.toLowerCase())) &&
        (!type || g.type === type) &&
        (!period || g.period === period),
    )
    .sort((a, b) =>
      sort === "end"
        ? a.endDate.localeCompare(b.endDate)
        : sort === "name"
          ? a.name.localeCompare(b.name)
          : b.createdAt.localeCompare(a.createdAt),
    );
  const by = (p: string) => filtered.filter((g) => goalPhase(g, now) === p);
  const history = by("closed")
    .filter((g) => !reason || g.closureReason === reason)
    .sort((a, b) => (b.closedAt ?? "").localeCompare(a.closedAt ?? ""));

  const grid = (list: StudyGoal[], empty: string) =>
    list.length ? (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {list.map((g) => (
          <GoalCard key={g.id} goal={g} />
        ))}
      </div>
    ) : (
      <EmptyState icon={Goal} title="Nada por aqui" text={empty} />
    );

  return (
    <>
      <PageHeader
        title="Metas"
        subtitle="Objetivos que se atualizam sozinhos conforme você estuda."
        actions={
          <GoalDialog
            trigger={
              <Button>
                <Plus className="h-4 w-4" /> Nova meta
              </Button>
            }
          />
        }
      />
      <div className="mb-6 flex flex-wrap gap-2">
        <Input
          placeholder="Buscar pelo nome…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-52"
          aria-label="Buscar metas"
        />
        <NativeSelect aria-label="Tipo" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Todos os tipos</option>
          {(Object.keys(GOAL_TYPE_LABEL) as GoalType[]).map((t) => (
            <option key={t} value={t}>
              {GOAL_TYPE_LABEL[t]}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label="Período"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          <option value="">Todos os períodos</option>
          {(Object.keys(PERIOD_LABEL) as GoalPeriod[]).map((t) => (
            <option key={t} value={t}>
              {PERIOD_LABEL[t]}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Ordenar" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="recent">Mais recentes</option>
          <option value="end">Término próximo</option>
          <option value="name">Nome</option>
        </NativeSelect>
      </div>
      <Tabs defaultValue="active">
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="active">Ativas ({by("active").length})</TabsTrigger>
          <TabsTrigger value="paused">Pausadas ({by("paused").length})</TabsTrigger>
          <TabsTrigger value="scheduled">Agendadas ({by("scheduled").length})</TabsTrigger>
          <TabsTrigger value="history">Histórico ({by("closed").length})</TabsTrigger>
        </TabsList>
        <TabsContent value="active">
          {grid(by("active"), "Crie uma meta para começar a acompanhar.")}
        </TabsContent>
        <TabsContent value="paused">
          {grid(by("paused"), "Metas pausadas aparecem aqui.")}
        </TabsContent>
        <TabsContent value="scheduled">
          {grid(by("scheduled"), "Metas com início futuro aparecem aqui.")}
        </TabsContent>
        <TabsContent value="history">
          <div className="mb-4">
            <NativeSelect
              aria-label="Motivo"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              <option value="">Todos os motivos</option>
              {(Object.keys(CLOSURE_LABEL) as ClosureReason[]).map((r) => (
                <option key={r} value={r}>
                  {CLOSURE_LABEL[r]}
                </option>
              ))}
            </NativeSelect>
          </div>
          {history.length ? (
            <div className="paper-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-xs text-muted-foreground">
                  <tr>
                    {[
                      "Meta",
                      "Tipo",
                      "Período",
                      "Matéria",
                      "Alvo",
                      "Resultado",
                      "%",
                      "Início",
                      "Término",
                      "Motivo",
                    ].map((h) => (
                      <th key={h} className="px-3 py-2 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((g) => {
                    const pct = goalPercent(g, g.finalProgress);
                    return (
                      <tr key={g.id} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 font-medium">{g.name}</td>
                        <td className="px-3 py-2">{GOAL_TYPE_LABEL[g.type]}</td>
                        <td className="px-3 py-2">{PERIOD_LABEL[g.period]}</td>
                        <td className="px-3 py-2">
                          {state.subjects.find((s) => s.id === g.subjectId)?.name ?? "Geral"}
                        </td>
                        <td className="px-3 py-2">{formatGoalValue(g.type, g.targetValue)}</td>
                        <td className="px-3 py-2">{formatGoalValue(g.type, g.finalProgress)}</td>
                        <td className="px-3 py-2">{pct === null ? "—" : `${Math.round(pct)}%`}</td>
                        <td className="px-3 py-2">{format(new Date(g.startDate), "dd/MM/yy")}</td>
                        <td className="px-3 py-2">{format(new Date(g.endDate), "dd/MM/yy")}</td>
                        <td className="px-3 py-2">
                          <Chip
                            tone={
                              g.closureReason === "achieved"
                                ? "success"
                                : g.closureReason === "deleted"
                                  ? "muted"
                                  : "destructive"
                            }
                          >
                            {g.closureReason ? CLOSURE_LABEL[g.closureReason] : "—"}
                          </Chip>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={Goal}
              title="Histórico vazio"
              text="Metas encerradas ficam registradas aqui."
            />
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
