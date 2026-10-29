import { useEffect, useState } from "react";
import { Play, Square, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { usePlanner } from "@/lib/planner/store";
import { formatMinutes } from "@/lib/planner/logic";
import { Confirm, NativeSelect } from "./ui";
import { LongSessionDialog } from "./LongSessionDialog";

function fmt(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function TimerWidget() {
  const { state, actions } = usePlanner();
  const timer = state.settings.activeTimer;
  const subjects = state.subjects.filter((s) => !s.archived);
  const [subjectId, setSubjectId] = useState("");
  const [tick, setTick] = useState(Date.now());
  const [pendingEnd, setPendingEnd] = useState<Date | null>(null);

  useEffect(() => {
    if (!timer) return;
    const t = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, [timer]);

  const finish = (end: Date) => {
    if (!timer) return;
    const start = new Date(timer.startedAt);
    if (end.getTime() - start.getTime() < 60000) {
      toast.error("A sessão precisa ter pelo menos 1 minuto.");
      return;
    }
    actions.saveSession({
      subjectId: timer.subjectId,
      startedAt: start,
      endedAt: end,
      source: "timer",
    });
    toast.success(
      `Sessão de ${formatMinutes(Math.round((end.getTime() - start.getTime()) / 60000))} registrada.`,
    );
  };

  const stop = () => {
    if (!timer) return;
    const end = new Date();
    const mins = (end.getTime() - new Date(timer.startedAt).getTime()) / 60000;
    if (mins > state.settings.longSessionMinutes) setPendingEnd(end);
    else finish(end);
  };

  const subject = state.subjects.find((s) => s.id === timer?.subjectId);

  return (
    <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border border-border bg-card p-1.5 pl-4 shadow-card">
      {timer ? (
        <>
          <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
          <span className="font-mono text-sm tabular-nums">
            {fmt(tick - new Date(timer.startedAt).getTime())}
          </span>
          <span className="hidden max-w-32 truncate text-xs text-muted-foreground sm:inline">
            {subject?.name ?? "Sem matéria"}
          </span>
          <Confirm
            trigger={
              <Button size="icon" variant="ghost" aria-label="Descartar sessão">
                <X className="h-4 w-4" />
              </Button>
            }
            title="Descartar sessão?"
            text="O tempo cronometrado não será registrado."
            confirmLabel="Descartar"
            onConfirm={actions.cancelTimer}
          />
          <Button size="sm" className="rounded-full" onClick={stop}>
            <Square className="h-3.5 w-3.5" /> Encerrar
          </Button>
        </>
      ) : (
        <>
          <NativeSelect
            aria-label="Matéria da sessão"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="h-8 max-w-40 rounded-full"
          >
            <option value="">Sem matéria</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </NativeSelect>
          <Button
            size="sm"
            className="rounded-full"
            onClick={() => actions.startTimer(subjectId || null)}
          >
            <Play className="h-3.5 w-3.5" /> Estudar
          </Button>
        </>
      )}
      <LongSessionDialog
        open={!!pendingEnd}
        start={timer ? new Date(timer.startedAt) : null}
        end={pendingEnd}
        onClose={() => setPendingEnd(null)}
        onConfirm={(end) => {
          finish(end);
          setPendingEnd(null);
        }}
      />
    </div>
  );
}
