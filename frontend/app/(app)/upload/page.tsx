"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  CloudUpload,
  FileText,
  FolderOpen,
  Lock,
  Sparkles,
  ShieldCheck,
  TriangleAlert,
  X,
  Zap,
  Play,
  ChevronRight,
  RefreshCcw,
  Loader2,
  Folder,
  ArrowUp,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBackendStatus } from "@/lib/backend-status";
import {
  browse,
  flattenManifest,
  getConfig,
  getJob,
  startJob,
} from "@/lib/api";
import type {
  BackendConfig,
  BrowseResult,
  JobEvent,
  JobManifest,
  JobRecord,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const STAGE_ORDER = ["rename", "group", "copy", "archive", "manifest"] as const;
type StageKey = (typeof STAGE_ORDER)[number];

const STAGE_LABEL: Record<StageKey, string> = {
  rename: "Analyzing & renaming",
  group: "Grouping",
  copy: "Copying",
  archive: "Compressing & encrypting",
  manifest: "Sealing manifest",
};

export default function UploadPage() {
  const { mode } = useBackendStatus();
  const [config, setConfig] = useState<BackendConfig | null>(null);
  const [opts, setOpts] = useState({
    input_path: "",
    copy_to: "",
    archive_dir: "",
    manifest: "",
    ticker: "AMZN",
    recursive: true,
    archive: false,
    dry_run: false,
    encrypt_archives: false,
    encryption_passphrase: "",
  });

  const [job, setJob] = useState<JobRecord | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [picker, setPicker] = useState<null | { field: keyof typeof opts; kind: "dir" | "file" }>(null);

  // hydrate defaults from backend on mount
  useEffect(() => {
    if (mode !== "live") return;
    let cancelled = false;
    (async () => {
      const c = await getConfig();
      if (cancelled || !c) return;
      setConfig(c);
      setOpts((o) => ({
        ...o,
        input_path: o.input_path || c.defaults.input_path,
        copy_to: o.copy_to || c.defaults.copy_to,
        archive_dir: o.archive_dir || c.defaults.archive_dir,
        manifest: o.manifest || c.defaults.manifest,
        ticker: o.ticker || c.ticker,
      }));
    })();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  // poll active job
  useEffect(() => {
    if (!job || job.status === "completed" || job.status === "failed") return;
    let cancelled = false;
    const tick = async () => {
      const next = await getJob(job.job_id);
      if (cancelled || !next) return;
      setJob(next);
    };
    const id = window.setInterval(tick, 800);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [job]);

  const submitJob = useCallback(async () => {
    setSubmitError(null);
    if (!opts.input_path.trim()) {
      setSubmitError("Input path is required.");
      return;
    }
    if (opts.encrypt_archives && !opts.encryption_passphrase.trim()) {
      setSubmitError("Encryption passphrase is required when archive encryption is on.");
      return;
    }
    try {
      const { job_id } = await startJob({
        input_path: opts.input_path,
        copy_to: opts.copy_to || undefined,
        archive_dir: opts.archive_dir || undefined,
        manifest: opts.manifest || undefined,
        ticker: opts.ticker,
        recursive: opts.recursive,
        archive: opts.archive,
        dry_run: opts.dry_run,
        encrypt_archives: opts.encrypt_archives,
        encryption_passphrase: opts.encryption_passphrase || undefined,
      });
      setJob({
        job_id,
        status: "queued",
        created_at: new Date().toISOString(),
        started_at: null,
        completed_at: null,
        current_stage: null,
        file_progress: null,
        events: [],
        summary: null,
        manifest: null,
        error: null,
      });
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Failed to start job");
    }
  }, [opts]);

  const isLive = mode === "live";

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
      <div className="space-y-4">
        {!isLive && <DemoBanner />}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CloudUpload className="h-3.5 w-3.5 text-primary" />
                Run pipeline
              </CardTitle>
              <CardDescription>
                {isLive
                  ? "Point RoboVault at a local folder. Files are renamed in place, copied to your output, and (optionally) sealed into encrypted archives."
                  : "Backend offline. Showing the demo replay below — real jobs will run once you start the Flask backend."}
              </CardDescription>
            </div>
            <Badge variant={isLive ? "primary" : "muted"} size="sm">
              {isLive ? "Backend ready" : "Demo mode"}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <PathField
              label="Input folder"
              hint="The directory of source PDFs / Office docs / CSVs to process."
              value={opts.input_path}
              onChange={(v) => setOpts((o) => ({ ...o, input_path: v }))}
              onPick={() => isLive && setPicker({ field: "input_path", kind: "dir" })}
              disabled={!isLive}
              icon={FolderOpen}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <PathField
                label="Output (renamed) folder"
                hint="Where renamed copies are placed. Optional but recommended."
                value={opts.copy_to}
                onChange={(v) => setOpts((o) => ({ ...o, copy_to: v }))}
                onPick={() => isLive && setPicker({ field: "copy_to", kind: "dir" })}
                disabled={!isLive}
                icon={Folder}
                compact
              />
              <PathField
                label="Manifest path"
                hint="Job manifest JSON output."
                value={opts.manifest}
                onChange={(v) => setOpts((o) => ({ ...o, manifest: v }))}
                disabled={!isLive}
                icon={FileText}
                compact
              />
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Ticker</Label>
                <Input
                  value={opts.ticker}
                  onChange={(e) =>
                    setOpts((o) => ({ ...o, ticker: e.target.value.toUpperCase() }))
                  }
                  disabled={!isLive}
                  placeholder="AMZN"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Compression / encryption keypair</Label>
                <Input
                  type="password"
                  value={opts.encryption_passphrase}
                  onChange={(e) =>
                    setOpts((o) => ({ ...o, encryption_passphrase: e.target.value }))
                  }
                  disabled={!isLive || !opts.encrypt_archives}
                  placeholder={opts.encrypt_archives ? "Passphrase" : "Enable archive encryption first"}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <ToggleRow
                label="Recursive scan"
                hint="Walk into subdirectories under the input folder."
                checked={opts.recursive}
                onChange={(v) => setOpts((o) => ({ ...o, recursive: v }))}
                disabled={!isLive}
                icon={Sparkles}
              />
              <ToggleRow
                label="Archive groups (.tar.zst)"
                hint="Bundle each Quickfinder group into a compressed archive in the output folder."
                checked={opts.archive}
                onChange={(v) => setOpts((o) => ({ ...o, archive: v }))}
                disabled={!isLive}
                icon={ShieldCheck}
              />
              <ToggleRow
                label="Encrypt archives (AES-256-GCM)"
                hint="Requires archive option. Wraps each archive with passphrase-derived key."
                checked={opts.encrypt_archives}
                onChange={(v) => setOpts((o) => ({ ...o, encrypt_archives: v }))}
                disabled={!isLive || !opts.archive}
                icon={Lock}
              />
              <ToggleRow
                label="Dry run"
                hint="Plan the rename without copying or archiving anything."
                checked={opts.dry_run}
                onChange={(v) => setOpts((o) => ({ ...o, dry_run: v }))}
                disabled={!isLive}
                icon={Zap}
              />
            </div>

            {submitError && (
              <div className="flex items-center gap-2 rounded-md border border-[color:oklch(0.7_0.22_22/0.3)] bg-[color:oklch(0.7_0.22_22/0.06)] px-2.5 py-2 text-[12px] text-[color:oklch(0.85_0.18_22)]">
                <TriangleAlert className="h-3.5 w-3.5" />
                {submitError}
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="text-[11px] text-muted-foreground">
                {config ? `Loaded defaults · ticker ${config.ticker}` : null}
              </div>
              <div className="flex items-center gap-2">
                {job && job.status === "running" && (
                  <Badge variant="primary" size="sm" className="hidden md:inline-flex">
                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                    Running
                  </Badge>
                )}
                <Button
                  onClick={submitJob}
                  disabled={!isLive || (job?.status === "queued" || job?.status === "running")}
                >
                  {job?.status === "running" || job?.status === "queued" ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Running…
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" />
                      Run pipeline
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live job status */}
        {job ? <LiveJobPanel job={job} /> : isLive ? <EmptyJobHint /> : <DemoReplay />}
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-primary" />
              Naming convention
            </CardTitle>
            <CardDescription>Validated regex applied to every file.</CardDescription>
          </CardHeader>
          <CardContent>
            <code className="block rounded-md border border-border bg-background/60 px-2.5 py-2 text-[11px] font-mono text-muted-foreground">
              {"{ticker}_{publisher}_{report_type}_{year_quarter}_{lang}_{date}.{ext}"}
            </code>
            <div className="mt-2 text-[10.5px] text-muted-foreground">
              Inferred from PDF text, document XML, and a deterministic LLM template.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pipeline stages</CardTitle>
            <CardDescription>Each stage emits progress events the UI tracks.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {[
                { t: "Rename", d: "Open files, OCR if needed, infer ticker/type/period." },
                { t: "Group", d: "Cluster by Quickfinder fields (ticker, doc category, period)." },
                { t: "Copy", d: "Place renamed copies into the output folder." },
                { t: "Archive", d: "Bundle each group into .tar.zst (optional)." },
                { t: "Encrypt", d: "AES-256-GCM with passphrase-derived key (optional)." },
                { t: "Manifest", d: "Write the immutable JSON manifest with checksums." },
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

      <DirectoryPickerDialog
        open={Boolean(picker)}
        kind={picker?.kind ?? "dir"}
        startPath={picker ? String(opts[picker.field] ?? "") : ""}
        onClose={() => setPicker(null)}
        onChoose={(path) => {
          if (!picker) return;
          setOpts((o) => ({ ...o, [picker.field]: path }));
          setPicker(null);
        }}
      />
    </div>
  );
}

/* ---------- subcomponents ---------- */

function DemoBanner() {
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 px-3 py-2.5 text-[12px] text-muted-foreground">
      <div className="flex items-center gap-2">
        <TriangleAlert className="h-3.5 w-3.5 text-[color:oklch(0.9_0.15_78)]" />
        <span className="text-foreground">
          Backend not detected at <code className="font-mono">{"http://127.0.0.1:5001"}</code>.
        </span>
      </div>
      <div className="mt-1 ml-5 leading-relaxed">
        Start it with{" "}
        <code className="font-mono">cd raw_data/AMAZON && python web_app.py</code>{" "}
        and the Upload Center will switch to live job control.
      </div>
    </div>
  );
}

function EmptyJobHint() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
        <div className="grid h-10 w-10 place-items-center rounded-md border border-border bg-background/40">
          <Play className="h-4 w-4 text-primary" />
        </div>
        <div className="text-[13px] font-medium text-foreground">No active job</div>
        <div className="text-[11.5px]">
          Configure paths and click <span className="text-foreground">Run pipeline</span> to ingest a folder.
        </div>
      </CardContent>
    </Card>
  );
}

function LiveJobPanel({ job }: { job: JobRecord }) {
  const completed = job.status === "completed";
  const failed = job.status === "failed";
  const stage = (job.current_stage as StageKey | null) ?? "rename";
  const stageIdx = Math.max(0, STAGE_ORDER.indexOf(stage));
  const totalStages = STAGE_ORDER.length;

  // Build a per-file rolling list from `file_progress` events
  const fileLines = useMemo(() => deriveFileLines(job.events), [job.events]);
  const flat = job.manifest ? flattenManifest(job.manifest) : [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            {completed ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-[color:oklch(0.78_0.17_158)]" />
            ) : failed ? (
              <TriangleAlert className="h-3.5 w-3.5 text-[color:oklch(0.85_0.18_22)]" />
            ) : (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            )}
            Job {shortId(job.job_id)}
          </CardTitle>
          <CardDescription>
            {completed
              ? `Completed at ${formatTime(job.completed_at)}`
              : failed
              ? `Failed at ${formatTime(job.completed_at)}`
              : `Running · stage ${stageIdx + 1} / ${totalStages} · ${STAGE_LABEL[stage]}`}
          </CardDescription>
        </div>
        <Badge
          variant={completed ? "success" : failed ? "destructive" : "primary"}
          size="sm"
        >
          {job.status}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stage strip */}
        <div className="flex items-center gap-1.5">
          {STAGE_ORDER.map((s, i) => {
            const active = i <= stageIdx && (job.status !== "queued");
            const current = i === stageIdx && job.status === "running";
            return (
              <div key={s} className="flex flex-1 flex-col items-stretch gap-1">
                <div
                  className={cn(
                    "h-[3px] rounded-full transition-colors",
                    active
                      ? "bg-gradient-to-r from-primary/70 to-[color:oklch(0.78_0.17_158)]"
                      : "bg-white/[0.05]",
                    current && "shadow-[0_0_12px_oklch(0.72_0.16_264/0.45)]"
                  )}
                />
                <div
                  className={cn(
                    "text-[9.5px] uppercase tracking-wider tabular",
                    active ? "text-foreground/80" : "text-muted-foreground/60"
                  )}
                >
                  {STAGE_LABEL[s]}
                </div>
              </div>
            );
          })}
        </div>

        {failed && job.error && (
          <div className="rounded-md border border-[color:oklch(0.7_0.22_22/0.3)] bg-[color:oklch(0.7_0.22_22/0.06)] px-2.5 py-2 text-[12px] text-[color:oklch(0.85_0.18_22)]">
            <div className="flex items-center gap-2">
              <TriangleAlert className="h-3.5 w-3.5" />
              {job.error}
            </div>
          </div>
        )}

        {/* Live file activity (during run) */}
        {!completed && fileLines.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Activity
            </div>
            <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
              <AnimatePresence initial={false}>
                {fileLines.slice(0, 40).map((l, i) => (
                  <motion.div
                    key={`${l.stage}:${l.file}:${i}`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 rounded-md border border-border/60 bg-background/30 px-2.5 py-1.5"
                  >
                    <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1 truncate text-[11.5px]">
                      {l.file}
                    </div>
                    <Badge variant="muted" size="sm">{l.stage}</Badge>
                    <span className="w-12 shrink-0 text-right text-[10.5px] tabular text-muted-foreground">
                      {l.current}/{l.total}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Manifest summary (after completion) */}
        {completed && job.manifest && (
          <ManifestSummary manifest={job.manifest} flat={flat} />
        )}
      </CardContent>
    </Card>
  );
}

function ManifestSummary({
  manifest,
  flat,
}: {
  manifest: JobManifest;
  flat: ReturnType<typeof flattenManifest>;
}) {
  const summary = manifest.summary;
  const groups = Object.entries(manifest.quickfinder_groups);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat label="Files" value={String(summary.total_processed)} />
        <Stat label="Successful" value={String(summary.successful)} accent="success" />
        <Stat label="Failed" value={String(summary.failed)} accent={summary.failed > 0 ? "destructive" : "muted"} />
        <Stat label="Groups" value={String(summary.groups)} />
      </div>

      <div>
        <div className="mb-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
          Quickfinder groups
        </div>
        <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
          {groups.slice(0, 80).map(([gid, g]) => (
            <div
              key={gid}
              className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-background/30 px-2.5 py-1.5"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] font-medium">{gid}</div>
                <div className="truncate text-[10.5px] text-muted-foreground">
                  {g.files.length} file{g.files.length === 1 ? "" : "s"}
                  {g.archive?.encrypted_archive_path ? " · encrypted archive" : g.archive?.archive_path ? " · archive" : ""}
                </div>
              </div>
              {g.archive?.encrypted_archive_path ? (
                <Badge variant="success" size="sm">
                  <Lock className="h-2.5 w-2.5" />
                  AES-256
                </Badge>
              ) : g.archive?.archive_path ? (
                <Badge variant="info" size="sm">archive</Badge>
              ) : (
                <Badge variant="muted" size="sm">renamed</Badge>
              )}
            </div>
          ))}
          {groups.length > 80 && (
            <div className="px-2 py-1.5 text-[10.5px] text-muted-foreground">
              + {groups.length - 80} more groups
            </div>
          )}
        </div>
      </div>

      {flat.length > 0 && (
        <div>
          <div className="mb-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
            Sample renames
          </div>
          <div className="space-y-1.5">
            {flat.slice(0, 5).map((f) => (
              <div
                key={f.id}
                className="rounded-md border border-border/60 bg-background/30 px-2.5 py-1.5"
              >
                <div className="truncate text-[11.5px] text-muted-foreground">
                  <span className="line-through opacity-60">{f.original}</span>
                  <span className="mx-1.5 opacity-50">→</span>
                  <span className="text-[color:oklch(0.86_0.13_264)]">{f.renamed}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent = "muted",
}: {
  label: string;
  value: string;
  accent?: "muted" | "success" | "destructive";
}) {
  const tone =
    accent === "success"
      ? "text-[color:oklch(0.84_0.15_158)]"
      : accent === "destructive"
      ? "text-[color:oklch(0.85_0.18_22)]"
      : "text-foreground";
  return (
    <div className="rounded-md border border-border/60 bg-background/30 px-2.5 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 text-[18px] font-semibold tabular", tone)}>{value}</div>
    </div>
  );
}

function PathField({
  label,
  hint,
  value,
  onChange,
  onPick,
  disabled,
  icon: Icon,
  compact,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  onPick?: () => void;
  disabled?: boolean;
  icon: typeof FolderOpen;
  compact?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-md border border-border bg-background/40 px-2 focus-within:ring-1 focus-within:ring-ring">
          <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder="/path/to/folder"
            className="border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
        {onPick && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onPick}
            disabled={disabled}
          >
            Browse
          </Button>
        )}
      </div>
      {hint && !compact && (
        <div className="text-[10.5px] text-muted-foreground">{hint}</div>
      )}
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
  icon: Icon,
  disabled,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  icon: typeof Lock;
  disabled?: boolean;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3", disabled && "opacity-60")}>
      <div className="flex items-start gap-2">
        <div className="mt-0.5 grid h-7 w-7 place-items-center rounded-md border border-border bg-background/40 text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div>
          <div className="text-[12.5px] font-medium">{label}</div>
          <div className="text-[11px] text-muted-foreground max-w-xs">{hint}</div>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

/* ---------- directory picker ---------- */

function DirectoryPickerDialog({
  open,
  kind,
  startPath,
  onClose,
  onChoose,
}: {
  open: boolean;
  kind: "dir" | "file";
  startPath: string;
  onClose: () => void;
  onChoose: (path: string) => void;
}) {
  const [data, setData] = useState<BrowseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [path, setPath] = useState(startPath);
  const initialPath = useRef(startPath);

  const load = useCallback(async (p?: string) => {
    setLoading(true);
    const res = await browse(p, kind);
    setData(res);
    if (res?.cwd) setPath(res.cwd);
    setLoading(false);
  }, [kind]);

  useEffect(() => {
    if (!open) return;
    initialPath.current = startPath;
    void load(startPath || undefined);
  }, [open, startPath, load]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-3.5 w-3.5 text-primary" />
            Browse server filesystem
          </DialogTitle>
          <DialogDescription>
            Navigate within allowed roots to pick a {kind === "dir" ? "directory" : "file"}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              value={path}
              onChange={(e) => setPath(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load(path)}
              className="flex-1"
              placeholder="/Users/you/data"
            />
            <Button variant="outline" size="sm" onClick={() => load(path)}>
              <RefreshCcw className="h-3.5 w-3.5" />
              Go
            </Button>
            {data?.parent && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => load(data.parent ?? undefined)}
                title="Parent directory"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto rounded-md border border-border bg-background/40">
            {loading && (
              <div className="flex items-center gap-2 px-3 py-3 text-[12px] text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading…
              </div>
            )}
            {!loading && data?.entries?.length === 0 && (
              <div className="px-3 py-3 text-[12px] text-muted-foreground">Empty.</div>
            )}
            {!loading &&
              data?.entries?.map((e) => (
                <button
                  type="button"
                  key={e.path}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] transition-colors hover:bg-card/50"
                  onClick={() => {
                    if (e.is_dir) {
                      void load(e.path);
                    } else if (kind === "file") {
                      onChoose(e.path);
                    }
                  }}
                  onDoubleClick={() => onChoose(e.path)}
                >
                  {e.is_dir ? (
                    <Folder className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span className="truncate">{e.name}</span>
                  {e.is_dir && <ChevronRight className="ml-auto h-3 w-3 text-muted-foreground" />}
                </button>
              ))}
          </div>

          {data?.roots && (
            <div className="text-[10.5px] text-muted-foreground">
              Allowed roots: {data.roots.map((r) => <code key={r} className="mr-1 font-mono">{r}</code>)}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onChoose(data?.cwd ?? path)} disabled={!data}>
            Use this {kind === "dir" ? "folder" : "file"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- demo replay (offline mode only) ---------- */

function DemoReplay() {
  type DemoStage = "queued" | "scanning" | "naming" | "policy" | "encrypted" | "stored" | "done" | "blocked";
  const stageOrder: DemoStage[] = ["queued", "scanning", "naming", "policy", "encrypted", "stored", "done"];
  const seedFiles = [
    {
      name: "10K_amazon_2024_FINAL_v3.pdf",
      size: 12_440_991,
      sens: 18,
      rename: "AMZN_SEC_10-K_2024Q0_EN_2025-02-01.pdf",
    },
    {
      name: "morgan_stanley_msa_red.docx",
      size: 287_443,
      sens: 64,
      rename: "MS_LEGAL_MSA_2024Q4_EN_2024-11-08.docx",
    },
    {
      name: "patient_records_export.csv",
      size: 1_204_991,
      sens: 96,
      rename: "ACME_CLINIC_PHI_EXPORT_2025Q1_EN_2025-02-14.csv",
    },
    {
      name: "internal_keys.env",
      size: 4_122,
      sens: 99,
      blocked: "Block-Plaintext-Secrets — 7 API keys detected",
      rename: "internal_keys.env",
    },
  ];

  type Row = {
    id: string;
    name: string;
    size: number;
    rename: string;
    sens: number;
    stage: DemoStage;
    progress: number;
    blocked?: string;
  };

  const [rows, setRows] = useState<Row[]>([]);

  const replay = useCallback(() => {
    const seeded: Row[] = seedFiles.map((s, i) => ({
      id: `demo_${i}`,
      name: s.name,
      size: s.size,
      rename: s.rename,
      sens: s.sens,
      stage: "queued",
      progress: 0,
      blocked: s.blocked,
    }));
    setRows(seeded);
    seeded.forEach((r) => {
      let p = 0;
      const t = setInterval(() => {
        p = Math.min(100, p + 10);
        setRows((prev) =>
          prev.map((x) => {
            if (x.id !== r.id) return x;
            const stage: DemoStage =
              x.stage === "queued" && p > 5
                ? "scanning"
                : x.stage === "scanning" && p > 25
                ? "naming"
                : x.stage === "naming" && p > 45
                ? "policy"
                : x.stage === "policy" && p > 60
                ? r.blocked
                  ? "blocked"
                  : "encrypted"
                : x.stage === "encrypted" && p > 80
                ? "stored"
                : x.stage === "stored" && p > 95
                ? "done"
                : x.stage;
            return { ...x, stage, progress: p };
          })
        );
        if (p >= 100) clearInterval(t);
      }, 280);
    });
  }, []);

  useEffect(() => {
    replay();
  }, [replay]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Demo replay</CardTitle>
          <CardDescription>Simulated pipeline run — start the backend to switch to real jobs.</CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={replay}>
          <RefreshCcw className="h-3.5 w-3.5" />
          Replay
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map((f) => (
          <div
            key={f.id}
            className={cn(
              "rounded-lg border bg-background/30 p-3",
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
                      {f.stage === "done" ? f.rename : f.name}
                    </div>
                  </div>
                  <Badge
                    variant={f.stage === "blocked" ? "destructive" : f.stage === "done" ? "success" : "primary"}
                    size="sm"
                  >
                    {f.stage}
                  </Badge>
                </div>
                <div className="mt-2 flex items-center gap-3">
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
                {f.stage === "blocked" && f.blocked && (
                  <div className="mt-2 flex items-center gap-2 rounded-md border border-[color:oklch(0.7_0.22_22/0.3)] bg-[color:oklch(0.7_0.22_22/0.06)] px-2 py-1.5 text-[11px] text-[color:oklch(0.85_0.18_22)]">
                    <TriangleAlert className="h-3.5 w-3.5" />
                    {f.blocked}
                  </div>
                )}
                {f.stage !== "blocked" && f.stage !== "queued" && (
                  <div className="mt-2 flex items-center gap-1.5">
                    {stageOrder.slice(0, 6).map((s, i) => {
                      const idx = stageOrder.indexOf(f.stage);
                      const active = i <= idx;
                      return (
                        <div
                          key={s}
                          className={cn(
                            "h-[3px] flex-1 rounded-full",
                            active
                              ? "bg-gradient-to-r from-primary/70 to-[color:oklch(0.78_0.17_158)]"
                              : "bg-white/[0.05]"
                          )}
                        />
                      );
                    })}
                    <span className="ml-1 shrink-0 text-[10px] tabular text-muted-foreground">
                      sens. {f.sens}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/* ---------- helpers ---------- */

function deriveFileLines(events: JobEvent[]) {
  const out: { stage: string; file: string; current: number; total: number }[] = [];
  for (const e of events) {
    if (e.event === "file_progress" && e.file && e.stage) {
      out.push({
        stage: String(e.stage),
        file: String(e.file),
        current: Number(e.current ?? 0),
        total: Number(e.total ?? 0),
      });
    }
  }
  return out.reverse(); // newest first
}

function shortId(id: string) {
  return id.length > 12 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
}

function formatTime(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString();
  } catch {
    return iso;
  }
}
