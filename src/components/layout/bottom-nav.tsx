"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UsersRound, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

const TECH_ITEMS = [
  { href: "/tech", label: "Tarefas", icon: Wrench },
  { href: "/tech/teams", label: "Equipas", icon: UsersRound },
] as const;

export function BottomNav({ techOnly = false }: { techOnly?: boolean }) {
  const pathname = usePathname();

  if (!techOnly) {
    // Office bottom nav kept simple — full nav is in sidebar on desktop
    const items = [
      { href: "/calendar", label: "Agenda" },
      { href: "/tasks", label: "Tarefas" },
      { href: "/a-faturar", label: "Faturar" },
      { href: "/terminadas", label: "Fim" },
      { href: "/tech", label: "Campo" },
    ];
    return (
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden">
        <ul className="mx-auto flex max-w-lg items-stretch justify-between px-1 pb-[env(safe-area-inset-bottom)]">
          {items.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  className={cn(
                    "flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium",
                    active ? "text-brand-sky" : "text-slate-500",
                  )}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden">
      <ul className="mx-auto flex max-w-lg items-stretch justify-center px-1 pb-[env(safe-area-inset-bottom)]">
        {TECH_ITEMS.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/tech"
              ? pathname === "/tech" ||
                (/^\/tech\/[^/]+$/.test(pathname) &&
                  !pathname.startsWith("/tech/teams"))
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium",
                  active ? "text-brand-sky" : "text-slate-500",
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
