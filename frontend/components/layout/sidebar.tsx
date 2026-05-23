"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { navGroups, navItems } from "@/lib/nav";
import { AegisLogo } from "./logo";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { orgInfo } from "@/lib/data";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex h-svh w-[244px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
        <AegisLogo />
      </div>

      <button
        type="button"
        className="mx-3 mt-3 flex items-center justify-between rounded-lg border border-sidebar-border bg-sidebar-accent/40 px-3 py-2 text-left transition-colors hover:bg-sidebar-accent"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-[10px]">AC</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate text-[12.5px] font-medium leading-none">
              {orgInfo.name}
            </div>
            <div className="mt-1 truncate text-[10px] uppercase tracking-wider text-muted-foreground">
              {orgInfo.plan} · {orgInfo.region.split(" / ")[0]}
            </div>
          </div>
        </div>
        <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      <nav className="mt-3 flex-1 overflow-y-auto px-2 pb-3">
        {navGroups.map((group) => (
          <div key={group} className="mb-1">
            <div className="px-3 pb-1 pt-3 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
              {group}
            </div>
            <ul className="space-y-0.5">
              {navItems
                .filter((item) => item.group === group)
                .map((item) => {
                  const active =
                    pathname === item.href || pathname.startsWith(item.href + "/");
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "group relative flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[12.5px] transition-colors",
                          active
                            ? "text-foreground"
                            : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
                        )}
                      >
                        {active && (
                          <motion.span
                            layoutId="sidebar-active"
                            className="absolute inset-0 rounded-md bg-sidebar-accent shadow-[inset_0_0_0_1px_oklch(1_0_0/0.05)]"
                            transition={{ type: "spring", stiffness: 500, damping: 40 }}
                          />
                        )}
                        <Icon
                          className={cn(
                            "relative z-10 h-3.5 w-3.5 shrink-0",
                            active ? "text-primary" : "text-muted-foreground/80"
                          )}
                        />
                        <span className="relative z-10 truncate">{item.label}</span>
                        {item.badge && (
                          <Badge variant="primary" size="sm" className="relative z-10 ml-auto">
                            <span className="pulse-dot inline-block h-1 w-1 rounded-full bg-current" />
                            {item.badge}
                          </Badge>
                        )}
                      </Link>
                    </li>
                  );
                })}
          </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="rounded-lg border border-sidebar-border bg-gradient-to-br from-[oklch(0.22_0.04_264)] to-[oklch(0.18_0.02_252)] p-3">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-primary/15 text-primary">
              <Plus className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="text-[12px] font-medium">Quick ingest</div>
              <div className="text-[10px] text-muted-foreground">
                ⌘ + I to drop files
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
