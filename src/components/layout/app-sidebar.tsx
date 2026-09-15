"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ClipboardList,
  FileCheck2,
  LogOut,
  Menu,
  Receipt,
  Smartphone,
  Users,
  UsersRound,
  Wrench,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { signOut } from "@/app/auth/actions";
import {
  ROLE_LABELS,
  type Collaborator,
  type CollaboratorRole,
} from "@/types/database";
import { isOfficeRole } from "@/lib/auth-shared";

const OFFICE_NAV = [
  { href: "/calendar", label: "Calendário", icon: CalendarDays },
  { href: "/tasks", label: "Intervenções", icon: ClipboardList },
  { href: "/a-faturar", label: "A faturar", icon: Receipt },
  { href: "/terminadas", label: "Terminadas", icon: FileCheck2 },
  { href: "/clients", label: "Clientes", icon: Users },
  { href: "/team", label: "Equipas", icon: UsersRound },
  { href: "/tech", label: "Vista técnico", icon: Smartphone },
] as const;

const TECH_NAV = [
  { href: "/tech", label: "As minhas tarefas", icon: Wrench },
  { href: "/tech/teams", label: "Minhas equipas", icon: UsersRound },
] as const;

type Props = {
  collaborator: Collaborator | null;
  email?: string | null;
};

export function AppSidebar({ collaborator, email }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const role = collaborator?.role as CollaboratorRole | undefined;
  const nav = isOfficeRole(role) ? OFFICE_NAV : TECH_NAV;

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="flex flex-col gap-1 px-3">
      {nav.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/tech"
            ? pathname === "/tech" ||
              (/^\/tech\/[^/]+$/.test(pathname) &&
                !pathname.startsWith("/tech/teams"))
            : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-brand-sky/15 text-brand-sky"
                : "text-slate-300 hover:bg-white/5 hover:text-white",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  const UserFooter = () => (
    <div className="space-y-3 border-t border-white/10 p-4">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-white">
          {collaborator?.full_name ?? "Utilizador"}
        </p>
        <p className="truncate text-xs text-slate-400">
          {collaborator ? ROLE_LABELS[collaborator.role] : email}
        </p>
      </div>
      <form action={signOut}>
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          className="w-full justify-start text-slate-300 hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Terminar sessão
        </Button>
      </form>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-800 bg-brand-navy text-white lg:flex">
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
          <BrandLogo size={40} className="rounded-lg" />
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-wide">JDPINTO</p>
            <p className="text-xs text-slate-400">Gestão de Intervenções</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <NavLinks />
        </div>
        <UserFooter />
      </aside>

      {/* Mobile top bar — full width row above content (parent is flex-col on mobile) */}
      <header className="sticky top-0 z-40 flex h-14 w-full shrink-0 items-center justify-between border-b border-slate-200 bg-brand-navy px-4 text-white lg:hidden">
        <div className="flex items-center gap-2">
          <BrandLogo size={32} className="rounded-md" />
          <span className="text-sm font-semibold">JDPINTO</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10"
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal>
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(18rem,85vw)] flex-col bg-brand-navy text-white shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
              <span className="font-semibold">Menu</span>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10"
                onClick={() => setOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto py-4">
              <NavLinks onNavigate={() => setOpen(false)} />
            </div>
            <UserFooter />
          </div>
        </div>
      )}
    </>
  );
}
