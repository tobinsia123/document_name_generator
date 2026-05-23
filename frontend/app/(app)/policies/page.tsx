"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  ChevronRight,
  GitBranch,
  Plus,
  Sparkles,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { policies } from "@/lib/data";
import { cn } from "@/lib/utils";
import { TimeAgo } from "@/components/shared/time-ago";

const sevColor: Record<string, string> = {
  low: "oklch(0.6 0.012 250)",
  medium: "oklch(0.74 0.14 232)",
  high: "oklch(0.86 0.16 78)",
  critical: "oklch(0.78 0.22 22)",
};

export default function PoliciesPage() {
  const [activeId, setActiveId] = useState(policies[0].id);
  const [enabledMap, setEnabledMap] = useState<Record<string, boolean>>(
    Object.fromEntries(policies.map((p) => [p.id, p.enabled]))
  );
  const active = policies.find((p) => p.id === activeId)!;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_440px]">
      <div className="space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-3.5 w-3.5 text-primary" />
                Active policies
              </CardTitle>
              <CardDescription>
                Declarative rules evaluated at every action.
              </CardDescription>
            </div>
            <Button>
              <Plus className="h-3.5 w-3.5" /> New policy
            </Button>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="divide-y divide-border/60">
              {policies.map((p, i) => (
                <motion.div
                  key={p.id}
                  onClick={() => setActiveId(p.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setActiveId(p.id);
                  }}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className={cn(
                    "group flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.025]",
                    p.id === activeId && "bg-white/[0.04]"
                  )}
                >
                  <div
                    className="mt-1 h-2 w-2 shrink-0 rounded-full"
                    style={{ background: sevColor[p.severity] }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium">{p.name}</span>
                      <Badge variant="outline" size="sm" className="capitalize">
                        {p.severity}
                      </Badge>
                      {p.framework.map((f) => (
                        <Badge key={f} variant="muted" size="sm">
                          {f}
                        </Badge>
                      ))}
                    </div>
                    <div className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
                      {p.description}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[10.5px]">
                      <code className="rounded bg-secondary/60 px-1.5 py-0.5">
                        WHEN {p.trigger}
                      </code>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <code className="rounded bg-secondary/60 px-1.5 py-0.5">
                        DO {p.action}
                      </code>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Switch
                      checked={enabledMap[p.id]}
                      onCheckedChange={(v) =>
                        setEnabledMap((m) => ({ ...m, [p.id]: v }))
                      }
                    />
                    <div className="text-[10px] tabular text-muted-foreground">
                      {p.hits.toLocaleString()} hits
                    </div>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            {active.name}
          </CardTitle>
          <CardDescription>{active.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Rule
            </div>
            <pre className="mt-1.5 overflow-auto rounded-lg border border-border bg-background/50 p-3 text-[11.5px] leading-relaxed">
              <code className="font-mono text-foreground/90">
{`policy "${active.name}" {
  when ${active.trigger}
  do   ${active.action}
  on_violation = "block"
  severity     = "${active.severity}"
  frameworks   = [${active.framework.map((f) => `"${f}"`).join(", ")}]
  evaluate_at  = ["ingest", "egress", "share"]
}`}
              </code>
            </pre>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-3 text-[11.5px]">
            <Stat label="Lifetime hits" value={active.hits.toLocaleString()} icon={Zap} />
            <StatTime
              label="Last triggered"
              date={active.lastTriggered}
              icon={AlertCircle}
            />
          </div>

          <Separator />

          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Recent matches
            </div>
            <div className="mt-2 space-y-1.5">
              {[
                "patient_records_export.csv",
                "wire_routing_payments.xlsx",
                "vendor_msa_morgan_stanley.docx",
              ].map((f, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-md border border-border/60 bg-background/30 px-2.5 py-1.5"
                >
                  <span className="truncate text-[12px] font-mono">{f}</span>
                  <Badge variant="success" size="sm">
                    enforced
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button className="flex-1">Edit rule</Button>
            <Button variant="outline" className="flex-1">
              Test policy
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Zap;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/30 p-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <Icon className="h-3 w-3 text-muted-foreground" />
      </div>
      <div className="mt-1 text-[14px] font-semibold tabular">{value}</div>
    </div>
  );
}

function StatTime({
  label,
  date,
  icon: Icon,
}: {
  label: string;
  date?: string;
  icon: typeof Zap;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/30 p-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <Icon className="h-3 w-3 text-muted-foreground" />
      </div>
      <div className="mt-1 text-[14px] font-semibold tabular">
        {date ? <TimeAgo date={date} /> : "never"}
      </div>
    </div>
  );
}
