import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, ClipboardList, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlanner } from "@/lib/planner/store";
import { PENDING_STATUSES } from "@/lib/planner/types";
import { Chip, Confirm, EmptyState, NativeSelect, PageHeader } from "@/components/planner/ui";
import { PendingDialog } from "@/components/planner/forms";

export const Route = createFileRoute("/pendencias")({
  head: () => ({
    meta: [
      { title: "Pendências — Caderno" },
      { name: "description", content: "Registre e resolva pendências independentes das tarefas." },
      { property: "og:title", content: "Pendências — Caderno" },
      { property: "og:description", content: "Registre e resolva pendências independentes das tarefas." },
    ],
  }),
  component: Pending,
});

function Pending() {
  const { state, actions } = usePlanner();
  const [status, setStatus] = useState("abertas");
  const list = state.pending.filter((p) => (status === "abertas" ? p.status !== "Resolvida" : !status || p.status === status));

  return (
    <>
      <PageHeader title="Pendências" subtitle="Lembretes soltos — sem prazo, sem amarras." actions={<PendingDialog trigger={<Button><Plus className="h-4 w-4" /> Nova pendência</Button>} />} />
      <div className="mb-6">
        <NativeSelect aria-label="Filtrar status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="abertas">Não resolvidas</option>
          <option value="">Todas</option>
          {PENDING_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </NativeSelect>
      </div>
      {list.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map((p) => {
            const subject = state.subjects.find((s) => s.id === p.subjectId);
            return (
              <div key={p.id} className="paper-card flex flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className={p.status === "Resolvida" ? "font-medium text-muted-foreground line-through" : "font-medium"}>{p.title}</p>
                  <Chip tone={p.status === "Resolvida" ? "success" : p.status === "Em andamento" ? "accent" : "muted"}>{p.status}</Chip>
                </div>
                {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
                <div className="flex flex-wrap gap-1.5"><Chip tone={p.priority === "Alta" ? "destructive" : "muted"}>{p.priority}</Chip>{subject && <Chip>{subject.name}</Chip>}</div>
                <div className="flex gap-1">
                  {p.status !== "Resolvida" && <Button size="sm" variant="ghost" onClick={() => actions.savePending({ ...p, status: "Resolvida" })}><Check className="h-3.5 w-3.5" /> Resolver</Button>}
                  <PendingDialog item={p} trigger={<Button size="sm" variant="ghost"><Pencil className="h-3.5 w-3.5" /> Editar</Button>} />
                  <Confirm trigger={<Button size="sm" variant="ghost" className="text-destructive"><Trash2 className="h-3.5 w-3.5" /> Excluir</Button>} title="Excluir pendência?" text="Essa ação não pode ser desfeita." confirmLabel="Excluir" onConfirm={() => actions.deletePending(p.id)} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={ClipboardList} title="Nenhuma pendência" text="Anote aqui o que não é uma tarefa de matéria: devolver um livro, pedir material…" />
      )}
    </>
  );
}
