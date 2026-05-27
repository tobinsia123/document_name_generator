"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  FileText,
  Mail,
  CreditCard,
  Phone,
  KeyRound,
  Hash,
  IdCard,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { SensitivityPill } from "@/components/shared/sensitivity-pill";
import { EncryptionBadge } from "@/components/shared/encryption-badge";
import { files } from "@/lib/data";
import type { DetectedEntity } from "@/lib/types";
import { formatBytes, cn } from "@/lib/utils";

const entityIconMap: Record<DetectedEntity["type"], typeof Mail> = {
  EMAIL: Mail,
  PHONE: Phone,
  SSN: IdCard,
  EIN: Hash,
  CREDIT_CARD: CreditCard,
  PASSPORT: IdCard,
  BANK_ACCOUNT: CreditCard,
  ROUTING: CreditCard,
  MRN: IdCard,
  PHI: IdCard,
  API_KEY: KeyRound,
};

export default function AnalysisPage() {
  const sorted = useMemo(
    () => [...files].sort((a, b) => b.sensitivityScore - a.sensitivityScore),
    []
  );
  const [activeId, setActiveId] = useState(sorted[0].id);
  const active = sorted.find((f) => f.id === activeId)!;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]">
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent files</CardTitle>
            <CardDescription>Sorted by sensitivity</CardDescription>
          </div>
          <Badge variant="primary">{files.length}</Badge>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <ul className="divide-y divide-border/60">
            {sorted.map((f) => (
              <li key={f.id}>
                <button
                  onClick={() => setActiveId(f.id)}
                  className={cn(
                    "group flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/[0.025]",
                    f.id === activeId && "bg-white/[0.04]"
                  )}
                >
                  <ScoreRing score={f.sensitivityScore} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] font-medium">
                      {f.renamedTo ?? f.originalName}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <SensitivityPill level={f.sensitivity} />
                      <span className="text-[10px] text-muted-foreground">
                        {formatBytes(f.size)}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader className="gap-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <CardTitle className="truncate">
                    {active.renamedTo ?? active.originalName}
                  </CardTitle>
                </div>
                {active.renamedTo && active.originalName !== active.renamedTo && (
                  <div className="mt-1 truncate text-[11px] text-muted-foreground">
                    Originally{" "}
                    <span className="line-through opacity-60">{active.originalName}</span>{" "}
                    · renamed by Project Z
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <SensitivityPill level={active.sensitivity} />
                <EncryptionBadge state={active.encryption} />
              </div>
            </div>
            <Separator />
            <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
              <span><span className="text-foreground">{active.uploadedBy}</span> · uploader</span>
              <span>·</span>
              <span>{formatBytes(active.size)}</span>
              <span>·</span>
              <span className="font-mono text-muted-foreground/80">{active.hash}</span>
              <span>·</span>
              <span className="capitalize">{active.storage}</span>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Sensitivity score</CardTitle>
              <CardDescription>Composite of content + context</CardDescription>
            </CardHeader>
            <CardContent>
              <ScoreRing score={active.sensitivityScore} size={104} thick />
              <div className="mt-3 space-y-1.5 text-[11px]">
                <ScoreRow label="PII / PHI density" value={Math.min(100, active.sensitivityScore + 5)} />
                <ScoreRow label="Financial signals" value={Math.max(0, active.sensitivityScore - 14)} />
                <ScoreRow label="Regulatory match" value={Math.max(0, active.sensitivityScore - 4)} />
                <ScoreRow label="Behavioral context" value={Math.max(0, active.sensitivityScore - 22)} />
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Detected entities</CardTitle>
              <CardDescription>
                Multi-model NER + regex + lexicon matchers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {active.entities.length === 0 ? (
                <div className="flex items-center gap-2 rounded-md border border-border/60 bg-background/30 px-3 py-3 text-[12px] text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[color:oklch(0.78_0.17_158)]" />
                  No regulated entities detected.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {active.entities.map((e) => {
                    const Icon = entityIconMap[e.type] ?? Hash;
                    return (
                      <motion.div
                        key={e.type}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between rounded-lg border border-border/70 bg-background/30 p-2.5"
                      >
                        <div className="flex items-center gap-2">
                          <div className="grid h-7 w-7 place-items-center rounded-md bg-[color:oklch(0.7_0.22_22/0.12)] text-[color:oklch(0.85_0.18_22)]">
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <div className="text-[11.5px] font-medium">{e.type}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {e.count} instance{e.count > 1 ? "s" : ""}
                            </div>
                          </div>
                        </div>
                        <CircleDot className="h-3 w-3 text-[color:oklch(0.78_0.22_22)] pulse-dot" />
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Inferred metadata</CardTitle>
            <CardDescription>
              Project Z extracts and normalizes structured fields with confidence.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="fields">
              <TabsList>
                <TabsTrigger value="fields">Fields</TabsTrigger>
                <TabsTrigger value="reasoning">Reasoning</TabsTrigger>
                <TabsTrigger value="snippets">Snippets</TabsTrigger>
              </TabsList>
              <TabsContent value="fields">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <FieldCell label="Ticker" value={active.ticker ?? "—"} confidence={0.99} />
                  <FieldCell
                    label="Publisher"
                    value={active.publisher ?? "—"}
                    confidence={0.96}
                  />
                  <FieldCell
                    label="Report type"
                    value={active.reportType ?? "—"}
                    confidence={0.91}
                  />
                  <FieldCell
                    label="Year / Quarter"
                    value={active.yearQuarter ?? "—"}
                    confidence={0.94}
                  />
                  <FieldCell
                    label="Publication date"
                    value={active.publicationDate ?? "—"}
                    confidence={0.88}
                  />
                  <FieldCell label="Language" value="EN" confidence={0.99} />
                </div>
              </TabsContent>
              <TabsContent value="reasoning">
                <div className="space-y-2">
                  {[
                    {
                      step: "Filename signal",
                      detail: "Token 'Q3' near 'investor' → period candidate 2024Q3.",
                    },
                    {
                      step: "Content evidence",
                      detail: "First 1024 tokens contain 'Amazon.com, Inc.', AMZN ticker, fiscal Q3 references.",
                    },
                    {
                      step: "Cross-validation",
                      detail: "Folder structure {AMAZON}/new/* corroborates publisher AMAZON.",
                    },
                    {
                      step: "Date resolution",
                      detail: "Footer date 'September 12, 2024' selected over filename '2024-Q3'.",
                    },
                  ].map((s, i) => (
                    <motion.div
                      key={s.step}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-start gap-3 rounded-md border border-border/70 bg-background/30 p-2.5"
                    >
                      <div className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/15 text-[10px] font-medium tabular text-primary">
                        {i + 1}
                      </div>
                      <div>
                        <div className="text-[12px] font-medium">{s.step}</div>
                        <div className="text-[11px] text-muted-foreground">{s.detail}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="snippets">
                <div className="space-y-2">
                  {[
                    `…AMAZON.COM, INC. THIRD QUARTER ${active.yearQuarter?.slice(0, 4) ?? 2024}…`,
                    "…issued September 12, 2024 by the Office of Investor Relations…",
                    "…this presentation is intended for internal use and authorized analyst recipients…",
                  ].map((q, i) => (
                    <motion.blockquote
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="rounded-md border-l-2 border-primary/60 bg-background/30 p-2.5 text-[12px] italic text-muted-foreground"
                    >
                      {q}
                    </motion.blockquote>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-primary" />
              Recommended actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {[
                {
                  t: "Encrypt with AES-256",
                  d: "Sensitivity ≥ 60 — auto-applied by policy 'SSN Auto-Encrypt'.",
                  applied: true,
                },
                {
                  t: "Route to Vault (us-east-1)",
                  d: "Default backend for confidential & restricted.",
                  applied: true,
                },
                {
                  t: "Watermark external shares",
                  d: "Enforce per-viewer watermark on any future link.",
                  applied: true,
                },
                {
                  t: "Notify Compliance Officer",
                  d: "Helen Cho will receive a digest tomorrow at 09:00.",
                  applied: false,
                },
              ].map((a) => (
                <div
                  key={a.t}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border/70 bg-background/30 p-3"
                >
                  <div>
                    <div className="text-[12.5px] font-medium">{a.t}</div>
                    <div className="text-[11px] text-muted-foreground">{a.d}</div>
                  </div>
                  {a.applied ? (
                    <Badge variant="success" size="sm">
                      <CheckCircle2 className="h-2.5 w-2.5" /> Applied
                    </Badge>
                  ) : (
                    <Button variant="outline" size="xs">
                      Enable
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ScoreRing({ score, size = 36, thick = false }: { score: number; size?: number; thick?: boolean }) {
  const r = size / 2 - (thick ? 6 : 4);
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color =
    score >= 80
      ? "oklch(0.78 0.22 22)"
      : score >= 50
      ? "oklch(0.86 0.16 78)"
      : score >= 20
      ? "oklch(0.74 0.14 232)"
      : "oklch(0.78 0.17 158)";
  return (
    <div
      className="relative grid place-items-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="oklch(1 0 0 / 0.06)"
          strokeWidth={thick ? 8 : 3}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={thick ? 8 : 3}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div
        className={cn(
          "absolute inset-0 grid place-items-center font-semibold tabular",
          thick ? "text-2xl" : "text-[10.5px]"
        )}
        style={{ color }}
      >
        {score}
      </div>
    </div>
  );
}

function ScoreRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular text-foreground">{value}</span>
      </div>
      <Progress value={value} className="mt-1 h-1" />
    </div>
  );
}

function FieldCell({
  label,
  value,
  confidence,
}: {
  label: string;
  value: string;
  confidence: number;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/30 p-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-0.5 text-[10px] tabular",
            confidence >= 0.95
              ? "text-[color:oklch(0.84_0.15_158)]"
              : confidence >= 0.85
              ? "text-[color:rgb(0_200_83)]"
              : "text-[color:oklch(0.86_0.16_78)]"
          )}
        >
          {confidence >= 0.9 ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
          {(confidence * 100).toFixed(0)}%
        </span>
      </div>
      <div className="mt-1.5 truncate text-[13px] font-mono text-foreground">{value}</div>
    </div>
  );
}
