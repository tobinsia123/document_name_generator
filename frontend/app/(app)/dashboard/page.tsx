"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArrowRight,
  ClipboardCheck,
  Database,
  FileArchive,
  FileCheck2,
  FileSearch,
  FileStack,
  FolderClock,
  LockKeyhole,
  RefreshCcw,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useBackendStatus } from "@/lib/backend-status";
import { getDashboard, getManifest } from "@/lib/api";
import { files } from "@/lib/data";
import { cn, formatBytes } from "@/lib/utils";
import type { DashboardSummary, JobManifest } from "@/lib/types";

const workflowStages = [
  {
    key: "upload",
    title: "Upload & Ingest",
    description: "Bring financial research files into a controlled job without changing originals.",
    next: "Drop PDFs, DOCX files, or transcripts into a new upload batch.",
    icon: UploadCloud,
    href: "/upload",
  },
  {
    key: "extract",
    title: "Extract & Analyze Metadata",
    description: "Parse ticker, publisher, document type, dates, and source signals from messy files.",
    next: "Review extracted metadata before it becomes part of the export manifest.",
    icon: FileSearch,
    href: "/analysis",
  },
  {
    key: "classify",
    title: "Classify & Assess Sensitivity",
    description: "Score confidence and sensitivity so analyst and compliance queues stay focused.",
    next: "Filter the review queue by low confidence or high sensitivity.",
    icon: ClipboardCheck,
    href: "/review",
  },
  {
    key: "rename",
    title: "Rename & Organize",
    description: "Create standardized names and grouped outputs for research retrieval.",
    next: "Approve suggested filenames or edit metadata before export.",
    icon: FileCheck2,
    href: "/files",
  },
  {
    key: "compress",
    title: "Compress & Encrypt",
    description: "Package reviewed copies into compressed or encrypted deliverables.",
    next: "Choose archive options once review is complete.",
    icon: FileArchive,
    href: "/export",
  },
  {
    key: "store",
    title: "Secure Storage & Retrieval",
    description: "Store manifests and final document sets with searchable retrieval metadata.",
    next: "Save metadata to the database or route clean archives to secure storage.",
    icon: Database,
    href: "/export",
  },
] as const;

function relativeAge(iso: string | null): string {
  if (!iso) return "—";
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return iso;
  const secs = Math.floor((Date.now() - then) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

function computeStageProgress(
  dash: DashboardSummary | null,
  manifest: JobManifest | null,
  key: string
): number {
  if (!dash || !dash.kpis) return 0;
  const k = dash.kpis;
  const total = k.files_processed || 0;
  switch (key) {
    case "upload":
      return total > 0 ? 100 : 0;
    case "extract":
      return total > 0 ? 100 : 0;
    case "classify": {
      const reviewed = k.approved + k.flagged;
      return total > 0 ? Math.min(100, Math.round((reviewed / Math.max(total, 1)) * 100)) : 0;
    }
    case "rename":
      return manifest && manifest.summary
        ? Math.round(
            (manifest.summary.successful /
              Math.max(manifest.summary.total_processed, 1)) *
              100
          )
        : total > 0
        ? 100
        : 0;
    case "compress":
      return k.groups > 0
        ? Math.round((k.archives_created / Math.max(k.groups, 1)) * 100)
        : 0;
    case "store":
      return k.archives_created > 0
        ? Math.round((k.encrypted_archives / Math.max(k.archives_created, 1)) * 100)
        : 0;
    default:
      return 0;
  }
}

export default function DashboardPage() {
  const { mode } = useBackendStatus();
  const [selectedStage, setSelectedStage] = useState(0);
  const [expandedJob, setExpandedJob] = useState<string>("");
  const [dash, setDash] = useState<DashboardSummary | null>(null);
  const [manifest, setManifest] = useState<JobManifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isLive = mode === "live";

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [d, m] = await Promise.all([getDashboard(), getManifest()]);
      setDash(d);
      setManifest(m?.manifest ?? null);
      if (!d) setError("Failed to load dashboard data");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isLive) {
      setLoading(false);
      return;
    }
    void refresh();
    const id = window.setInterval(() => {
      void refresh();
    }, 30_000);
    return () => window.clearInterval(id);
  }, [isLive]);

  // Build KPI cards — live or fallback to demo from `files`
  const summaryCards = useMemo(() => {
    if (isLive && dash) {
      return [
        {
          title: "Files Processed",
          value: dash.kpis.files_processed.toString(),
          detail:
            dash.kpis.total_bytes > 0
              ? `${formatBytes(dash.kpis.total_bytes)} organized`
              : "Across the latest manifest",
          icon: FileStack,
        },
        {
          title: "Active Jobs",
          value: dash.active_jobs.toString(),
          detail:
            dash.active_jobs > 0 ? "In progress now" : "No jobs queued or running",
          icon: FolderClock,
        },
        {
          title: "Needs Review",
          value: dash.kpis.needs_review.toString(),
          detail: `${dash.kpis.flagged} flagged · ${dash.kpis.approved} approved`,
          icon: ClipboardCheck,
        },
        {
          title: "Encrypted Archives",
          value: `${dash.kpis.encrypted_archives} / ${dash.kpis.archives_created || 0}`,
          detail: `${dash.kpis.groups} group${dash.kpis.groups === 1 ? "" : "s"} total`,
          icon: LockKeyhole,
        },
      ];
    }
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    return [
      {
        title: "Files Processed",
        value: files.length.toString(),
        detail: `${formatBytes(totalSize)} organized (demo)`,
        icon: FileStack,
      },
      {
        title: "Active Jobs",
        value: "0",
        detail: "Connect the backend to track jobs",
        icon: FolderClock,
      },
      {
        title: "Needs Review",
        value: files
          .filter(
            (f) => f.status === "failed" || !f.renamedTo || f.sensitivityScore >= 88
          )
          .length.toString(),
        detail: "Low confidence or sensitive (demo)",
        icon: ClipboardCheck,
      },
      {
        title: "Encrypted Archives",
        value: files.filter((file) => file.status === "archived").length.toString(),
        detail: "Ready for retrieval (demo)",
        icon: LockKeyhole,
      },
    ];
  }, [isLive, dash]);

  const selected = workflowStages[selectedStage];
  const SelectedIcon = selected.icon;

  return (
    <div className="space-y-6">
      {!isLive && (
        <div className="rounded-2xl border border-[oklch(0.76_0.18_78/0.45)] bg-[oklch(0.99_0.04_78)] p-4 text-sm text-[oklch(0.36_0.16_78)]">
          <div className="font-medium">Backend not reachable — dashboard is showing demo data.</div>
          <p className="mt-1 text-xs text-[oklch(0.46_0.16_78)]">
            Start the Flask backend in <code>raw_data/AMAZON</code> with{" "}
            <code className="rounded bg-[oklch(0.96_0.04_78)] px-1">python web_app.py</code> to see real
            metrics.
          </p>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-[oklch(0.78_0.03_242)] bg-[linear-gradient(135deg,oklch(0.12_0.035_260),oklch(0.07_0.025_260))] p-6 text-white shadow-[0_26px_72px_-44px_oklch(0.1_0.04_260/0.9)] md:p-8">
        <div className="relative">
          <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-[oklch(0.58_0.22_286/0.22)] blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <h2 className="text-3xl font-semibold leading-tight tracking-normal md:text-4xl">
                Financial research operations, from upload to secure retrieval.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/66">
                {isLive && dash?.manifest_path
                  ? `Latest manifest: ${dash.ticker ?? "—"} · ${
                      relativeAge(dash.manifest_created_at)
                    } · ${dash.kpis.files_processed} files`
                  : "Track document batches, review metadata, and move approved research sets into encrypted archives."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {isLive && (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => void refresh()}
                  disabled={loading}
                  className="h-11 rounded-lg border-white/15 bg-white/8 text-white hover:bg-white/12 hover:text-white"
                >
                  <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
                  Refresh
                </Button>
              )}
              <Button
                asChild
                size="lg"
                className="h-11 rounded-lg bg-[oklch(0.58_0.22_286)] text-white shadow-[0_0_30px_oklch(0.58_0.22_286/0.42)] hover:bg-[oklch(0.54_0.22_286)]"
              >
                <Link href="/upload">
                  <UploadCloud className="h-4 w-4" />
                  Start New Job
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title} className="bg-white">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      {item.title}
                    </p>
                    <p className="mt-3 text-3xl font-semibold tracking-normal text-[oklch(0.2_0.045_260)]">
                      {item.value}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      {item.detail}
                    </p>
                  </div>
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-[oklch(0.94_0.026_245)] text-[oklch(0.46_0.18_282)]">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <Card className="bg-white">
          <CardHeader>
            <CardTitle>Pipeline Status</CardTitle>
            <CardDescription>
              {isLive
                ? "Progress is derived from the latest manifest in your workspace."
                : "Click a stage to see what RoboVault does there and what to do next."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {workflowStages.map((stage, index) => {
                const Icon = stage.icon;
                const active = selectedStage === index;
                const progress = isLive
                  ? computeStageProgress(dash, manifest, stage.key)
                  : [100, 92, 84, 76, 62, 58][index];
                return (
                  <button
                    key={stage.title}
                    type="button"
                    onClick={() => setSelectedStage(index)}
                    className={cn(
                      "rounded-xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-[oklch(0.62_0.12_270)] hover:shadow-[0_18px_36px_-32px_oklch(0.22_0.05_260/0.5)]",
                      active
                        ? "border-[oklch(0.5_0.16_280)] bg-[oklch(0.96_0.024_278)]"
                        : "border-[oklch(0.84_0.026_242)] bg-[oklch(0.99_0.004_240)]"
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-lg bg-white text-[oklch(0.46_0.18_282)] shadow-[0_0_0_1px_oklch(0.86_0.024_240)]">
                        <Icon className="h-4 w-4" />
                      </div>
                      <Badge variant={active ? "primary" : "muted"}>
                        {progress}%
                      </Badge>
                    </div>
                    <h3 className="mt-4 text-sm font-semibold text-foreground">
                      {stage.title}
                    </h3>
                    <Progress value={progress} className="mt-3 h-1.5" />
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SelectedIcon className="h-4 w-4 text-primary" />
              {selected.title}
            </CardTitle>
            <CardDescription>Selected pipeline stage</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">{selected.description}</p>
            <div className="mt-5 rounded-xl border border-[oklch(0.84_0.026_242)] bg-[oklch(0.98_0.012_248)] p-4">
              <div className="text-xs font-semibold uppercase tracking-normal text-[oklch(0.36_0.1_260)]">
                What to do next
              </div>
              <p className="mt-2 text-sm leading-6 text-foreground">{selected.next}</p>
            </div>
            <Button
              asChild
              className="mt-5 w-full rounded-lg bg-[oklch(0.46_0.18_282)] text-white hover:bg-[oklch(0.42_0.18_282)]"
            >
              <Link href={selected.href}>
                Continue
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="bg-white">
          <CardHeader>
            <CardTitle>Recent Jobs</CardTitle>
            <CardDescription>
              {isLive
                ? "In-memory job runs from the current Flask session."
                : "Demo placeholder — connect backend to see real jobs."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLive ? (
              dash && dash.recent_jobs.length > 0 ? (
                dash.recent_jobs.slice(0, 6).map((job) => {
                  const open = expandedJob === job.job_id;
                  const failed = job.status === "failed";
                  return (
                    <button
                      key={job.job_id}
                      type="button"
                      onClick={() => setExpandedJob(open ? "" : job.job_id)}
                      className={cn(
                        "w-full rounded-xl border p-4 text-left transition",
                        open
                          ? "border-[oklch(0.5_0.16_280)] bg-[oklch(0.96_0.024_278)]"
                          : "border-border/70 bg-[oklch(0.99_0.004_240)] hover:border-[oklch(0.62_0.12_270)]"
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-mono text-xs text-muted-foreground">
                            {job.job_id.slice(0, 8)}
                          </div>
                          <div className="mt-1 text-sm font-semibold text-foreground">
                            {job.ticker ?? "Job"} ·{" "}
                            {job.summary?.total_processed ?? 0} files
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {relativeAge(job.created_at)}
                            {job.current_stage ? ` · stage: ${job.current_stage}` : ""}
                          </div>
                        </div>
                        <Badge
                          variant={
                            failed
                              ? "destructive"
                              : job.status === "completed"
                              ? "success"
                              : job.status === "running"
                              ? "primary"
                              : "muted"
                          }
                        >
                          {job.status}
                        </Badge>
                      </div>
                      {open && job.summary && (
                        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                          <div className="rounded-lg bg-white p-3">
                            <div className="text-muted-foreground">Total</div>
                            <div className="mt-1 font-medium">
                              {job.summary.total_processed}
                            </div>
                          </div>
                          <div className="rounded-lg bg-white p-3">
                            <div className="text-muted-foreground">Successful</div>
                            <div className="mt-1 font-medium">
                              {job.summary.successful}
                            </div>
                          </div>
                          <div className="rounded-lg bg-white p-3">
                            <div className="text-muted-foreground">Archives</div>
                            <div className="mt-1 font-medium">
                              {job.summary.archives_created}
                            </div>
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="rounded-xl border border-dashed border-border/70 py-8 text-center text-sm text-muted-foreground">
                  No jobs yet. <Link href="/upload" className="font-medium text-foreground underline">Start your first job</Link>.
                </div>
              )
            ) : (
              [
                {
                  id: "amzn",
                  title: "AMZN research refresh",
                  detail: "Demo only — start Flask backend for live data",
                  files: "6 files",
                  status: "Ready for review",
                },
                {
                  id: "sec",
                  title: "SEC filing archive",
                  detail: "Demo only — start Flask backend for live data",
                  files: "4 files",
                  status: "Export ready",
                },
              ].map((job) => (
                <div
                  key={job.id}
                  className="rounded-xl border border-border/70 bg-[oklch(0.99_0.004_240)] p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-foreground">{job.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {job.detail} · {job.files}
                      </div>
                    </div>
                    <Badge variant="muted">{job.status}</Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Archive className="h-4 w-4 text-primary" />
              Manifest Breakdown
            </CardTitle>
            <CardDescription>
              {isLive
                ? "Document categories detected in the latest manifest."
                : "Connect the backend to see real categories."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLive && dash && Object.keys(dash.doc_type_counts).length > 0 ? (
              Object.entries(dash.doc_type_counts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8)
                .map(([docType, count]) => {
                  const total = dash.kpis.groups || 1;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div
                      key={docType}
                      className="rounded-xl border border-border/70 bg-[oklch(0.99_0.004_240)] p-4"
                    >
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <div className="truncate font-medium text-foreground">
                          {docType.replace(/_/g, " ")}
                        </div>
                        <Badge variant="muted">{count}</Badge>
                      </div>
                      <Progress value={pct} className="mt-3 h-1.5" />
                    </div>
                  );
                })
            ) : (
              <div className="rounded-xl border border-dashed border-border/70 py-8 text-center text-sm text-muted-foreground">
                {isLive
                  ? "No manifest yet. Run a job to populate this view."
                  : "Showing demo data — backend offline."}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
