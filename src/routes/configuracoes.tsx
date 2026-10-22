import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { addDays, endOfDay, format } from "date-fns";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePlanner } from "@/lib/planner/store";
import { buildBuckets, goalPhase, goalProgress, metricsFor } from "@/lib/planner/logic";
import { downloadCSV } from "@/lib/planner/csv";
import { CLOSURE_LABEL, GOAL_TYPE_LABEL, PERIOD_LABEL } from "@/lib/planner/types";
import { Field, PageHeader } from "@/components/planner/ui";
import { fromDateInput, toDateInput } from "@/components/planner/forms";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações e exportação — Caderno" },
      { name: "description", content: "Preferências e exportação dos seus dados em CSV." },
      { property: "og:title", content: "Configurações e exportação — Caderno" },
      { property: "og:description", content: "Preferências e exportação dos seus dados em CSV." },
    ],
  }),
  component: SettingsPage,
});

const PHASE_LABEL = { active: "Ativa", paused: "Pausada", scheduled: "Agendada", closed: "Encerrada" };

function SettingsPage() {
  const { state, actions } = usePlanner();
  const [from, setFrom] = useState(toDateInput(addDays(new Date(), -30)));
  const [to, setTo] = useState(toDateInput(new Date()));
  const [longH, setLongH] = useState(String(state.settings.longSessionMinutes / 60));

  const exportAll = () => {
    const a = fromDateInput(from), b = endOfDay(fromDateInput(to));
    if (a > b) { toast.error("A data inicial deve ser anterior à final."); return; }
    const now = new Date();
    const goals = state.goals.filter((g) => new Date(g.startDate) <= b && new Date(g.endDate) >= a);
    downloadCSV(`metas_${from}_${to}.csv`, [
      ["Nome", "Situação", "Tipo", "Período", "Matéria", "Alvo", "Progresso", "Início", "Término", "Motivo do encerramento", "Encerrada em"],
      ...goals.map((g) => [
        g.name, PHASE_LABEL[goalPhase(g, now)], GOAL_TYPE_LABEL[g.type], PERIOD_LABEL[g.period],
        state.subjects.find((s) => s.id === g.subjectId)?.name ?? "Geral",
        g.targetValue, goalProgress(state, g) ?? "",
        format(new Date(g.startDate), "yyyy-MM-dd"), format(new Date(g.endDate), "yyyy-MM-dd"),
        g.closureReason ? CLOSURE_LABEL[g.closureReason] : "", g.closedAt ? format(new Date(g.closedAt), "yyyy-MM-dd HH:mm") : "",
      ]),
    ]);
    downloadCSV(`indicadores_${from}_${to}.csv`, [
      ["Dia", "Horas estudadas", "Tarefas concluídas", "Dia estudado", "% metas atingidas"],
      ...buildBuckets("day", a, b).map((k) => {
        const m = metricsFor(state, k.from, k.to);
        return [format(k.from, "yyyy-MM-dd"), m.hours, m.tasks, m.days, m.success === null ? "" : Math.round(m.success)];
      }),
    ]);
    toast.success("Arquivos CSV gerados.");
  };

  return (
    <>
      <PageHeader title="Configurações" subtitle="Preferências e exportação dos dados." />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="paper-card grid gap-4 p-6">
          <h2 className="text-xl font-semibold">Exportar dados (CSV)</h2>
          <p className="text-sm text-muted-foreground">Gera dois arquivos: metas (ativas, pausadas, agendadas e histórico) e indicadores diários de estudo.</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data inicial" htmlFor="ex-from"><Input id="ex-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
            <Field label="Data final" htmlFor="ex-to"><Input id="ex-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          </div>
          <Button onClick={exportAll}><Download className="h-4 w-4" /> Exportar</Button>
        </section>
        <section className="paper-card grid gap-4 p-6">
          <h2 className="text-xl font-semibold">Sessões longas</h2>
          <Field label="Pedir confirmação para sessões acima de (horas)" htmlFor="long">
            <Input id="long" type="number" min={1} step={0.5} value={longH} onChange={(e) => setLongH(e.target.value)} />
          </Field>
          <Button variant="outline" onClick={() => { const h = Number(longH); if (!(h > 0)) { toast.error("Valor inválido."); return; } actions.updateSettings({ longSessionMinutes: Math.round(h * 60) }); toast.success("Preferência salva."); }}>Salvar</Button>
          <p className="text-xs text-muted-foreground">Seus dados ficam apenas neste navegador. Limpar os dados do navegador apaga o planejamento — exporte com frequência.</p>
        </section>
      </div>
    </>
  );
}
