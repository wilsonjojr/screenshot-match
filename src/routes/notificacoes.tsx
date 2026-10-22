import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlanner } from "@/lib/planner/store";
import { EmptyState, PageHeader } from "@/components/planner/ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/notificacoes")({
  head: () => ({
    meta: [
      { title: "Notificações — Caderno" },
      { name: "description", content: "Avisos de metas atingidas e períodos próximos do fim." },
      { property: "og:title", content: "Notificações — Caderno" },
      { property: "og:description", content: "Avisos de metas atingidas e períodos próximos do fim." },
    ],
  }),
  component: Notifications,
});

function Notifications() {
  const { state, actions } = usePlanner();
  const unread = state.notifications.some((n) => !n.readAt);
  return (
    <>
      <PageHeader title="Notificações" actions={unread && <Button variant="outline" onClick={actions.markAllRead}><Check className="h-4 w-4" /> Marcar todas como lidas</Button>} />
      {state.notifications.length ? (
        <div className="grid gap-2">
          {state.notifications.map((n) => (
            <div key={n.id} className={cn("paper-card flex items-start gap-3 p-4", n.readAt && "opacity-60")}>
              <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.readAt ? "bg-muted" : n.type === "goal_achieved" ? "bg-success" : "bg-accent")} />
              <div className="flex-1">
                <p className="font-medium">{n.title}</p>
                <p className="text-sm text-muted-foreground">{n.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">{format(new Date(n.createdAt), "dd/MM/yyyy HH:mm")}</p>
              </div>
              {!n.readAt && <Button size="sm" variant="ghost" onClick={() => actions.markRead(n.id)}>Marcar como lida</Button>}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={Bell} title="Sem notificações" text="Você será avisado quando atingir uma meta ou quando uma meta estiver perto do fim." />
      )}
    </>
  );
}
