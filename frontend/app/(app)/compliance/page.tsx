"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileCheck,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { complianceCoverage } from "@/lib/data";
import { cn } from "@/lib/utils";

const frameworks = [
  { code: "SOC2", full: "SOC 2 Type II", region: "Global" },
  { code: "HIPAA", full: "HIPAA / HITECH", region: "US" },
  { code: "GDPR", full: "GDPR", region: "EU" },
  { code: "ISO27001", full: "ISO/IEC 27001:2022", region: "Global" },
  { code: "PCI-DSS", full: "PCI-DSS v4.0", region: "Global" },
  { code: "FINRA", full: "FINRA / SEC Rule 17a-4", region: "US" },
];

const controls = [
  {
    id: "C-1.4",
    name: "Encryption at rest",
    framework: ["SOC2", "ISO27001", "HIPAA"],
    status: "passing",
    last: "12m",
    evidence: 412,
  },
  {
    id: "C-2.1",
    name: "Access reviews — quarterly",
    framework: ["SOC2", "ISO27001"],
    status: "passing",
    last: "2h",
    evidence: 7,
  },
  {
    id: "C-3.7",
    name: "PHI tokenization in transit",
    framework: ["HIPAA"],
    status: "warning",
    last: "1h",
    evidence: 88,
  },
  {
    id: "C-4.2",
    name: "DSAR fulfillment ≤ 30 days",
    framework: ["GDPR", "CCPA"],
    status: "passing",
    last: "6d",
    evidence: 4,
  },
  {
    id: "C-5.3",
    name: "Cardholder data segmentation",
    framework: ["PCI-DSS"],
    status: "failing",
    last: "26m",
    evidence: 1,
  },
  {
    id: "C-6.1",
    name: "Records retention (WORM)",
    framework: ["FINRA", "SOC2"],
    status: "passing",
    last: "11h",
    evidence: 8_402,
  },
  {
    id: "C-1.7",
    name: "Vendor risk attestations",
    framework: ["SOC2"],
    status: "warning",
    last: "3d",
    evidence: 24,
  },
  {
    id: "C-1.9",
    name: "Continuous vulnerability scan",
    framework: ["SOC2", "ISO27001", "PCI-DSS"],
    status: "passing",
    last: "31m",
    evidence: 1_240,
  },
];

export default function CompliancePage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
          <div>
            <div className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Overall posture
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-semibold tabular tracking-tight text-gradient-brand">
                92
              </span>
              <span className="text-[12px] text-[color:oklch(0.84_0.15_158)]">
                +0.8 pts vs last week
              </span>
            </div>
            <Progress value={92} className="mt-3 h-1.5" />
            <div className="mt-2 text-[11px] text-muted-foreground">
              Composite of 6 frameworks · 479 controls · 56 gaps
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Passing" value="423" tone="success" />
            <Stat label="Warning" value="42" tone="warning" />
            <Stat label="Failing" value="14" tone="destructive" />
          </div>
          <div className="flex flex-col items-end justify-between gap-3">
            <div className="text-right">
              <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
                Last DPIA
              </div>
              <div className="text-[12.5px] font-medium tabular">47 days ago</div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <FileCheck className="h-3.5 w-3.5" /> Export evidence
              </Button>
              <Button size="sm">
                <ShieldCheck className="h-3.5 w-3.5" /> Run audit
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {complianceCoverage.map((c, i) => (
          <motion.div
            key={c.framework}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <Card className="h-full">
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    {c.framework}
                  </CardTitle>
                  <CardDescription>
                    {c.controls} controls · {c.gaps} open gap{c.gaps === 1 ? "" : "s"}
                  </CardDescription>
                </div>
                <Badge
                  variant={
                    c.coverage >= 95 ? "success" : c.coverage >= 85 ? "primary" : "warning"
                  }
                >
                  {c.coverage}%
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Progress
                    value={c.coverage}
                    indicatorClassName={cn(
                      c.coverage >= 95 && "bg-[color:oklch(0.78_0.17_158)]",
                      c.coverage >= 85 && c.coverage < 95 && "bg-primary",
                      c.coverage < 85 && "bg-[color:oklch(0.86_0.16_78)]"
                    )}
                  />
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Evidence freshness</span>
                    <span className="text-foreground tabular">98%</span>
                  </div>
                </div>
                <div className="rounded-md border border-border/60 bg-background/30 p-2.5 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Auditor</span>
                    <span className="text-foreground">EY · J. Maddox</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-muted-foreground">Next review</span>
                    <span className="text-foreground tabular">in 18d</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="w-full justify-between">
                  Open framework
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Control inventory</CardTitle>
            <CardDescription>
              Continuous monitoring across {frameworks.length} frameworks
            </CardDescription>
          </div>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="passing">Passing</TabsTrigger>
              <TabsTrigger value="open">Open</TabsTrigger>
            </TabsList>
            <TabsContent value="all" />
          </Tabs>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="grid grid-cols-[60px_1fr_auto_auto_auto_auto] items-center gap-3 border-b border-border/60 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <div>ID</div>
            <div>Control</div>
            <div className="hidden md:block">Frameworks</div>
            <div className="hidden lg:block">Evidence</div>
            <div className="hidden lg:block">Last check</div>
            <div className="text-right">Status</div>
          </div>
          <div className="divide-y divide-border/60">
            {controls.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                className="grid grid-cols-[60px_1fr_auto_auto_auto_auto] items-center gap-3 px-4 py-2.5 text-[12.5px] hover:bg-white/[0.025]"
              >
                <div className="font-mono text-[11px] text-muted-foreground">{c.id}</div>
                <div className="font-medium">{c.name}</div>
                <div className="hidden md:flex flex-wrap gap-1">
                  {c.framework.map((f) => (
                    <Badge key={f} variant="outline" size="sm">
                      {f}
                    </Badge>
                  ))}
                </div>
                <div className="hidden lg:block tabular text-[11px] text-muted-foreground">
                  {c.evidence}
                </div>
                <div className="hidden lg:flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" /> {c.last}
                </div>
                <StatusBadge status={c.status} />
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "success" | "warning" | "destructive";
}) {
  const colors = {
    success: "from-[color:oklch(0.74_0.17_158/0.18)]",
    warning: "from-[color:oklch(0.82_0.17_78/0.18)]",
    destructive: "from-[color:oklch(0.7_0.22_22/0.18)]",
  };
  return (
    <div className="relative overflow-hidden rounded-lg border border-border/70 bg-background/40 p-3">
      <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent", colors[tone])} />
      <div className="relative">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-1 text-xl font-semibold tabular">{value}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "passing")
    return (
      <Badge variant="success" size="sm">
        <CheckCircle2 className="h-2.5 w-2.5" /> Passing
      </Badge>
    );
  if (status === "warning")
    return (
      <Badge variant="warning" size="sm">
        <AlertTriangle className="h-2.5 w-2.5" /> Warning
      </Badge>
    );
  return (
    <Badge variant="destructive" size="sm">
      <ArrowUpRight className="h-2.5 w-2.5" /> Failing
    </Badge>
  );
}
