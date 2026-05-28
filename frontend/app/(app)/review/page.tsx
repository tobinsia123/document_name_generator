"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  ExternalLink,
  FileSearch,
  Flag,
  RefreshCcw,
  Search,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useBackendStatus } from "@/lib/backend-status";
import {
  flattenManifest,
  getManifest,
  getReviews,
  openInOS,
  setReview as setReviewRemote,
} from "@/lib/api";
import { files } from "@/lib/data";
import { cn } from "@/lib/utils";
import type { JobManifest, ReviewsMap } from "@/lib/types";

type ReviewStatus = "approved" | "flagged" | "pending";
type Filter =
  | "All Files"
  | "Pending"
  | "Approved"
  | "Flagged"
  | "Has Archive"
  | "Encrypted";

const filters: Filter[] = [
  "All Files",
  "Pending",
  "Approved",
  "Flagged",
  "Has Archive",
  "Encrypted",
];

type LiveRow = ReturnType<typeof flattenManifest>[number];

function ConfidenceBadge({ row }: { row: LiveRow }) {
  const missing =
    !row.ticker || !row.docType || !row.yearQuarter || !row.publicationDate;
  if (missing) return <Badge variant="warning">Medium</Badge>;
  return <Badge variant="success">High</Badge>;
}

export default function ReviewPage() {
  const { mode } = useBackendStatus();
  const isLive = mode === "live";

  if (!isLive) return <DemoReview />;
  return <LiveReview />;
}

/* -------------------- LIVE -------------------- */

function LiveReview() {
  const [manifest, setManifest] = useState<JobManifest | null>(null);
  const [reviews, setReviews] = useState<ReviewsMap>({});
  const [activeFilter, setActiveFilter] = useState<Filter>("All Files");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, r] = await Promise.all([getManifest(), getReviews()]);
      setManifest(m?.manifest ?? null);
      setReviews(r ?? {});
      if (!m) setError("No manifest found. Run a job first.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load review data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const rows = useMemo(
    () => (manifest ? flattenManifest(manifest) : []),
    [manifest]
  );

  const enriched: Array<LiveRow & { status: ReviewStatus; note: string | null }> =
    rows.map((row) => {
      const review = reviews[row.renamed];
      const status: ReviewStatus = (review?.status as ReviewStatus | undefined) ?? "pending";
      return { ...row, status, note: review?.note ?? null };
    });

  const filteredRows = enriched.filter((row) => {
    const haystack = [
      row.original,
      row.renamed,
      row.ticker,
      row.publisher,
      row.docType,
      row.yearQuarter,
      row.publicationDate,
    ]
      .join(" ")
      .toLowerCase();
    if (query && !haystack.includes(query.toLowerCase())) return false;
    if (activeFilter === "All Files") return true;
    if (activeFilter === "Pending") return row.status === "pending";
    if (activeFilter === "Approved") return row.status === "approved";
    if (activeFilter === "Flagged") return row.status === "flagged";
    if (activeFilter === "Has Archive") return Boolean(row.archive?.archive_path);
    if (activeFilter === "Encrypted") return row.encrypted;
    return true;
  });

  const summary = [
    { label: "Total Files", value: rows.length.toString(), note: "In manifest" },
    {
      label: "Pending Review",
      value: enriched.filter((r) => r.status === "pending").length.toString(),
      note: "No decision yet",
    },
    {
      label: "Approved",
      value: enriched.filter((r) => r.status === "approved").length.toString(),
      note: "Locked in",
    },
    {
      label: "Flagged",
      value: enriched.filter((r) => r.status === "flagged").length.toString(),
      note: "Needs attention",
    },
  ];

  async function setRow(row: LiveRow, status: "approved" | "flagged" | null) {
    setBusyKey(row.renamed);
    try {
      const next = await setReviewRemote(row.renamed, status);
      setReviews(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save review");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summary.map((item) => (
          <Card key={item.label} className="bg-white">
            <CardContent className="p-5">
              <p className="text-xs font-medium text-muted-foreground">
                {item.label}
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-normal text-[oklch(0.2_0.045_260)]">
                {item.value}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">{item.note}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="bg-white">
        <CardHeader>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileSearch className="h-4 w-4 text-primary" />
                Review renamed documents
              </CardTitle>
              <CardDescription>
                {manifest
                  ? `${manifest.ticker} · job ${manifest.job_id.slice(0, 8)} · ${rows.length} files`
                  : "Loading manifest…"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void refresh()}
                disabled={loading}
              >
                <RefreshCcw
                  className={cn("h-3.5 w-3.5", loading && "animate-spin")}
                />
                Refresh
              </Button>
              <div className="relative w-full xl:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search filename, ticker, publisher…"
                  className="h-10 bg-background/70 pl-9"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </div>
          )}

          <div className="mb-5 flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-xs font-medium transition",
                  activeFilter === filter
                    ? "border-[oklch(0.5_0.16_280)] bg-[oklch(0.96_0.024_278)] text-[oklch(0.34_0.12_280)]"
                    : "border-border bg-white text-muted-foreground hover:border-[oklch(0.62_0.12_270)] hover:text-foreground"
                )}
              >
                {filter}
              </button>
            ))}
          </div>

          {rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 py-12 text-center text-sm text-muted-foreground">
              No files in manifest. Run a job from the Upload page first.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/70">
              <table className="w-full min-w-[1080px] border-separate border-spacing-0 text-left text-sm">
                <thead className="bg-[oklch(0.98_0.01_245)]">
                  <tr className="text-xs text-muted-foreground">
                    <th className="border-b border-border/70 px-4 py-3 font-medium">
                      Original
                    </th>
                    <th className="border-b border-border/70 px-4 py-3 font-medium">
                      Renamed
                    </th>
                    <th className="border-b border-border/70 px-4 py-3 font-medium">
                      Type
                    </th>
                    <th className="border-b border-border/70 px-4 py-3 font-medium">
                      Period
                    </th>
                    <th className="border-b border-border/70 px-4 py-3 font-medium">
                      Confidence
                    </th>
                    <th className="border-b border-border/70 px-4 py-3 font-medium">
                      Archive
                    </th>
                    <th className="border-b border-border/70 px-4 py-3 font-medium">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => {
                    const isBusy = busyKey === row.renamed;
                    return (
                      <tr
                        key={row.id}
                        className={cn(
                          "align-middle transition-colors",
                          row.status === "approved" && "bg-[oklch(0.985_0.018_158)]",
                          row.status === "flagged" && "bg-[oklch(0.98_0.025_78)]"
                        )}
                      >
                        <td className="max-w-[240px] border-b border-border/50 px-4 py-3.5">
                          <div className="truncate text-xs text-muted-foreground" title={row.original}>
                            {row.original}
                          </div>
                          <div className="mt-1 text-xs font-medium text-foreground">
                            {row.ticker || "—"} · {row.publisher || "—"}
                          </div>
                        </td>
                        <td className="max-w-[300px] border-b border-border/50 px-4 py-3.5">
                          <button
                            type="button"
                            onClick={() => void openInOS(row.new_path)}
                            title={`Reveal ${row.new_path} in Finder`}
                            className="group flex items-center gap-1.5 text-left"
                          >
                            <span className="truncate rounded-md bg-white/70 px-2 py-1 font-mono text-[11px] text-[oklch(0.32_0.07_260)] group-hover:bg-white">
                              {row.renamed}
                            </span>
                            <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                          </button>
                        </td>
                        <td className="border-b border-border/50 px-4 py-3.5 text-xs">
                          {row.docType.replace(/_/g, " ") || "—"}
                        </td>
                        <td className="border-b border-border/50 px-4 py-3.5 text-xs">
                          {row.yearQuarter}
                          {row.publicationDate ? ` · ${row.publicationDate}` : ""}
                        </td>
                        <td className="border-b border-border/50 px-4 py-3.5">
                          <ConfidenceBadge row={row} />
                        </td>
                        <td className="border-b border-border/50 px-4 py-3.5">
                          {row.archive ? (
                            <Badge
                              variant={row.encrypted ? "primary" : "muted"}
                              size="sm"
                            >
                              {row.encrypted ? "Encrypted" : "Plain"}
                            </Badge>
                          ) : (
                            <Badge variant="muted" size="sm">
                              —
                            </Badge>
                          )}
                        </td>
                        <td className="border-b border-border/50 px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <Button
                              type="button"
                              size="xs"
                              variant={row.status === "approved" ? "secondary" : "outline"}
                              disabled={isBusy}
                              onClick={() =>
                                void setRow(
                                  row,
                                  row.status === "approved" ? null : "approved"
                                )
                              }
                              title={row.status === "approved" ? "Unapprove" : "Approve"}
                            >
                              <Check className="h-3.5 w-3.5" />
                              {row.status === "approved" ? "Approved" : "Approve"}
                            </Button>
                            <Button
                              type="button"
                              size="xs"
                              variant={row.status === "flagged" ? "secondary" : "ghost"}
                              disabled={isBusy}
                              onClick={() =>
                                void setRow(
                                  row,
                                  row.status === "flagged" ? null : "flagged"
                                )
                              }
                              title={row.status === "flagged" ? "Unflag" : "Flag"}
                            >
                              <Flag className="h-3.5 w-3.5" />
                              {row.status === "flagged" ? "Flagged" : "Flag"}
                            </Button>
                            {row.status !== "pending" && (
                              <Button
                                type="button"
                                size="xs"
                                variant="ghost"
                                disabled={isBusy}
                                onClick={() => void setRow(row, null)}
                                title="Clear decision"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {rows.length > 0 && filteredRows.length === 0 && (
            <div className="rounded-xl border border-dashed border-border/70 py-10 text-center text-sm text-muted-foreground">
              No files match the current filter.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* -------------------- DEMO (backend offline) -------------------- */

function DemoReview() {
  const [activeFilter, setActiveFilter] = useState<Filter>("All Files");
  const [query, setQuery] = useState("");
  const [statuses, setStatuses] = useState<Record<string, ReviewStatus>>({});

  const rows = files.map((file) => ({ file, status: statuses[file.id] ?? "pending" }));
  const filtered = rows.filter((row) => {
    const haystack = [row.file.originalName, row.file.renamedTo, row.file.ticker]
      .join(" ")
      .toLowerCase();
    if (query && !haystack.includes(query.toLowerCase())) return false;
    if (activeFilter === "Pending") return row.status === "pending";
    if (activeFilter === "Approved") return row.status === "approved";
    if (activeFilter === "Flagged") return row.status === "flagged";
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[oklch(0.76_0.18_78/0.45)] bg-[oklch(0.99_0.04_78)] p-4 text-sm text-[oklch(0.36_0.16_78)]">
        <div className="font-medium">Backend offline — showing demo files.</div>
        <p className="mt-1 text-xs text-[oklch(0.46_0.16_78)]">
          Start Flask (
          <code className="rounded bg-[oklch(0.96_0.04_78)] px-1">python web_app.py</code> in{" "}
          <code>raw_data/AMAZON</code>) and run a job to see real review data.
        </p>
      </div>

      <Card className="bg-white">
        <CardHeader>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileSearch className="h-4 w-4 text-primary" />
                Demo review queue
              </CardTitle>
              <CardDescription>UI-only state — does not persist.</CardDescription>
            </div>
            <div className="relative w-full xl:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search files…"
                className="h-10 bg-background/70 pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-5 flex flex-wrap gap-2">
            {(["All Files", "Pending", "Approved", "Flagged"] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setActiveFilter(f)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-xs font-medium transition",
                  activeFilter === f
                    ? "border-[oklch(0.5_0.16_280)] bg-[oklch(0.96_0.024_278)] text-[oklch(0.34_0.12_280)]"
                    : "border-border bg-white text-muted-foreground hover:border-[oklch(0.62_0.12_270)] hover:text-foreground"
                )}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {filtered.map((row) => (
              <div
                key={row.file.id}
                className={cn(
                  "flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-white px-4 py-3",
                  row.status === "approved" && "bg-[oklch(0.985_0.018_158)]",
                  row.status === "flagged" && "bg-[oklch(0.98_0.025_78)]"
                )}
              >
                <div className="min-w-0">
                  <div className="truncate text-xs text-muted-foreground">
                    {row.file.originalName}
                  </div>
                  <div className="mt-1 truncate font-mono text-xs text-[oklch(0.32_0.07_260)]">
                    {row.file.renamedTo ?? "no proposed name"}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="xs"
                    variant={row.status === "approved" ? "secondary" : "outline"}
                    onClick={() =>
                      setStatuses((prev) => ({
                        ...prev,
                        [row.file.id]: prev[row.file.id] === "approved" ? "pending" : "approved",
                      }))
                    }
                  >
                    <Check className="h-3.5 w-3.5" />
                    Approve
                  </Button>
                  <Button
                    size="xs"
                    variant={row.status === "flagged" ? "secondary" : "ghost"}
                    onClick={() =>
                      setStatuses((prev) => ({
                        ...prev,
                        [row.file.id]: prev[row.file.id] === "flagged" ? "pending" : "flagged",
                      }))
                    }
                  >
                    <Flag className="h-3.5 w-3.5" />
                    Flag
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
