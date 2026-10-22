import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Pencil, Plus, Timer, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlanner } from "@/lib/planner/store";
import { formatMinutes } from "@/lib/planner/logic";
import { Chip, Confirm, EmptyState, NativeSelect, PageHeader, SubjectIcon } from "@/components/planner/ui";
import { SessionDialog } from "@/components/planner/forms";

export const Route = createFileRoute("/sessoes")({
  head: () => ({
    meta: [
      { title: "Sessões de estudo — Caderno" },
      { name: "description", content: "Cronometre, registre e edite suas sessões de estudo." },
      { property: "og:title", content: "Sessões de estudo — Caderno" },
      { property: "og:description", content: "Cronometre, registre e edite suas sessões de estudo." },
    ],
  }),
  component: Sessions,
});

function Sessions() {
  const { state, actions } = usePlanner();
  const [subject, setSubject] = useState("");
  const list = [...state.sessions].filter((s) => !subject || (subject === "none" ? !s.subjectId : s.subjectId === subject)).sort((a, b) => b.startedAt.localeCompare(a.startedAt));

  return (
    <>
      <PageHeader title="Sessões de estudo" subtitle="Use o botão “Estudar” no canto da tela para cronometrar." actions={<SessionDialog trigger={<Button><Plus className="h-4 w-4" /> Registrar manualmente</Button>} />} />
      <div className="mb-6">
        <NativeSelect aria-label="Matéria" value={subject} onChange={(e) => setSubject(e.target.value)}>
          <option value="">Todas as matérias</option>
          <option value="none">Sem matéria</option>
          {state.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </NativeSelect>
      </div>
      {list.length ? (
        <div className="grid gap-2">
          {list.map((s) => {
            const sub = state.subjects.find((x) => x.id === s.subjectId);
            const a = new Date(s.startedAt), b = new Date(s.endedAt);
            return (
              <div key={s.id} className="paper-card flex items-center gap-3 p-3">
                <SubjectIcon subject={sub} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{sub?.name ?? "Sem matéria"} <span className="font-normal text-muted-foreground">· {formatMinutes(s.durationMinutes)}</span></p>
                  <p className="text-xs text-muted-foreground">{format(a, "EEE, dd 'de' MMM", { locale: ptBR })} · {format(a, "HH:mm")}–{format(b, "HH:mm")}{a.toDateString() !== b.toDateString() && " (+1 dia)"}</p>
                </div>
                {!sub && <Chip tone="destructive">Não conta nas metas</Chip>}
                <Chip>{s.source === "timer" ? "Cronômetro" : "Manual"}</Chip>
                <SessionDialog session={s} trigger={<Button size="icon" variant="ghost" aria-label="Editar"><Pencil className="h-4 w-4" /></Button>} />
                <Confirm trigger={<Button size="icon" variant="ghost" aria-label="Excluir" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>} title="Excluir sessão?" text="As metas ativas e as análises serão recalculadas. Metas encerradas não mudam." confirmLabel="Excluir" onConfirm={() => actions.deleteSession(s.id)} />
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={Timer} title="Nenhuma sessão registrada" text="Comece o cronômetro ou registre um estudo que você já fez." />
      )}
    </>
  );
}
