"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { files } from "@/lib/data";
import { cn, formatBytes } from "@/lib/utils";

const workflowStages = [
  {
    title: "Upload & Ingest",
    description: "Bring financial research files into a controlled job without changing originals.",
    next: "Drop PDFs, DOCX files, or transcripts into a new upload batch.",
    icon: UploadCloud,
    progress: 100,
  },
  {
    title: "Extract & Analyze Metadata",
    description: "Parse ticker, publisher, document type, dates, and source signals from messy files.",
    next: "Review extracted metadata before it becomes part of the export manifest.",
    icon: FileSearch,
    progress: 92,
  },
  {
    title: "Classify & Assess Sensitivity",
    description: "Score confidence and sensitivity so analyst and compliance queues stay focused.",
    next: "Filter the review queue by low confidence or high sensitivity.",
    icon: ClipboardCheck,
    progress: 84,
  },
  {
    title: "Rename & Organize",
    description: "Create standardized names and grouped outputs for research retrieval.",
    next: "Approve suggested filenames or edit metadata before export.",
    icon: FileCheck2,
    progress: 76,
  },
  {
    title: "Compress & Encrypt",
    description: "Package reviewed copies into compressed or encrypted deliverables.",
    next: "Choose archive options once review is complete.",
    icon: FileArchive,
    progress: 62,
  },
  {
    title: "Secure Storage & Retrieval",
    description: "Store manifests and final document sets with searchable retrieval metadata.",
    next: "Save metadata to the database or route clean archives to secure storage.",
    icon: Database,
    progress: 58,
  },
];

const activity = [
  {
    title: "AMZN analyst report renamed",
    detail: "evercore_amzn_initiation.pdf became AMZN_EVERCORE_ANALYSTREPORT_INIT_2024Q4_EN_2024-12-04.pdf",
    status: "Renamed",
  },
  {
    title: "Q1 earnings transcript reviewed",
    detail: "Ticker and publisher metadata approved for the earnings transcript batch.",
    status: "Approved",
  },
  {
    title: "SEC filing flagged for manual review",
    detail: "Missing period metadata requires analyst confirmation before export.",
    status: "Needs Review",
  },
  {
    title: "Encrypted archive created",
    detail: "A reviewed document set was packaged with encrypted archive prep.",
    status: "Secured",
  },
];

function needsReview(file: (typeof files)[number]) {
  return file.status === "failed" || !file.renamedTo || file.sensitivityScore >= 88;
}

export default function DashboardPage() {
  const [selectedStage, setSelectedStage] = useState(0);
  const [expandedJob, setExpandedJob] = useState("amzn");

  const summaryCards = useMemo(() => {
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    return [
      {
        title: "Recent Jobs",
        value: "3",
        detail: "Research batches active this week",
        icon: FolderClock,
      },
      {
        title: "Files Processed",
        value: files.length.toString(),
        detail: `${formatBytes(totalSize)} organized`,
        icon: FileStack,
      },
      {
        title: "Files Needing Review",
        value: files.filter(needsReview).length.toString(),
        detail: "Low confidence or sensitive",
        icon: ClipboardCheck,
      },
      {
        title: "Secure Archives Created",
        value: files.filter((file) => file.status === "archived").length.toString(),
        detail: "Ready for retrieval",
        icon: LockKeyhole,
      },
    ];
  }, []);

  const selected = workflowStages[selectedStage];
  const SelectedIcon = selected.icon;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-[oklch(0.78_0.03_242)] bg-[linear-gradient(135deg,oklch(0.12_0.035_260),oklch(0.07_0.025_260))] p-6 text-white shadow-[0_26px_72px_-44px_oklch(0.1_0.04_260/0.9)] md:p-8">
        <div className="relative">
          <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-[oklch(0.58_0.22_286/0.22)] blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <h2 className="text-3xl font-semibold leading-tight tracking-normal md:text-4xl">
                Financial research operations, from upload to secure retrieval.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/66">
                Track document batches, review metadata quality, and move approved research sets
                into encrypted archives without losing sight of raw source files.
              </p>
            </div>
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
      </section>

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
              Click a stage to see what RoboVault does there and what to do next.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {workflowStages.map((stage, index) => {
                const Icon = stage.icon;
                const active = selectedStage === index;
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
                        {stage.progress}%
                      </Badge>
                    </div>
                    <h3 className="mt-4 text-sm font-semibold text-foreground">
                      {stage.title}
                    </h3>
                    <Progress value={stage.progress} className="mt-3 h-1.5" />
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
            <Button asChild className="mt-5 w-full rounded-lg bg-[oklch(0.46_0.18_282)] text-white hover:bg-[oklch(0.42_0.18_282)]">
              <Link href={selectedStage <= 1 ? "/upload" : selectedStage <= 3 ? "/review" : "/export"}>
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
            <CardDescription>Expandable batch details for active document work.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              {
                id: "amzn",
                title: "AMZN research refresh",
                detail: "Analyst reports, earnings calls, and SEC filings",
                files: "6 files",
                status: "Ready for review",
              },
              {
                id: "sec",
                title: "SEC filing archive",
                detail: "10-K, 10-Q, and exhibit cleanup",
                files: "4 files",
                status: "Export ready",
              },
              {
                id: "publisher",
                title: "Publisher cleanup",
                detail: "Brokerage report normalization",
                files: "8 files",
                status: "Needs review",
              },
            ].map((job) => {
              const open = expandedJob === job.id;
              return (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => setExpandedJob(open ? "" : job.id)}
                  className={cn(
                    "w-full rounded-xl border p-4 text-left transition",
                    open
                      ? "border-[oklch(0.5_0.16_280)] bg-[oklch(0.96_0.024_278)]"
                      : "border-border/70 bg-[oklch(0.99_0.004_240)] hover:border-[oklch(0.62_0.12_270)]"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-foreground">{job.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {job.detail} · {job.files}
                      </div>
                    </div>
                    <Badge variant={job.status === "Needs review" ? "warning" : "primary"}>
                      {job.status}
                    </Badge>
                  </div>
                  {open && (
                    <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded-lg bg-white p-3">
                        <div className="text-muted-foreground">Owner</div>
                        <div className="mt-1 font-medium">Research Ops</div>
                      </div>
                      <div className="rounded-lg bg-white p-3">
                        <div className="text-muted-foreground">Next step</div>
                        <div className="mt-1 font-medium">Review metadata</div>
                      </div>
                      <div className="rounded-lg bg-white p-3">
                        <div className="text-muted-foreground">Archive</div>
                        <div className="mt-1 font-medium">Encrypted</div>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Archive className="h-4 w-4 text-primary" />
              Recent Activity
            </CardTitle>
            <CardDescription>Financial document activity across the workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activity.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-border/70 bg-[oklch(0.99_0.004_240)] p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-foreground">{item.title}</div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</p>
                  </div>
                  <Badge
                    variant={
                      item.status === "Needs Review"
                        ? "warning"
                        : item.status === "Secured"
                        ? "success"
                        : "primary"
                    }
                  >
                    {item.status}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
