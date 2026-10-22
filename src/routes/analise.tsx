import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { addDays, endOfDay, format } from "date-fns";
import { Download } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { usePlanner } from "@/lib/planner/store";
import { buildBuckets, lastSevenRange, metricsFor, percentChange, type Grouping, type Metrics } from "@/lib/planner/logic";
import { downloadCSV } from "@/lib/planner/csv";
import { Field, PageHeader } from "@/components/planner/ui";
import { fromDateInput, toDateInput } from "@/components/planner/forms";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/analise")({
  head: () => ({
    meta: [
      { title: "Análise histórica — Caderno" },
      { name: "description", content: "Horas estudadas, tarefas, dias estudados e sucesso das metas ao longo do tempo." },
      { property: "og:title", content: "Análise histórica — Caderno" },
      { property: "og:description", content: "Horas estudadas, tarefas, dias estudados e sucesso das metas ao longo do tempo." },
    ],
  }),
  component: Analysis,
});

const GROUP_LABEL: Record<Grouping, string> = { day: "Diário", week: "Semanal", month: "Mensal" };
const METRICS: { key: keyof Metrics; label: string; fmt: (v: number) => string }[] = [
  { key: "hours", label: "Horas estudadas", fmt: (v) => `${v}h` },
  { key: "tasks", label: "Tarefas concluídas", fmt: (v) => String(v) },
  { key: "days", label: "Dias estudados", fmt: (v) => String(v) },
  { key: "success", label: "% metas atingidas", fmt: (v) => `${Math.round(v)}%` },
];

const tooltipStyle = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 };

function Analysis() {
  const { state } = usePlanner();
  const [grouping, setGrouping] = useState<Grouping>("day");
  const [custom, setCustom] = useState(false);
  const [from, setFrom] = useState(toDateInput(addDays(new Date(), -13)));
  const [to, setTo] = useState(toDateInput(new Date()));
  const [compare, setCompare] = useState(false);
  const [aFrom, setAFrom] = useState(toDateInput(addDays(new Date(), -13)));
  const [aTo, setATo] = useState(toDateInput(addDays(new Date(), -7)));
  const [bFrom, setBFrom] = useState(toDateInput(addDays(new Date(), -6)));
  const [bTo, setBTo] = useState(toDateInput(new Date()));

  const range = custom ? { from: fromDateInput(from), to: endOfDay(fromDateInput(to)) } : lastSevenRange(grouping);
  const valid = range.from <= range.to;
  const data = useMemo(
    () => (valid ? buildBuckets(grouping, range.from, range.to).map((b) => ({ label: b.label, ...metricsFor(state, b.from, b.to) })) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, grouping, range.from.getTime(), range.to.getTime(), valid],
  );
  const totals = valid ? metricsFor(state, range.from, range.to) : null;

  const A = metricsFor(state, fromDateInput(aFrom), endOfDay(fromDateInput(aTo)));
  const B = metricsFor(state, fromDateInput(bFrom), endOfDay(fromDateInput(bTo)));
  const compareRows = METRICS.map((m) => {
    const a = A[m.key], b = B[m.key];
    const diff = a === null || b === null ? null : Math.round((b - a) * 10) / 10;
    return { ...m, a, b, diff, pct: percentChange(a, b) };
  });

  const exportCSV = () => {
    const rows: (string | number | null)[][] = [["Período", "Horas estudadas", "Tarefas concluídas", "Dias estudados", "% metas atingidas"]];
    data.forEach((d) => rows.push([d.label, d.hours, d.tasks, d.days, d.success === null ? "" : Math.round(d.success)]));
    if (compare) {
      rows.push([], ["Comparação", `Intervalo 1 (${aFrom} a ${aTo})`, `Intervalo 2 (${bFrom} a ${bTo})`, "Diferença absoluta", "Variação %"]);
      compareRows.forEach((r) => rows.push([r.label, r.a ?? "", r.b ?? "", r.diff ?? "", r.pct === null ? "Não calculável" : `${Math.round(r.pct)}%`]));
    }
    downloadCSV(`analise_${grouping}_${format(new Date(), "yyyy-MM-dd")}.csv`, rows);
  };

  return (
    <>
      <PageHeader title="Análise histórica" subtitle="Compare você com você mesmo." actions={<Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4" /> Exportar CSV</Button>} />

      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div className="inline-flex rounded-lg border border-border bg-card p-1">
          {(Object.keys(GROUP_LABEL) as Grouping[]).map((g) => (
            <button key={g} onClick={() => setGrouping(g)} className={cn("rounded-md px-3 py-1.5 text-sm", grouping === g ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{GROUP_LABEL[g]}</button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm"><Switch checked={custom} onCheckedChange={setCustom} /> Intervalo personalizado</label>
        {custom && (
          <>
            <Field label="De" htmlFor="an-from"><Input id="an-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
            <Field label="Até" htmlFor="an-to"><Input id="an-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          </>
        )}
      </div>
      {!valid && <p className="mb-4 text-sm text-destructive">A data inicial deve ser anterior à final.</p>}

      {totals && (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {METRICS.map((m) => (
            <div key={m.key} className="paper-card p-4">
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <p className="mt-1 font-display text-2xl font-semibold">{totals[m.key] === null ? <span className="text-base font-normal text-muted-foreground">Ainda não há dados</span> : m.fmt(totals[m.key] as number)}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="paper-card p-5">
          <h2 className="mb-4 text-lg font-semibold">Horas e dias estudados</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" fontSize={11} stroke="var(--muted-foreground)" />
              <YAxis fontSize={11} stroke="var(--muted-foreground)" allowDecimals />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Bar dataKey="hours" name="Horas" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="days" name="Dias" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="paper-card p-5">
          <h2 className="mb-4 text-lg font-semibold">Tarefas concluídas</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" fontSize={11} stroke="var(--muted-foreground)" />
              <YAxis fontSize={11} stroke="var(--muted-foreground)" allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="tasks" name="Tarefas" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="paper-card p-5 lg:col-span-2">
          <h2 className="mb-1 text-lg font-semibold">Evolução do sucesso das metas</h2>
          <p className="mb-4 text-xs text-muted-foreground">Metas atingidas ÷ metas encerradas naturalmente. Períodos sem metas encerradas aparecem vazios.</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" fontSize={11} stroke="var(--muted-foreground)" />
              <YAxis domain={[0, 100]} fontSize={11} stroke="var(--muted-foreground)" unit="%" />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${Math.round(v)}%`} />
              <Line dataKey="success" name="Sucesso" stroke="var(--chart-1)" strokeWidth={2} connectNulls={false} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <section className="mt-10">
        <label className="mb-4 flex items-center gap-2 text-lg font-semibold"><Switch checked={compare} onCheckedChange={setCompare} /> Comparar dois intervalos</label>
        {compare && (
          <div className="paper-card p-5">
            <div className="mb-5 grid gap-4 md:grid-cols-2">
              <div className="grid grid-cols-2 gap-2"><Field label="Intervalo 1 — de" htmlFor="a1"><Input id="a1" type="date" value={aFrom} onChange={(e) => setAFrom(e.target.value)} /></Field><Field label="até" htmlFor="a2"><Input id="a2" type="date" value={aTo} onChange={(e) => setATo(e.target.value)} /></Field></div>
              <div className="grid grid-cols-2 gap-2"><Field label="Intervalo 2 — de" htmlFor="b1"><Input id="b1" type="date" value={bFrom} onChange={(e) => setBFrom(e.target.value)} /></Field><Field label="até" htmlFor="b2"><Input id="b2" type="date" value={bTo} onChange={(e) => setBTo(e.target.value)} /></Field></div>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-2">Indicador</th><th>Intervalo 1</th><th>Intervalo 2</th><th>Diferença</th><th>Variação</th></tr></thead>
                <tbody>
                  {compareRows.map((r) => (
                    <tr key={r.key} className="border-t border-border">
                      <td className="py-2 font-medium">{r.label}</td>
                      <td>{r.a === null ? "—" : r.fmt(r.a)}</td>
                      <td>{r.b === null ? "—" : r.fmt(r.b)}</td>
                      <td className={cn(r.diff !== null && r.diff > 0 && "text-success", r.diff !== null && r.diff < 0 && "text-destructive")}>{r.diff === null ? "—" : `${r.diff > 0 ? "+" : ""}${r.key === "success" ? Math.round(r.diff) + " p.p." : r.fmt(r.diff)}`}</td>
                      <td className="text-muted-foreground">{r.pct === null ? "Não calculável" : `${r.pct > 0 ? "+" : ""}${Math.round(r.pct)}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={compareRows.filter((r) => r.key !== "success").map((r) => ({ label: r.label, i1: r.a, i2: r.b }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" fontSize={11} stroke="var(--muted-foreground)" />
                  <YAxis fontSize={11} stroke="var(--muted-foreground)" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Bar dataKey="i1" name="Intervalo 1" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="i2" name="Intervalo 2" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
