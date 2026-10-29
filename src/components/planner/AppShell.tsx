import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  BookMarked,
  CheckSquare,
  ClipboardList,
  Goal,
  LayoutDashboard,
  LineChart,
  Settings,
  Timer,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { usePlanner } from "@/lib/planner/store";
import { TimerWidget } from "./TimerWidget";
import { cn } from "@/lib/utils";

const NAV: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/", label: "Início", icon: LayoutDashboard },
  { to: "/materias", label: "Matérias", icon: BookMarked },
  { to: "/tarefas", label: "Tarefas", icon: CheckSquare },
  { to: "/pendencias", label: "Pendências", icon: ClipboardList },
  { to: "/metas", label: "Metas", icon: Goal },
  { to: "/sessoes", label: "Sessões", icon: Timer },
  { to: "/analise", label: "Análise", icon: LineChart },
  { to: "/notificacoes", label: "Notificações", icon: Bell },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { state, ready } = usePlanner();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const unread = state.notifications.filter((n) => !n.readAt).length;
  const isActive = (to: string) => (to === "/" ? path === "/" : path.startsWith(to));

  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-sidebar p-4 text-sidebar-foreground md:flex">
        <div className="mb-8 px-2 pt-2">
          <div className="font-display text-xl font-semibold">Caderno</div>
          <div className="text-xs opacity-70">Planejador de estudos</div>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent",
                isActive(n.to) && "bg-sidebar-accent font-semibold text-sidebar-accent-foreground",
              )}
            >
              <n.icon className={cn("h-4 w-4", isActive(n.to) && "text-sidebar-primary")} />
              {n.label}
              {n.to === "/notificacoes" && unread > 0 && (
                <span className="ml-auto rounded-full bg-sidebar-primary px-1.5 text-xs font-bold text-sidebar-primary-foreground">
                  {unread}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <p className="px-2 text-[11px] opacity-60">Dados salvos apenas neste navegador.</p>
      </aside>

      <header className="sticky top-0 z-30 border-b border-sidebar-border bg-sidebar text-sidebar-foreground md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="font-display text-lg font-semibold">Caderno</span>
          <Link to="/notificacoes" className="relative" aria-label="Notificações">
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute -right-1.5 -top-1.5 rounded-full bg-sidebar-primary px-1 text-[10px] font-bold text-sidebar-primary-foreground">
                {unread}
              </span>
            )}
          </Link>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2">
          {NAV.filter((n) => n.to !== "/notificacoes").map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-xs",
                isActive(n.to)
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "bg-sidebar-accent",
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="flex-1 px-4 py-8 pb-28 md:px-10">
        <div className="mx-auto max-w-6xl">
          {ready ? (
            children
          ) : (
            <div className="py-20 text-center text-muted-foreground">Carregando seus dados…</div>
          )}
        </div>
      </main>
      {ready && <TimerWidget />}
    </div>
  );
}
