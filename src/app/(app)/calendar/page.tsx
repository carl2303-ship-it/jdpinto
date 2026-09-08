import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Filter, Plus } from "lucide-react";

export const metadata = { title: "Calendário" };

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">
            Calendário de Ocupação
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Vista mensal, semanal e diária das intervenções e equipas.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" type="button" disabled>
            <Filter className="h-4 w-4" />
            Filtros
          </Button>
          <Link
            href="/tasks"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-sky px-4 text-sm font-medium text-white shadow-sm hover:bg-brand-sky-dark"
          >
            <Plus className="h-4 w-4" />
            Nova Intervenção
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <StatusBadge status="pending" />
        <StatusBadge status="in_progress" />
        <StatusBadge status="completed" />
        <StatusBadge status="cancelled" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Calendário interativo</CardTitle>
          <CardDescription>
            FullCalendar (mês / semana / dia), drag-and-drop e criação por slot
            serão ligados na próxima iteração.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex min-h-[420px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
            Área do calendário — aguarda ligação ao Supabase
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
