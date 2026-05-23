"use client";

import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Files,
  Lock,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { KpiCard } from "@/components/shared/kpi-card";
import { AreaSeriesChart } from "@/components/charts/area-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { ComplianceBars } from "@/components/charts/bar-chart";
import { RiskHeatmap } from "@/components/charts/heatmap";
import { FileRow } from "@/components/shared/file-row";
import {
  auditEvents,
  complianceCoverage,
  files,
  ingestSeries,
  riskHeatmap,
  sensitivityDistribution,
  threatFeed,
} from "@/lib/data";
import { formatNumber } from "@/lib/utils";
import { TimeAgo } from "@/components/shared/time-ago";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Files governed"
          value="412.8K"
          delta={3.2}
          icon={Files}
          accent="primary"
          trend={ingestSeries.map((d) => d.uploads)}
          hint="+12,481 vs last week"
        />
        <KpiCard
          label="Encryption coverage"
          value="74%"
          delta={2.4}
          icon={Lock}
          accent="success"
          trend={ingestSeries.map((d) => d.encrypted)}
          hint="Target: 90% by Q3"
        />
        <KpiCard
          label="Sensitive exposure"
          value="412"
          delta={-18.6}
          icon={AlertTriangle}
          accent="warning"
          trend={[34, 41, 39, 28, 26, 22, 18, 17, 19, 14, 12, 9]}
          hint="files outside vault"
        />
        <KpiCard
          label="Compliance score"
          value="92"
          delta={0.8}
          deltaSuffix="pts"
          icon={ShieldCheck}
          accent="info"
          trend={[80, 82, 85, 86, 88, 88, 90, 91, 91, 92]}
          hint="Composite across 6 frameworks"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                Ingestion & Protection
              </CardTitle>
              <CardDescription>
                Files uploaded, encrypted, and policy-blocked over the last 30 days
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <LegendDot color="oklch(0.72 0.18 264)" label="Uploads" />
              <LegendDot color="oklch(0.78 0.17 158)" label="Encrypted" />
              <LegendDot color="oklch(0.78 0.22 22)" label="Blocked" />
            </div>
          </CardHeader>
          <CardContent>
            <AreaSeriesChart
              data={ingestSeries}
              xKey="day"
              series={[
                { key: "uploads", label: "Uploads", color: "oklch(0.72 0.18 264)" },
                { key: "encrypted", label: "Encrypted", color: "oklch(0.78 0.17 158)" },
                { key: "blocked", label: "Blocked", color: "oklch(0.78 0.22 22)" },
              ]}
              height={264}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sensitivity Mix</CardTitle>
            <CardDescription>Distribution across the corpus</CardDescription>
          </CardHeader>
          <CardContent>
            <DonutChart
              data={sensitivityDistribution}
              colors={[
                "oklch(0.4 0.012 250)",
                "oklch(0.74 0.14 232)",
                "oklch(0.86 0.16 78)",
                "oklch(0.78 0.22 22)",
              ]}
              centerValue="11.97K"
              centerLabel="Total"
              height={220}
            />
            <div className="mt-3 grid grid-cols-2 gap-1.5 text-[11px]">
              {sensitivityDistribution.map((s, i) => {
                const colors = [
                  "oklch(0.6 0.012 250)",
                  "oklch(0.74 0.14 232)",
                  "oklch(0.86 0.16 78)",
                  "oklch(0.78 0.22 22)",
                ];
                return (
                  <div
                    key={s.name}
                    className="flex items-center justify-between rounded-md border border-border/60 bg-background/30 px-2 py-1"
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: colors[i] }}
                      />
                      <span className="text-muted-foreground">{s.name}</span>
                    </div>
                    <span className="tabular text-foreground">
                      {formatNumber(s.value)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 text-[color:oklch(0.78_0.22_22)]" />
                Risk Heatmap
              </CardTitle>
              <CardDescription>
                Anomaly score by hour, last 7 days. Synthesized from access patterns and policy hits.
              </CardDescription>
            </div>
            <Badge variant="warning">2 active anomalies</Badge>
          </CardHeader>
          <CardContent>
            <RiskHeatmap data={riskHeatmap} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-[color:oklch(0.78_0.17_158)]" />
              Framework Coverage
            </CardTitle>
            <CardDescription>Continuous control monitoring</CardDescription>
          </CardHeader>
          <CardContent>
            <ComplianceBars
              data={complianceCoverage.map((c) => ({
                name: c.framework,
                value: c.coverage,
              }))}
              height={232}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Recent AI Activity
              </CardTitle>
              <CardDescription>
                Latest files renamed, scored, and routed by the AEGIS engine
              </CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/files">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="divide-y divide-border/60">
              {files.slice(0, 6).map((f, i) => (
                <FileRow key={f.id} file={f} index={i} />
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-[color:oklch(0.78_0.22_22)]" />
                  Threat Feed
                </CardTitle>
                <CardDescription>Live anomalies & blocked attempts</CardDescription>
              </div>
              <span className="pulse-dot inline-flex h-1.5 w-1.5 rounded-full bg-[color:oklch(0.78_0.22_22)]" />
            </CardHeader>
            <CardContent className="space-y-2">
              {threatFeed.map((t, i) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-3 rounded-lg border border-border/70 bg-background/30 p-2.5"
                >
                  <div
                    className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{
                      background:
                        t.severity === "critical"
                          ? "oklch(0.78 0.22 22)"
                          : t.severity === "high"
                          ? "oklch(0.86 0.16 78)"
                          : t.severity === "medium"
                          ? "oklch(0.74 0.14 232)"
                          : "oklch(0.6 0.012 250)",
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-[12px] font-medium text-foreground">
                        {t.title}
                      </div>
                      <TimeAgo
                        date={t.time}
                        className="shrink-0 text-[10px] text-muted-foreground"
                      />
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {t.detail}
                    </div>
                  </div>
                </motion.div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Audit</CardTitle>
              <CardDescription>Hash-chained, immutable</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {auditEvents.slice(0, 5).map((e, i) => (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, x: 4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="group flex items-center gap-2.5"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[9px]">
                      {e.actor
                        .split(" ")
                        .map((p) => p[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px]">
                      <span className="text-foreground">{e.actor}</span>{" "}
                      <span className="text-muted-foreground">{e.action}</span>
                    </div>
                    <div className="truncate text-[10.5px] text-muted-foreground/80 font-mono">
                      {e.hash}
                    </div>
                  </div>
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
                </motion.div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Encryption Posture</CardTitle>
              <CardDescription>Coverage by sensitivity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { name: "Restricted", target: 100, current: 100, accent: "oklch(0.78 0.17 158)" },
                { name: "Confidential", target: 100, current: 92, accent: "oklch(0.78 0.17 158)" },
                { name: "Internal", target: 80, current: 64, accent: "oklch(0.86 0.16 78)" },
                { name: "Public", target: 0, current: 8, accent: "oklch(0.6 0.012 250)" },
              ].map((row) => (
                <div key={row.name}>
                  <div className="flex items-center justify-between text-[11.5px]">
                    <span className="text-muted-foreground">{row.name}</span>
                    <span className="tabular text-foreground">{row.current}%</span>
                  </div>
                  <Progress value={row.current} className="mt-1.5" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}
