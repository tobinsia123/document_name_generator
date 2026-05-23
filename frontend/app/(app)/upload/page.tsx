"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  CloudUpload,
  FileText,
  Lock,
  Sparkles,
  ShieldCheck,
  TriangleAlert,
  X,
  Zap,
  RotateCcw,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn, formatBytes } from "@/lib/utils";

type Stage = "queued" | "scanning" | "naming" | "policy" | "encrypted" | "stored" | "done" | "blocked";

interface UploadingFile {
  id: string;
  name: string;
  size: number;
  type: string;
  stage: Stage;
  progress: number;
  sensitivity: number;
  renamed?: string;
  blockedReason?: string;
}

const stageOrder: Stage[] = ["queued", "scanning", "naming", "policy", "encrypted", "stored", "done"];
const stageLabels: Record<Stage, string> = {
  queued: "Queued",
  scanning: "AI scanning content",
  naming: "Inferring metadata",
  policy: "Applying policies",
  encrypted: "Encrypting",
  stored: "Routing to storage",
  done: "Complete",
  blocked: "Policy blocked",
};

const seedFiles: { name: string; size: number; type: string; sens: number; blocked?: string; rename: string }[] = [
  {
    name: "10K_amazon_2024_FINAL_v3.pdf",
    size: 12_440_991,
    type: "application/pdf",
    sens: 18,
    rename: "AMZN_SEC_10-K_2024Q0_EN_2025-02-01.pdf",
  },
  {
    name: "morgan_stanley_msa_red.docx",
    size: 287_443,
    type: "doc",
    sens: 64,
    rename: "MS_LEGAL_MSA_2024Q4_EN_2024-11-08.docx",
  },
  {
    name: "patient_records_export.csv",
    size: 1_204_991,
    type: "csv",
    sens: 96,
    rename: "ACME_CLINIC_PHI_EXPORT_2025Q1_EN_2025-02-14.csv",
  },
  {
    name: "internal_keys.env",
    size: 4_122,
    type: "env",
    sens: 99,
    blocked: "Block-Plaintext-Secrets — 7 API keys detected",
    rename: "internal_keys.env",
  },
];

export default function UploadPage() {
  const [files, setFiles] = useState<UploadingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [autoEncrypt, setAutoEncrypt] = useState(true);
  const [archive, setArchive] = useState(false);
  const [enforce, setEnforce] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const startProcess = useCallback((newFiles: UploadingFile[]) => {
    setFiles((prev) => [...newFiles, ...prev]);
    newFiles.forEach((f) => {
      let p = 0;
      const interval = setInterval(() => {
        p = Math.min(100, p + 7 + Math.random() * 12);
        setFiles((prev) =>
          prev.map((x) => {
            if (x.id !== f.id) return x;
            const stage: Stage =
              x.stage === "queued" && p > 5
                ? "scanning"
                : x.stage === "scanning" && p > 25
                ? "naming"
                : x.stage === "naming" && p > 45
                ? "policy"
                : x.stage === "policy" && p > 60
                ? f.blockedReason
                  ? "blocked"
                  : autoEncrypt
                  ? "encrypted"
                  : "stored"
                : x.stage === "encrypted" && p > 80
                ? "stored"
                : x.stage === "stored" && p > 95
                ? "done"
                : x.stage;
            return { ...x, stage, progress: p };
          })
        );
        if (p >= 100) clearInterval(interval);
      }, 320);
    });
  }, [autoEncrypt]);

  const seedDemo = useCallback(() => {
    const newFiles: UploadingFile[] = seedFiles.map((s, i) => ({
      id: `up_${Date.now()}_${i}`,
      name: s.name,
      size: s.size,
      type: s.type,
      stage: "queued",
      progress: 0,
      sensitivity: s.sens,
      renamed: s.rename,
      blockedReason: s.blocked,
    }));
    startProcess(newFiles);
  }, [startProcess]);

  useEffect(() => {
    seedDemo();
  }, [seedDemo]);

  const handleFiles = (fl: FileList | null) => {
    if (!fl) return;
    const arr: UploadingFile[] = Array.from(fl).map((f, i) => ({
      id: `up_${Date.now()}_${i}`,
      name: f.name,
      size: f.size,
      type: f.type,
      stage: "queued",
      progress: 0,
      sensitivity: Math.floor(Math.random() * 100),
      renamed: f.name.replace(/\.[^.]+$/, "") + "_renamed.pdf",
    }));
    startProcess(arr);
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
      <div className="space-y-4">
        <Card>
          <CardContent className="p-0">
            <motion.div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFiles(e.dataTransfer.files);
              }}
              className={cn(
                "relative flex flex-col items-center justify-center px-6 py-14 transition-colors",
                isDragging
                  ? "bg-[color:oklch(0.72_0.16_264/0.08)]"
                  : "bg-transparent"
              )}
            >
              <div className="pointer-events-none absolute inset-0 bg-grid opacity-60" />
              <div
                className={cn(
                  "relative grid h-16 w-16 place-items-center rounded-2xl border border-border/80 bg-card/60 shadow-[0_0_0_1px_oklch(1_0_0/0.06)_inset]",
                  isDragging && "ring-glow"
                )}
              >
                <CloudUpload className="h-7 w-7 text-primary" />
              </div>
              <div className="relative mt-4 text-center">
                <h3 className="text-base font-semibold tracking-tight">
                  Drop files to ingest into AEGIS
                </h3>
                <p className="mt-1 max-w-md text-[12.5px] text-muted-foreground">
                  AI scans content, infers metadata, applies policies, encrypts when required,
                  and routes to the correct storage tier. Up to 5 GB per file.
                </p>
              </div>
              <div className="relative mt-4 flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
                <Button onClick={() => inputRef.current?.click()}>
                  <CloudUpload className="h-3.5 w-3.5" />
                  Select files
                </Button>
                <Button variant="outline" onClick={seedDemo}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Replay demo batch
                </Button>
              </div>
              <div className="relative mt-5 flex flex-wrap items-center justify-center gap-2 text-[10.5px] text-muted-foreground">
                <Badge variant="muted" size="sm">PDF</Badge>
                <Badge variant="muted" size="sm">DOCX</Badge>
                <Badge variant="muted" size="sm">XLSX</Badge>
                <Badge variant="muted" size="sm">CSV</Badge>
                <Badge variant="muted" size="sm">PPTX</Badge>
                <Badge variant="muted" size="sm">TXT</Badge>
                <Badge variant="muted" size="sm">PNG / JPG</Badge>
                <Badge variant="muted" size="sm">+ 28 more</Badge>
              </div>
            </motion.div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Processing queue</CardTitle>
              <CardDescription>
                {files.filter((f) => f.stage !== "done" && f.stage !== "blocked").length}{" "}
                in progress · {files.filter((f) => f.stage === "done").length} done
              </CardDescription>
            </div>
            {files.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFiles([])}
                className="text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" /> Clear
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            <AnimatePresence initial={false}>
              {files.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="rounded-lg border border-dashed border-border/60 px-4 py-6 text-center text-[12px] text-muted-foreground"
                >
                  No active uploads. Drop a file above or click Select files.
                </motion.div>
              )}
              {files.map((f) => (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className={cn(
                    "rounded-lg border bg-background/30 p-3 transition-colors",
                    f.stage === "blocked"
                      ? "border-[color:oklch(0.7_0.22_22/0.4)] bg-[color:oklch(0.7_0.22_22/0.05)]"
                      : "border-border/70"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 grid h-7 w-7 place-items-center rounded-md border border-border bg-background/40">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-medium">
                            {f.stage === "done" ? f.renamed : f.name}
                          </div>
                          {f.stage === "done" && f.renamed !== f.name && (
                            <div className="mt-0.5 truncate text-[10.5px] text-muted-foreground">
                              <span className="line-through opacity-60">{f.name}</span>
                              <span className="mx-1.5 opacity-50">→</span>
                              <span className="text-[color:oklch(0.86_0.13_264)]">renamed</span>
                            </div>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-[10.5px] tabular text-muted-foreground">
                            {formatBytes(f.size)}
                          </span>
                          <StageBadge stage={f.stage} />
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-center gap-3">
                        <Progress
                          value={f.progress}
                          className="h-1"
                          indicatorClassName={
                            f.stage === "blocked"
                              ? "bg-[color:oklch(0.7_0.22_22)]"
                              : f.stage === "done"
                              ? "bg-[color:oklch(0.78_0.17_158)]"
                              : undefined
                          }
                        />
                        <span className="w-9 shrink-0 text-right text-[10.5px] tabular text-muted-foreground">
                          {Math.floor(f.progress)}%
                        </span>
                      </div>
                      {f.stage === "blocked" && f.blockedReason && (
                        <div className="mt-2 flex items-center gap-2 rounded-md border border-[color:oklch(0.7_0.22_22/0.3)] bg-[color:oklch(0.7_0.22_22/0.06)] px-2 py-1.5 text-[11px] text-[color:oklch(0.85_0.18_22)]">
                          <TriangleAlert className="h-3.5 w-3.5" />
                          {f.blockedReason}
                        </div>
                      )}
                      {f.stage !== "blocked" && f.stage !== "queued" && (
                        <StageStrip stage={f.stage} sensitivity={f.sensitivity} />
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-primary" />
              Pipeline configuration
            </CardTitle>
            <CardDescription>Applies to this batch only.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ToggleRow
              label="Auto-encrypt sensitive files"
              hint="Triggers AES-256 + KMS rotation when sensitivity ≥ 60 or matches PII rules."
              checked={autoEncrypt}
              onChange={setAutoEncrypt}
              icon={Lock}
            />
            <Separator />
            <ToggleRow
              label="Archive to immutable storage"
              hint="Replicates to Filecoin + Arweave with content-addressed proof."
              checked={archive}
              onChange={setArchive}
              icon={ShieldCheck}
            />
            <Separator />
            <ToggleRow
              label="Enforce active policies"
              hint="Block uploads that violate any enabled policy. Recommended."
              checked={enforce}
              onChange={setEnforce}
              icon={Sparkles}
            />
            <Separator />
            <div className="space-y-1.5">
              <Label>Naming template</Label>
              <code className="block rounded-md border border-border bg-background/60 px-2.5 py-2 text-[11px] font-mono text-muted-foreground">
                {"{ticker}_{publisher}_{report_type}_{year_quarter}_{lang}_{date}.{ext}"}
              </code>
              <div className="text-[10.5px] text-muted-foreground">
                Used by the AEGIS LLM to construct deterministic, regex-validatable filenames.
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What happens after upload</CardTitle>
            <CardDescription>Each file follows the same governed pipeline.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {[
                {
                  t: "Content extraction",
                  d: "OCR + parsers normalize PDFs, Office docs, CSVs, and images to text + metadata.",
                },
                {
                  t: "Sensitivity scoring",
                  d: "Multi-model classifier flags PII, PHI, financial records, secrets.",
                },
                {
                  t: "Metadata inference",
                  d: "LLM extracts ticker, publisher, type, period, date with confidence scores.",
                },
                {
                  t: "Policy evaluation",
                  d: "Declarative rules decide encryption, storage tier, retention, sharing.",
                },
                {
                  t: "Encryption + routing",
                  d: "Files are sealed and committed to the chosen backend with a hash receipt.",
                },
                {
                  t: "Audit commit",
                  d: "Action is appended to the immutable log and signed.",
                },
              ].map((s, i) => (
                <motion.li
                  key={s.t}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-start gap-3"
                >
                  <div className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-border bg-background/40 text-[10px] tabular text-muted-foreground">
                    {i + 1}
                  </div>
                  <div>
                    <div className="text-[12.5px] font-medium">{s.t}</div>
                    <div className="text-[11px] text-muted-foreground">{s.d}</div>
                  </div>
                </motion.li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
  icon: Icon,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  icon: typeof Lock;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-2">
        <div className="mt-0.5 grid h-7 w-7 place-items-center rounded-md border border-border bg-background/40 text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div>
          <div className="text-[12.5px] font-medium">{label}</div>
          <div className="text-[11px] text-muted-foreground max-w-xs">{hint}</div>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function StageBadge({ stage }: { stage: Stage }) {
  if (stage === "done")
    return (
      <Badge variant="success" size="sm">
        <CheckCircle2 className="h-2.5 w-2.5" />
        {stageLabels[stage]}
      </Badge>
    );
  if (stage === "blocked")
    return (
      <Badge variant="destructive" size="sm">
        <TriangleAlert className="h-2.5 w-2.5" />
        Blocked
      </Badge>
    );
  return (
    <Badge variant="primary" size="sm">
      <span className="pulse-dot inline-block h-1 w-1 rounded-full bg-current" />
      {stageLabels[stage]}
    </Badge>
  );
}

function StageStrip({ stage, sensitivity }: { stage: Stage; sensitivity: number }) {
  const idx = stageOrder.indexOf(stage);
  return (
    <div className="mt-2 flex items-center gap-1.5">
      {stageOrder.slice(0, 6).map((s, i) => {
        const active = i <= idx;
        return (
          <div
            key={s}
            className={cn(
              "h-[3px] flex-1 rounded-full transition-colors",
              active
                ? "bg-gradient-to-r from-primary/70 to-[color:oklch(0.78_0.17_158)]"
                : "bg-white/[0.05]"
            )}
          />
        );
      })}
      <span className="ml-1 shrink-0 text-[10px] tabular text-muted-foreground">
        sens. {sensitivity}
      </span>
    </div>
  );
}
