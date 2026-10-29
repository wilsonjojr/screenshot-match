import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CheckSquare, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePlanner } from "@/lib/planner/store";
import { PRIORITIES, TASK_CATEGORIES, TASK_STATUSES } from "@/lib/planner/types";
import { EmptyState, NativeSelect, PageHeader } from "@/components/planner/ui";
import { TaskDialog } from "@/components/planner/forms";
import { TaskRow } from "@/components/planner/TaskRow";

export const Route = createFileRoute("/tarefas")({
  head: () => ({
    meta: [
      { title: "Tarefas — Caderno" },
      { name: "description", content: "Gerencie tarefas por matéria, status e prioridade." },
      { property: "og:title", content: "Tarefas — Caderno" },
      { property: "og:description", content: "Gerencie tarefas por matéria, status e prioridade." },
    ],
  }),
  component: Tasks,
});

const PRI_ORDER = { Alta: 0, Média: 1, Baixa: 2 };

function Tasks() {
  const { state } = usePlanner();
  const [q, setQ] = useState("");
  const [subject, setSubject] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("due");
  const active = new Set(state.subjects.filter((s) => !s.archived).map((s) => s.id));

  const list = state.tasks
    .filter((t) => active.has(t.subjectId))
    .filter(
      (t) =>
        (!subject || t.subjectId === subject) &&
        (!status || t.status === status) &&
        (!priority || t.priority === priority) &&
        (!category || t.category === category),
    )
    .filter((t) => !q || (t.title + t.description).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) =>
      sort === "priority"
        ? PRI_ORDER[a.priority] - PRI_ORDER[b.priority]
        : sort === "recent"
          ? b.createdAt.localeCompare(a.createdAt)
          : (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"),
    );

  return (
    <>
      <PageHeader
        title="Tarefas"
        subtitle="Tudo o que você precisa fazer, por matéria."
        actions={
          <TaskDialog
            trigger={
              <Button>
                <Plus className="h-4 w-4" /> Nova tarefa
              </Button>
            }
          />
        }
      />
      <div className="mb-6 flex flex-wrap gap-2">
        <Input
          placeholder="Buscar…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-48"
          aria-label="Buscar tarefas"
        />
        <NativeSelect
          aria-label="Matéria"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        >
          <option value="">Todas as matérias</option>
          {state.subjects
            .filter((s) => !s.archived)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
        </NativeSelect>
        <NativeSelect
          aria-label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Todos os status</option>
          {TASK_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label="Prioridade"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="">Todas as prioridades</option>
          {PRIORITIES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label="Categoria"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">Todas as categorias</option>
          {TASK_CATEGORIES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Ordenar" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="due">Ordenar por prazo</option>
          <option value="priority">Por prioridade</option>
          <option value="recent">Mais recentes</option>
        </NativeSelect>
      </div>
      {list.length ? (
        <div className="grid gap-3">
          {list.map((t) => (
            <TaskRow key={t.id} task={t} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={CheckSquare}
          title="Nenhuma tarefa encontrada"
          text="Crie uma tarefa ou ajuste os filtros."
        />
      )}
    </>
  );
}
