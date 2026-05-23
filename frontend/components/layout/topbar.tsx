"use client";

import { usePathname } from "next/navigation";
import { Bell, Search, Command, ShieldCheck } from "lucide-react";
import { pageMeta } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export function Topbar({ onCommand }: { onCommand: () => void }) {
  const pathname = usePathname();
  const meta = pageMeta[pathname] ?? pageMeta["/dashboard"];

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/70 bg-background/85 px-4 backdrop-blur-md md:px-6">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h1 className="truncate text-[15px] font-semibold tracking-tight text-foreground">
            {meta.title}
          </h1>
          <Badge variant="success" size="sm" className="ml-1">
            <span className="pulse-dot inline-block h-1 w-1 rounded-full bg-current" />
            Live
          </Badge>
        </div>
        <p className="truncate text-[11.5px] text-muted-foreground">
          {meta.description}
        </p>
      </div>

      <button
        type="button"
        onClick={onCommand}
        className="hidden md:flex items-center gap-2 rounded-md border border-border bg-card/40 px-2.5 py-1.5 text-[12px] text-muted-foreground transition-colors hover:bg-card/80 hover:text-foreground"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Search files, policies, audit…</span>
        <kbd className="ml-2 inline-flex items-center gap-0.5 rounded border border-border bg-background/60 px-1 py-0.5 text-[10px] tracking-wider text-muted-foreground">
          <Command className="h-2.5 w-2.5" /> K
        </kbd>
      </button>

      <Button variant="glass" size="sm" className="hidden md:inline-flex">
        <ShieldCheck className="text-success" />
        <span className="text-[12px]">Posture: 92</span>
      </Button>

      <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
        <Bell className="h-4 w-4" />
        <span className="absolute right-2 top-2 grid h-3.5 w-3.5 place-items-center rounded-full bg-[oklch(0.7_0.22_22)] text-[8px] font-bold text-white">
          3
        </span>
      </Button>

      <Avatar className="h-7 w-7">
        <AvatarFallback>MP</AvatarFallback>
      </Avatar>
    </header>
  );
}
