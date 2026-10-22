import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Archive, BookMarked, Pencil, Plus, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { usePlanner } from "@/lib/planner/store";
import { subjectPercent } from "@/lib/planner/logic";
import { Bar, Confirm, EmptyState, PageHeader, SubjectIcon, subjectColor } from "@/components/planner/ui";
import { SubjectDialog } from "@/components/planner/forms";

export const Route = createFileRoute("/materias/")({
  head: () => ({
    meta: [
      { title: "Matérias — Caderno" },
      { name: "description", content: "Cadastre, edite, arquive e restaure suas matérias." },
      { property: "og:title", content: "Matérias — Caderno" },
      { property: "og:description", content: "Cadastre, edite, arquive e restaure suas matérias." },
    ],
  }),
  component: Subjects,
});

function Subjects() {
  const { state, actions } = usePlanner();
  const [showArchived, setShowArchived] = useState(false);
  const list = state.subjects.filter((s) => s.archived === showArchived);

  return (
    <>
      <PageHeader
        title="Matérias"
        subtitle={showArchived ? "Matérias arquivadas — dados preservados." : "Suas disciplinas e o progresso de cada uma."}
        actions={
          <>
            <Button variant="outline" onClick={() => setShowArchived(!showArchived)}>{showArchived ? "Ver ativas" : "Ver arquivadas"}</Button>
            <SubjectDialog trigger={<Button><Plus className="h-4 w-4" /> Nova matéria</Button>} />
          </>
        }
      />
      {list.length === 0 ? (
        <EmptyState icon={BookMarked} title={showArchived ? "Nenhuma matéria arquivada" : "Nenhuma matéria ainda"} text={showArchived ? "Matérias arquivadas aparecem aqui." : "Crie matérias para organizar tarefas, metas e sessões."} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((s) => {
            const tasks = state.tasks.filter((t) => t.subjectId === s.id);
            const p = subjectPercent(state, s.id);
            return (
              <div key={s.id} className="paper-card flex flex-col gap-3 p-5" style={{ borderTop: `4px solid ${subjectColor(s.color)}` }}>
                <Link to="/materias/$id" params={{ id: s.id }} className="flex items-center gap-3">
                  <SubjectIcon subject={s} />
                  <div className="min-w-0">
                    <p className="font-display text-lg font-medium">{s.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{s.description || "Sem descrição"}</p>
                  </div>
                </Link>
                <div className="text-xs text-muted-foreground">{tasks.length} tarefas · {p === null ? "sem progresso" : `${Math.round(p)}% concluído`}</div>
                <Bar value={p} color={subjectColor(s.color)} />
                <div className="flex gap-1">
                  {showArchived ? (
                    <Button size="sm" variant="ghost" onClick={() => { actions.restoreSubject(s.id); toast.success("Matéria restaurada. Metas pausadas continuam pausadas."); }}><RotateCcw className="h-3.5 w-3.5" /> Restaurar</Button>
                  ) : (
                    <>
                      <SubjectDialog subject={s} trigger={<Button size="sm" variant="ghost"><Pencil className="h-3.5 w-3.5" /> Editar</Button>} />
                      <Confirm
                        trigger={<Button size="sm" variant="ghost"><Archive className="h-3.5 w-3.5" /> Arquivar</Button>}
                        title={`Arquivar ${s.name}?`}
                        text="A matéria sairá das listas ativas, com dados preservados. Metas ativas vinculadas serão pausadas."
                        confirmLabel="Arquivar"
                        onConfirm={() => { actions.archiveSubject(s.id); toast.success("Matéria arquivada."); }}
                      />
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
