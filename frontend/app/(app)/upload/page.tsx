"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  CloudUpload,
  FileText,
  Lock,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  X,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn, formatBytes } from "@/lib/utils";

type Stage = "queued" | "scanning" | "naming" | "policy" | "encrypted" | "stored" | "done" | "blocked";
type ProcessingMode = "Quick Scan" | "Full Metadata Extraction" | "Secure Archive Prep";

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
  scanning: "Extracting metadata",
  naming: "Suggesting filename",
  policy: "Assessing sensitivity",
  encrypted: "Encrypting",
  stored: "Routing to storage",
  done: "Complete",
  blocked: "Needs review",
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
    name: "amzn_q2_earnings_call.txt",
    size: 86_002,
    type: "text/plain",
    sens: 4,
    rename: "AMZN_AMAZON_EARNINGS_CALL_2021Q2_EN_2021-07-29.txt",
  },
  {
    name: "internal_keys.env",
    size: 4_122,
    type: "env",
    sens: 99,
    blocked: "Low confidence metadata and sensitive content detected",
    rename: "internal_keys.env",
  },
];

const processingModes: { name: ProcessingMode; detail: string }[] = [
  {
    name: "Quick Scan",
    detail: "Fast metadata pass for obvious filenames and known publishers.",
  },
  {
    name: "Full Metadata Extraction",
    detail: "Deep extraction for ticker, publisher, document type, dates, and confidence.",
  },
  {
    name: "Secure Archive Prep",
    detail: "Adds sensitivity checks, archive prep, and encryption-ready output.",
  },
];

export default function UploadPage() {
  const [files, setFiles] = useState<UploadingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [autoEncrypt, setAutoEncrypt] = useState(true);
  const [archive, setArchive] = useState(false);
  const [enforce, setEnforce] = useState(true);
  const [documentCategory, setDocumentCategory] = useState("Analyst report");
  const [ticker, setTicker] = useState("AMZN");
  const [publisher, setPublisher] = useState("Evercore");
  const [sourceFolder, setSourceFolder] = useState("/research/2026/q1");
  const [processingMode, setProcessingMode] = useState<ProcessingMode>("Full Metadata Extraction");
  const seededRef = useRef(false);
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
    if (seededRef.current) return;
    seededRef.current = true;
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
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.35fr_0.85fr]">
        <Card className="overflow-hidden bg-white">
          <CardContent className="p-4 sm:p-6">
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
                "relative flex min-h-[420px] flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed px-6 py-12 text-center transition-colors",
                isDragging
                  ? "border-[oklch(0.52_0.18_270)] bg-[oklch(0.95_0.028_270)]"
                  : "border-[oklch(0.78_0.035_242)] bg-[radial-gradient(circle_at_50%_0%,oklch(0.62_0.18_260/0.12),transparent_42%),linear-gradient(180deg,white,oklch(0.965_0.018_248))]"
              )}
            >
              <div
                className={cn(
                  "relative grid h-[78px] w-[78px] place-items-center rounded-2xl border border-[oklch(0.82_0.04_242)] bg-white text-[oklch(0.46_0.18_282)] shadow-[0_24px_56px_-34px_oklch(0.2_0.05_260/0.7)]",
                  isDragging && "ring-glow"
                )}
              >
                <CloudUpload className="h-9 w-9" />
              </div>
              <div className="relative mt-6 max-w-2xl">
                <h2 className="text-3xl font-semibold tracking-normal text-[oklch(0.2_0.045_260)]">
                  Drop financial research files here or browse to upload.
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Original files are preserved. RoboVault creates renamed copies for
                  review and export.
                </p>
              </div>

              <div className="relative mt-6 flex flex-wrap items-center justify-center gap-2">
                {["PDF", "DOCX", "TXT"].map((type) => (
                  <Badge key={type} variant="primary">
                    {type}
                  </Badge>
                ))}
              </div>

              <div className="relative mt-6 grid w-full max-w-2xl grid-cols-1 gap-3 text-left md:grid-cols-3">
                {[
                  ["Max file size", "50MB per file"],
                  ["Recommended length", "Up to 500 pages"],
                  ["Max batch size", "250MB for MVP"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-[oklch(0.84_0.026_242)] bg-white/80 p-3"
                  >
                    <div className="text-xs text-muted-foreground">{label}</div>
                    <div className="mt-1 text-sm font-medium text-foreground">{value}</div>
                  </div>
                ))}
              </div>

              <div className="relative mt-8 flex flex-col gap-3 sm:flex-row">
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  className="hidden"
                  accept=".pdf,.docx,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => handleFiles(e.target.files)}
                />
                <Button
                  onClick={seedDemo}
                  className="h-11 rounded-lg bg-[oklch(0.46_0.18_282)] px-6 text-white shadow-[0_0_26px_oklch(0.5_0.18_282/0.28)] hover:bg-[oklch(0.42_0.18_282)]"
                >
                  <Sparkles className="h-4 w-4" />
                  Analyze Documents
                </Button>
                <Button
                  variant="outline"
                  className="h-11 rounded-lg bg-white/70"
                  onClick={() => inputRef.current?.click()}
                >
                  <CloudUpload className="h-4 w-4" />
                  Browse files
                </Button>
              </div>
            </motion.div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Upload settings</CardTitle>
              <CardDescription>
                Optional hints keep batch setup quick while improving metadata quality.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field
                label="Document category"
                value={documentCategory}
                onChange={setDocumentCategory}
                placeholder="Analyst report"
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Ticker" value={ticker} onChange={setTicker} placeholder="AMZN" />
                <Field
                  label="Publisher"
                  value={publisher}
                  onChange={setPublisher}
                  placeholder="Evercore"
                />
              </div>
              <Field
                label="Source folder"
                value={sourceFolder}
                onChange={setSourceFolder}
                placeholder="/research/2026/q1"
              />
              <Separator />
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Processing mode</Label>
                <div className="grid gap-2">
                  {processingModes.map((mode) => (
                    <button
                      key={mode.name}
                      type="button"
                      onClick={() => setProcessingMode(mode.name)}
                      className={cn(
                        "rounded-xl border p-3 text-left transition hover:border-[oklch(0.62_0.12_270)]",
                        processingMode === mode.name
                          ? "border-[oklch(0.5_0.16_280)] bg-[oklch(0.96_0.024_278)]"
                          : "border-border/70 bg-[oklch(0.99_0.004_240)]"
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium text-foreground">{mode.name}</div>
                        {processingMode === mode.name && (
                          <Badge variant="primary">Selected</Badge>
                        )}
                      </div>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {mode.detail}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-primary" />
                Processing safeguards
              </CardTitle>
              <CardDescription>Applies to this upload job.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ToggleRow
                label="Auto-encrypt sensitive files"
                hint="Recommended for high-sensitivity financial research."
                checked={autoEncrypt}
                onChange={setAutoEncrypt}
                icon={Lock}
              />
              <Separator />
              <ToggleRow
                label="Create compressed archive"
                hint="Package renamed copies after review."
                checked={archive}
                onChange={setArchive}
                icon={ShieldCheck}
              />
              <Separator />
              <ToggleRow
                label="Flag uncertain metadata"
                hint="Route low-confidence rows to the review table."
                checked={enforce}
                onChange={setEnforce}
                icon={Sparkles}
              />
            </CardContent>
          </Card>
        </div>
      </section>

      <Card className="bg-white">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Processing queue</CardTitle>
            <CardDescription>
              {files.filter((f) => f.stage !== "done" && f.stage !== "blocked").length}{" "}
              in progress · {files.filter((f) => f.stage === "done").length} done ·{" "}
              {processingMode}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={seedDemo} className="hidden sm:inline-flex">
              <RotateCcw className="h-3.5 w-3.5" /> Replay demo
            </Button>
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
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <AnimatePresence initial={false}>
            {files.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-lg border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground"
              >
                No active uploads. Drop a file above or browse to upload.
              </motion.div>
            )}
            {files.map((f) => (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className={cn(
                  "rounded-xl border bg-[oklch(0.99_0.004_240)] p-4 transition-colors",
                  f.stage === "blocked"
                    ? "border-[color:oklch(0.68_0.15_78/0.4)] bg-[color:oklch(0.98_0.02_78)]"
                    : "border-border/70"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 grid h-8 w-8 place-items-center rounded-lg border border-border bg-white">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {f.stage === "done" ? f.renamed : f.name}
                        </div>
                        {f.stage === "done" && f.renamed !== f.name && (
                          <div className="mt-1 truncate text-xs text-muted-foreground">
                            <span className="line-through opacity-60">{f.name}</span>
                            <span className="mx-1.5 opacity-50">→</span>
                            <span className="text-[color:oklch(0.34_0.115_262)]">renamed copy created</span>
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-xs tabular text-muted-foreground">
                          {formatBytes(f.size)}
                        </span>
                        <StageBadge stage={f.stage} />
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <Progress
                        value={f.progress}
                        className="h-1.5"
                        indicatorClassName={
                          f.stage === "blocked"
                            ? "bg-[color:oklch(0.72_0.15_78)]"
                            : f.stage === "done"
                            ? "bg-[color:oklch(0.62_0.17_158)]"
                            : undefined
                        }
                      />
                      <span className="w-9 shrink-0 text-right text-xs tabular text-muted-foreground">
                        {Math.floor(f.progress)}%
                      </span>
                    </div>
                    {f.stage === "blocked" && f.blockedReason && (
                      <div className="mt-3 flex items-center gap-2 rounded-md border border-[color:oklch(0.68_0.15_78/0.34)] bg-white px-2 py-1.5 text-xs text-[color:oklch(0.48_0.12_78)]">
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
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-9 bg-background/70 text-sm"
      />
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
          <div className="max-w-xs text-[11px] text-muted-foreground">{hint}</div>
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
      <Badge variant="warning" size="sm">
        <TriangleAlert className="h-2.5 w-2.5" />
        Needs Review
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
    <div className="mt-3 flex items-center gap-1.5">
      {stageOrder.slice(0, 6).map((s, i) => {
        const active = i <= idx;
        return (
          <div
            key={s}
            className={cn(
              "h-[3px] flex-1 rounded-full transition-colors",
              active
                ? "bg-gradient-to-r from-primary/70 to-[color:oklch(0.62_0.17_158)]"
                : "bg-accent/50"
            )}
          />
        );
      })}
      <span className="ml-1 shrink-0 text-[10px] tabular text-muted-foreground">
        sensitivity {sensitivity}
      </span>
    </div>
  );
}
