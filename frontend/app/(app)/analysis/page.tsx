"use client";

import { useEffect, useMemo, useState } from "react";
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
  Lock,
  Loader2,
  TriangleAlert,
  RefreshCcw,
  Info,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { SensitivityPill } from "@/components/shared/sensitivity-pill";
import { EncryptionBadge } from "@/components/shared/encryption-badge";
import { files as mockFiles } from "@/lib/data";
import type { DetectedEntity, JobManifest } from "@/lib/types";
import { formatBytes, cn } from "@/lib/utils";
import { useBackendStatus } from "@/lib/backend-status";
import { flattenManifest, getManifest } from "@/lib/api";

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
  const { mode } = useBackendStatus();
  const isLive = mode === "live";

  if (isLive) return <LiveAnalysis />;
  return <MockAnalysis />;
}

/* ============================================================
 * LIVE MODE — backed by job manifest
 * ============================================================ */

function LiveAnalysis() {
  const [manifest, setManifest] = useState<JobManifest | null>(null);
  const [manifestPath, setManifestPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    const res = await getManifest();
    if (res) {
      setManifest(res.manifest);
      setManifestPath(res.path);
    } else {
      setManifest(null);
      setError("No manifest yet. Run a job from the Upload Center.");
    }
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const rows = useMemo(() => (manifest ? flattenManifest(manifest) : []), [manifest]);
  const [activeId, setActiveId] = useState<string | null>(null);
  useEffect(() => {
    if (rows.length > 0 && !rows.find((r) => r.id === activeId)) {
      setActiveId(rows[0].id);
    }
  }, [rows, activeId]);

  if (loading && !manifest) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-[13px] text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading manifest…
      </div>
    );
  }
  if (error || !manifest || rows.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-20 text-center text-muted-foreground">
          <TriangleAlert className="h-5 w-5 text-[color:oklch(0.9_0.15_78)]" />
          <div className="text-[13px] font-medium text-foreground">
            {error ?? "Manifest empty"}
          </div>
          <div className="text-[11.5px]">
            Run the rename pipeline from the Upload Center to populate the manifest.
          </div>
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCcw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const active = rows.find((r) => r.id === activeId) ?? rows[0];

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]">
      {/* Sidebar: real renamed files */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Renamed files</CardTitle>
            <CardDescription>
              From job {manifest.job_id.slice(0, 8)}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="success" size="sm">live</Badge>
            <Button variant="ghost" size="icon" onClick={refresh} aria-label="Refresh">
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCcw className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <ul className="max-h-[70vh] divide-y divide-border/60 overflow-y-auto">
            {rows.map((f) => (
              <li key={f.id}>
                <button
                  onClick={() => setActiveId(f.id)}
                  className={cn(
                    "group flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/[0.025]",
                    f.id === active.id && "bg-white/[0.04]"
                  )}
                >
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border bg-background/40">
                    {f.encrypted ? (
                      <Lock className="h-3 w-3 text-[color:oklch(0.84_0.15_158)]" />
                    ) : (
                      <FileText className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] font-medium">
                      {f.renamed}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <Badge variant="outline" size="sm">
                        {f.docType || "DOC"}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground tabular">
                        {f.yearQuarter || "—"}
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

      {/* Right column */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="gap-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <CardTitle className="truncate">{active.renamed}</CardTitle>
                </div>
                <div className="mt-1 truncate text-[11px] text-muted-foreground">
                  Originally{" "}
                  <span className="line-through opacity-60">{active.original}</span>{" "}
                  · renamed by AEGIS
                </div>
              </div>
              <div className="flex items-center gap-2">
                {active.encrypted ? (
                  <Badge variant="success" size="sm">
                    <Lock className="h-2.5 w-2.5" />
                    AES-256-GCM
                  </Badge>
                ) : active.archive?.archive_path ? (
                  <Badge variant="info" size="sm">archive</Badge>
                ) : (
                  <Badge variant="muted" size="sm">renamed</Badge>
                )}
              </div>
            </div>
            <Separator />
            <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
              <span>
                <span className="text-foreground">{active.ticker || "—"}</span> · ticker
              </span>
              <span>·</span>
              <span>{active.publisher || "—"}</span>
              <span>·</span>
              <span className="capitalize">{active.docType?.toLowerCase() || "—"}</span>
              <span>·</span>
              <span>{active.publicationDate || "—"}</span>
              <span>·</span>
              <span className="font-mono text-muted-foreground/80 truncate">
                {active.archive?.checksum_sha256?.slice(0, 16) || "—"}
              </span>
            </div>
            {manifestPath && (
              <div className="text-[10.5px] text-muted-foreground">
                Source manifest:{" "}
                <code className="font-mono">{manifestPath}</code>
              </div>
            )}
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Archive integrity</CardTitle>
              <CardDescription>From the rename pipeline</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-[11.5px]">
              <KeyValue label="Status" value={active.archive?.status ?? "—"} />
              <KeyValue
                label="Compression"
                value={
                  active.archive?.compression_level !== undefined
                    ? `level ${active.archive.compression_level}`
                    : "—"
                }
              />
              <KeyValue
                label="Encryption"
                value={active.archive?.encryption_algorithm ?? "none"}
                tone={active.encrypted ? "success" : "muted"}
              />
              <KeyValue
                label="Archive sha256"
                value={active.archive?.checksum_sha256?.slice(0, 24) ?? "—"}
                mono
              />
              {active.archive?.encrypted_checksum_sha256 && (
                <KeyValue
                  label="Encrypted sha256"
                  value={active.archive.encrypted_checksum_sha256.slice(0, 24)}
                  mono
                />
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle>Detected entities</CardTitle>
                <CardDescription>
                  Multi-model NER + regex matchers
                </CardDescription>
              </div>
              <Badge variant="muted" size="sm">
                <Info className="h-2.5 w-2.5" /> not yet computed
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-3 rounded-md border border-border/60 bg-background/30 px-3 py-3 text-[12px] text-muted-foreground">
                <Info className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                <div>
                  The current Python pipeline performs renaming, grouping, and
                  archive encryption — but not entity-level PII / PHI detection.
                  This panel will populate once the AEGIS classifier service
                  is wired in.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Inferred metadata</CardTitle>
            <CardDescription>
              Parsed by the renamer&apos;s deterministic naming convention.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="fields">
              <TabsList>
                <TabsTrigger value="fields">Fields</TabsTrigger>
                <TabsTrigger value="reasoning">Reasoning</TabsTrigger>
                <TabsTrigger value="raw">Raw</TabsTrigger>
              </TabsList>
              <TabsContent value="fields">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <FieldCell label="Ticker" value={active.ticker || "—"} confidence={0.98} />
                  <FieldCell label="Publisher" value={active.publisher || "—"} confidence={0.95} />
                  <FieldCell label="Doc type" value={active.docType || "—"} confidence={0.92} />
                  <FieldCell label="Year / Quarter" value={active.yearQuarter || "—"} confidence={0.94} />
                  <FieldCell label="Language" value={active.language || "EN"} confidence={0.99} />
                  <FieldCell label="Publication date" value={active.publicationDate || "—"} confidence={0.88} />
                </div>
              </TabsContent>
              <TabsContent value="reasoning">
                <div className="space-y-2">
                  {[
                    {
                      step: "Filename parse",
                      detail: `Convention applied: TICKER_PUBLISHER_DOCTYPE_YEARQUARTER_LANG_DATE — yielded ${active.renamed.split("_").length} fields.`,
                    },
                    {
                      step: "Group assignment",
                      detail: `Routed to Quickfinder group ${active.group}.`,
                    },
                    {
                      step: "Archive policy",
                      detail: active.archive?.archive_path
                        ? `Bundled into ${active.archive.archive_path.split("/").pop()}`
                        : "Did not archive (archive option not enabled).",
                    },
                    {
                      step: "Encryption",
                      detail: active.encrypted
                        ? `Sealed with ${active.archive?.encryption_algorithm ?? "AES-256-GCM"}.`
                        : "Plaintext — encryption not requested.",
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
              <TabsContent value="raw">
                <pre className="max-h-72 overflow-auto rounded-md border border-border bg-background/60 px-3 py-2 text-[10.5px] font-mono text-muted-foreground">
{JSON.stringify(
  {
    original: active.original,
    renamed: active.renamed,
    new_path: active.new_path,
    group: active.group,
    parsed: {
      ticker: active.ticker,
      publisher: active.publisher,
      docType: active.docType,
      yearQuarter: active.yearQuarter,
      language: active.language,
      publicationDate: active.publicationDate,
    },
    archive: active.archive,
  },
  null,
  2
)}
                </pre>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KeyValue({
  label,
  value,
  mono,
  tone = "default",
}: {
  label: string;
  value: string;
  mono?: boolean;
  tone?: "default" | "success" | "muted";
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "truncate text-[12px]",
          mono && "font-mono",
          tone === "success" && "text-[color:oklch(0.84_0.15_158)]",
          tone === "muted" && "text-muted-foreground"
        )}
      >
        {value}
      </span>
    </div>
  );
}

/* ============================================================
 * MOCK MODE — original demo experience
 * ============================================================ */

function MockAnalysis() {
  const sorted = useMemo(
    () => [...mockFiles].sort((a, b) => b.sensitivityScore - a.sensitivityScore),
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
          <Badge variant="primary">{mockFiles.length}</Badge>
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
                    · renamed by AEGIS
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
              <span>
                <span className="text-foreground">{active.uploadedBy}</span> · uploader
              </span>
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
                <ScoreRow
                  label="PII / PHI density"
                  value={Math.min(100, active.sensitivityScore + 5)}
                />
                <ScoreRow
                  label="Financial signals"
                  value={Math.max(0, active.sensitivityScore - 14)}
                />
                <ScoreRow
                  label="Regulatory match"
                  value={Math.max(0, active.sensitivityScore - 4)}
                />
                <ScoreRow
                  label="Behavioral context"
                  value={Math.max(0, active.sensitivityScore - 22)}
                />
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
              The AEGIS LLM extracts and normalizes structured fields with confidence.
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
                  <FieldCell label="Publisher" value={active.publisher ?? "—"} confidence={0.96} />
                  <FieldCell label="Report type" value={active.reportType ?? "—"} confidence={0.91} />
                  <FieldCell label="Year / Quarter" value={active.yearQuarter ?? "—"} confidence={0.94} />
                  <FieldCell label="Publication date" value={active.publicationDate ?? "—"} confidence={0.88} />
                  <FieldCell label="Language" value="EN" confidence={0.99} />
                </div>
              </TabsContent>
              <TabsContent value="reasoning">
                <div className="space-y-2">
                  {[
                    { step: "Filename signal", detail: "Token 'Q3' near 'investor' → period candidate 2024Q3." },
                    { step: "Content evidence", detail: "First 1024 tokens contain 'Amazon.com, Inc.', AMZN ticker, fiscal Q3 references." },
                    { step: "Cross-validation", detail: "Folder structure {AMAZON}/new/* corroborates publisher AMAZON." },
                    { step: "Date resolution", detail: "Footer date 'September 12, 2024' selected over filename '2024-Q3'." },
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
                { t: "Encrypt with AES-256", d: "Sensitivity ≥ 60 — auto-applied by policy 'SSN Auto-Encrypt'.", applied: true },
                { t: "Route to Vault (us-east-1)", d: "Default backend for confidential & restricted.", applied: true },
                { t: "Watermark external shares", d: "Enforce per-viewer watermark on any future link.", applied: true },
                { t: "Notify Compliance Officer", d: "Helen Cho will receive a digest tomorrow at 09:00.", applied: false },
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
                    <Button variant="outline" size="xs">Enable</Button>
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

/* ---------- shared atoms ---------- */

function ScoreRing({
  score,
  size = 36,
  thick = false,
}: {
  score: number;
  size?: number;
  thick?: boolean;
}) {
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
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="oklch(1 0 0 / 0.06)" strokeWidth={thick ? 8 : 3} fill="none" />
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
              ? "text-[color:oklch(0.86_0.13_264)]"
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
