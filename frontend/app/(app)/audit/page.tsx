"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  ChevronRight,
  Download,
  Filter,
  Hash,
  Link2,
  Search,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { auditEvents } from "@/lib/data";
import { cn } from "@/lib/utils";
import { TimeAgo } from "@/components/shared/time-ago";

const outcomeFilters: ("all" | "success" | "denied" | "warning")[] = ["all", "success", "warning", "denied"];

export default function AuditPage() {
  const [q, setQ] = useState("");
  const [outcome, setOutcome] = useState<(typeof outcomeFilters)[number]>("all");

  const events = useMemo(
    () =>
      auditEvents.filter((e) => {
        const m =
          !q ||
          e.actor.toLowerCase().includes(q.toLowerCase()) ||
          e.action.toLowerCase().includes(q.toLowerCase()) ||
          e.resource.toLowerCase().includes(q.toLowerCase()) ||
          e.hash.toLowerCase().includes(q.toLowerCase());
        const o = outcome === "all" || e.outcome === outcome;
        return m && o;
      }),
    [q, outcome]
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <ChainStat label="Events / 24h" value="14,288" hint="+8% vs prior day" />
        <ChainStat label="Anchored on Arweave" value="100%" hint="last 90 days" />
        <ChainStat label="Hash chain integrity" value="VERIFIED" tone="success" hint="continuous merkle proof" />
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-3">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search actor, action, resource, hash…"
              className="pl-8"
            />
          </div>
          <div className="flex items-center gap-1 rounded-md border border-border bg-card/40 p-1">
            {outcomeFilters.map((o) => (
              <button
                key={o}
                onClick={() => setOutcome(o)}
                className={cn(
                  "rounded px-2 py-1 text-[11px] capitalize transition-colors",
                  o === outcome
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {o}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-3.5 w-3.5" /> Range: 24h
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-primary" />
            Hash-chained event log
          </CardTitle>
          <CardDescription>
            Every action is signed and chained to the previous event. Tampering breaks verification.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="space-y-0">
            {events.map((e, i) => (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                className="group relative grid grid-cols-[24px_1fr_auto] items-start gap-3 px-4 py-3 transition-colors hover:bg-white/[0.025]"
              >
                <div className="relative flex flex-col items-center">
                  <div
                    className={cn(
                      "z-10 grid h-5 w-5 place-items-center rounded-full border border-border bg-background",
                      e.outcome === "success" &&
                        "border-[color:oklch(0.78_0.17_158/0.5)] text-[color:oklch(0.84_0.15_158)]",
                      e.outcome === "denied" &&
                        "border-[color:oklch(0.78_0.22_22/0.5)] text-[color:oklch(0.85_0.18_22)]",
                      e.outcome === "warning" &&
                        "border-[color:oklch(0.86_0.16_78/0.5)] text-[color:oklch(0.9_0.15_78)]"
                    )}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  </div>
                  {i < events.length - 1 && (
                    <div className="absolute top-5 h-[calc(100%-12px)] w-px bg-border/60" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[8px]">
                        {e.actor
                          .split(" ")
                          .map((p) => p[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[12.5px] font-medium">{e.actor}</span>
                    <code className="rounded bg-secondary/60 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                      {e.action}
                    </code>
                    <span className="truncate text-[12.5px] text-muted-foreground">
                      {e.resource}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10.5px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1 font-mono">
                      <Hash className="h-3 w-3" /> {e.hash}
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono opacity-70">
                      <Link2 className="h-3 w-3" /> prev {e.prevHash}
                    </span>
                    <span>· {e.ip}</span>
                    {e.metadata &&
                      Object.entries(e.metadata).map(([k, v]) => (
                        <Badge key={k} variant="muted" size="sm">
                          {k}: {String(v)}
                        </Badge>
                      ))}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <Badge
                    variant={
                      e.outcome === "success"
                        ? "success"
                        : e.outcome === "denied"
                        ? "destructive"
                        : "warning"
                    }
                    size="sm"
                  >
                    {e.outcome}
                  </Badge>
                  <TimeAgo
                    date={e.timestamp}
                    className="text-[10.5px] text-muted-foreground tabular"
                  />
                  <ChevronRight className="h-3 w-3 text-muted-foreground/60 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ChainStat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "success";
}) {
  return (
    <div className="rounded-xl border border-border bg-card/80 p-4 backdrop-blur-sm">
      <div className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "mt-2 text-2xl font-semibold tabular tracking-tight",
          tone === "success" ? "text-[color:oklch(0.84_0.15_158)]" : "text-foreground"
        )}
      >
        {value}
      </div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
