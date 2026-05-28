"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  CheckCircle2,
  Download,
  ExternalLink,
  FileArchive,
  FileJson,
  FolderDown,
  LockKeyhole,
  RefreshCcw,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useBackendStatus } from "@/lib/backend-status";
import {
  downloadFile,
  downloadMacosOpener,
  flattenManifest,
  getManifest,
  openInOS,
  rollback,
} from "@/lib/api";
import { cn, formatBytes } from "@/lib/utils";
import { toast } from "sonner";
import type { JobManifest } from "@/lib/types";

export default function ExportPage() {
  const { mode } = useBackendStatus();
  if (mode !== "live") return <DemoExport />;
  return <LiveExport />;
}

/* -------------------- LIVE -------------------- */

function LiveExport() {
  const [manifestPath, setManifestPath] = useState<string | null>(null);
  const [manifest, setManifest] = useState<JobManifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [rolling, setRolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const m = await getManifest();
      setManifest(m?.manifest ?? null);
      setManifestPath(m?.path ?? null);
      if (!m) setError("No manifest found. Run a job from the Upload page first.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load manifest");
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

  const archives = useMemo(() => {
    if (!manifest) return [];
    return Object.entries(manifest.quickfinder_groups).map(([key, group]) => ({
      key,
      group,
      archive: group.archive,
    }));
  }, [manifest]);

  const totalArchives = archives.filter((a) => a.archive?.archive_path || a.archive?.encrypted_archive_path).length;
  const totalEncrypted = archives.filter((a) => a.archive?.encrypted_archive_path).length;

  const renamedDirOnDisk = manifest?.copy_to_dir ?? null;

  async function handleRollback() {
    if (!manifestPath) return;
    if (
      !window.confirm(
        "Rollback will delete the renamed copies and archives created by this manifest. Continue?"
      )
    ) {
      return;
    }
    setRolling(true);
    try {
      const { removed } = await rollback(manifestPath);
      toast.success(`Rollback complete — removed ${removed.length} entries`);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Rollback failed");
    } finally {
      setRolling(false);
    }
  }

  function handleDownloadManifest() {
    if (!manifestPath) return;
    downloadFile(manifestPath, "job_manifest.json");
  }

  function handleDownloadArchive(archivePath: string) {
    const name = archivePath.split("/").pop() ?? "archive";
    downloadFile(archivePath, name);
  }

  function handleOpenWorkspace() {
    if (!renamedDirOnDisk) return;
    void openInOS(renamedDirOnDisk).then((ok) => {
      if (!ok) toast.error("Could not open in Finder");
    });
  }

  const summary = manifest
    ? [
        {
          label: "Files",
          value: manifest.summary.successful.toString(),
          note: `of ${manifest.summary.total_processed} processed`,
        },
        {
          label: "Groups",
          value: manifest.summary.groups.toString(),
          note: "Quickfinder buckets",
        },
        {
          label: "Archives",
          value: totalArchives.toString(),
          note: `${manifest.summary.archives_created} created in job`,
        },
        {
          label: "Encrypted",
          value: totalEncrypted.toString(),
          note: totalArchives > 0 ? `of ${totalArchives} archives` : "—",
        },
        {
          label: "Failed",
          value: manifest.summary.failed.toString(),
          note: manifest.summary.failed === 0 ? "Clean run" : "Review failures",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-[oklch(0.78_0.03_242)] bg-[linear-gradient(135deg,oklch(0.12_0.035_260),oklch(0.07_0.025_260))] p-6 text-white shadow-[0_26px_72px_-44px_oklch(0.1_0.04_260/0.9)] md:p-8">
        <div className="relative grid gap-8 lg:grid-cols-[1fr_320px] lg:items-center">
          <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-[oklch(0.58_0.22_286/0.22)] blur-3xl" />
          <div className="relative">
            <Badge variant="success" className="mb-4">
              Export center
            </Badge>
            <h2 className="text-3xl font-semibold tracking-normal md:text-4xl">
              Your clean document set is ready.
            </h2>
            {manifest ? (
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/66">
                Job <span className="font-mono">{manifest.job_id.slice(0, 8)}</span> ·
                Ticker <span className="font-semibold text-white">{manifest.ticker}</span> ·{" "}
                {manifest.summary.successful} files in {manifest.summary.groups} groups, {totalEncrypted}{" "}
                encrypted archive{totalEncrypted === 1 ? "" : "s"}.
              </p>
            ) : (
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/66">
                {loading
                  ? "Loading manifest from the Python backend…"
                  : "No manifest yet — run a job from the Upload page to populate this view."}
              </p>
            )}
            <div className="mt-7 flex flex-wrap gap-3">
              <Button
                size="lg"
                disabled={!manifestPath}
                onClick={handleDownloadManifest}
                className="h-11 rounded-lg bg-[oklch(0.58_0.22_286)] px-6 text-white shadow-[0_0_30px_oklch(0.58_0.22_286/0.42)] hover:bg-[oklch(0.54_0.22_286)] disabled:opacity-50"
              >
                <FileJson className="h-4 w-4" />
                Download Manifest
              </Button>
              <Button
                size="lg"
                variant="outline"
                disabled={!renamedDirOnDisk}
                onClick={handleOpenWorkspace}
                className="h-11 rounded-lg border-white/15 bg-white/8 px-5 text-white hover:bg-white/15 hover:text-white"
              >
                <ExternalLink className="h-4 w-4" />
                Reveal Workspace
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => void refresh()}
                disabled={loading}
                className="h-11 rounded-lg border-white/15 bg-white/8 px-5 text-white hover:bg-white/15 hover:text-white"
              >
                <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </div>
          <div className="relative rounded-2xl border border-white/10 bg-white/8 p-5 backdrop-blur">
            <div className="flex items-center justify-between">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/10 text-white">
                <Archive className="h-5 w-5" />
              </div>
              <Badge variant={totalArchives > 0 ? "success" : "muted"}>
                {totalArchives}/{archives.length} archived
              </Badge>
            </div>
            <div className="mt-5 text-sm font-medium">Delivery readiness</div>
            <Progress
              value={archives.length ? (totalArchives / archives.length) * 100 : 0}
              className="mt-4 h-1.5"
            />
            <p className="mt-4 text-xs leading-5 text-white/60">
              {totalEncrypted > 0
                ? `${totalEncrypted} encrypted archive${totalEncrypted === 1 ? "" : "s"} ready for distribution.`
                : "No encrypted archives — enable encryption in Upload to generate sealed bundles."}
            </p>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {manifest && (
        <>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            {summary.map((item) => (
              <Card key={item.label} className="bg-white">
                <CardContent className="p-5">
                  <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                  <p className="mt-3 text-2xl font-semibold tracking-normal text-[oklch(0.2_0.045_260)]">
                    {item.value}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.note}</p>
                </CardContent>
              </Card>
            ))}
          </section>

          {totalEncrypted > 0 && (
            <Card className="border-[oklch(0.58_0.14_158/0.35)] bg-[oklch(0.98_0.02_158)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[oklch(0.28_0.12_158)]">
                  <LockKeyhole className="h-4 w-4" />
                  Open .enc files on your Mac
                </CardTitle>
                <CardDescription>
                  macOS does not natively understand RoboVault&apos;s DRENC1 format. Install the
                  free opener once — then double-click any downloaded{" "}
                  <code className="text-xs">.tar.zst.enc</code> and enter the same passphrase you
                  used on Upload.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <ol className="list-decimal space-y-1 pl-4 text-xs leading-5 text-muted-foreground">
                  <li>Download and unzip RoboVault Opener</li>
                  <li>Move the app to Applications</li>
                  <li>
                    Run{" "}
                    <code className="rounded bg-white/80 px-1 font-mono text-[10px]">
                      ./tools/install-macos-opener.sh
                    </code>{" "}
                    in <code className="font-mono text-[10px]">raw_data/AMAZON</code> (or use Open
                    With → Always)
                  </li>
                  <li>Double-click your .enc file — passphrase prompt appears</li>
                </ol>
                <Button
                  type="button"
                  className="shrink-0 rounded-lg bg-[oklch(0.46_0.18_282)] text-white hover:bg-[oklch(0.42_0.18_282)]"
                  onClick={() => {
                    downloadMacosOpener();
                    toast.success("Downloading RoboVault Opener for macOS…");
                  }}
                >
                  <Download className="h-4 w-4" />
                  Download macOS opener
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="bg-white">
            <CardHeader>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileArchive className="h-4 w-4 text-primary" />
                    Archives
                  </CardTitle>
                  <CardDescription>
                    {archives.length === 0
                      ? "No archive groups in this manifest"
                      : `${archives.length} archive groups · click to download or reveal`}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!manifestPath || rolling}
                  onClick={handleRollback}
                  className="self-start"
                >
                  <RotateCcw
                    className={cn("h-3.5 w-3.5", rolling && "animate-spin")}
                  />
                  Rollback this manifest
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {archives.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/70 py-10 text-center text-sm text-muted-foreground">
                  No quickfinder groups yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {archives.map(({ key, group, archive }) => {
                    const hasArchive = Boolean(archive?.archive_path);
                    const isEncrypted = Boolean(archive?.encrypted_archive_path);
                    return (
                      <div
                        key={key}
                        className={cn(
                          "rounded-xl border p-4 transition hover:-translate-y-0.5 hover:border-[oklch(0.62_0.12_270)] hover:shadow-[0_18px_36px_-32px_oklch(0.22_0.05_260/0.5)]",
                          isEncrypted
                            ? "border-[oklch(0.58_0.14_158/0.4)] bg-[oklch(0.97_0.02_158)]"
                            : hasArchive
                            ? "border-[oklch(0.84_0.026_242)] bg-[oklch(0.99_0.004_240)]"
                            : "border-dashed border-border/70 bg-white"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-foreground" title={key}>
                              {key}
                            </div>
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              {group.file_count} file{group.file_count === 1 ? "" : "s"}
                            </div>
                          </div>
                          {isEncrypted ? (
                            <Badge variant="success">
                              <LockKeyhole className="h-3 w-3" />
                              Encrypted
                            </Badge>
                          ) : hasArchive ? (
                            <Badge variant="primary">
                              <FileArchive className="h-3 w-3" />
                              Archived
                            </Badge>
                          ) : (
                            <Badge variant="muted">No archive</Badge>
                          )}
                        </div>

                        {archive && (
                          <dl className="mt-3 space-y-1 text-[11px] text-muted-foreground">
                            {archive.compression_level !== undefined && (
                              <div>
                                <span className="text-foreground/60">compression:</span>{" "}
                                level {archive.compression_level}
                              </div>
                            )}
                            {archive.encryption_algorithm && (
                              <div>
                                <span className="text-foreground/60">cipher:</span>{" "}
                                {archive.encryption_algorithm}
                              </div>
                            )}
                            {archive.checksum_sha256 && (
                              <div className="truncate">
                                <span className="text-foreground/60">sha256:</span>{" "}
                                <code className="font-mono text-[10px]">{archive.checksum_sha256.slice(0, 16)}…</code>
                              </div>
                            )}
                          </dl>
                        )}

                        <div className="mt-4 flex flex-wrap gap-1.5">
                          {isEncrypted && archive?.encrypted_archive_path && (
                            <Button
                              type="button"
                              size="xs"
                              variant="outline"
                              onClick={() => handleDownloadArchive(archive.encrypted_archive_path!)}
                            >
                              <Download className="h-3 w-3" />
                              .enc
                            </Button>
                          )}
                          {hasArchive && archive?.archive_path && (
                            <Button
                              type="button"
                              size="xs"
                              variant="outline"
                              onClick={() => handleDownloadArchive(archive.archive_path!)}
                            >
                              <Download className="h-3 w-3" />
                              .tar.zst
                            </Button>
                          )}
                          {(archive?.archive_path || archive?.encrypted_archive_path) && (
                            <Button
                              type="button"
                              size="xs"
                              variant="ghost"
                              onClick={() =>
                                void openInOS(
                                  archive!.encrypted_archive_path ?? archive!.archive_path!
                                )
                              }
                            >
                              <ExternalLink className="h-3 w-3" />
                              Reveal
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderDown className="h-4 w-4 text-primary" />
                Files in this manifest
              </CardTitle>
              <CardDescription>
                {rows.length} renamed files · click any name to download or reveal in Finder
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-xl border border-border/70">
                <table className="w-full min-w-[860px] border-separate border-spacing-0 text-left text-sm">
                  <thead className="bg-[oklch(0.98_0.01_245)]">
                    <tr className="text-xs text-muted-foreground">
                      <th className="border-b border-border/70 px-4 py-3 font-medium">Original</th>
                      <th className="border-b border-border/70 px-4 py-3 font-medium">Renamed</th>
                      <th className="border-b border-border/70 px-4 py-3 font-medium">Group</th>
                      <th className="border-b border-border/70 px-4 py-3 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 200).map((row) => (
                      <tr key={row.id} className="hover:bg-[oklch(0.98_0.008_245)]">
                        <td className="max-w-[260px] border-b border-border/50 px-4 py-2.5">
                          <div className="truncate text-xs text-muted-foreground" title={row.original}>
                            {row.original}
                          </div>
                        </td>
                        <td className="max-w-[320px] border-b border-border/50 px-4 py-2.5">
                          <div className="truncate font-mono text-[11px] text-[oklch(0.32_0.07_260)]" title={row.renamed}>
                            {row.renamed}
                          </div>
                        </td>
                        <td className="border-b border-border/50 px-4 py-2.5 text-xs text-muted-foreground">
                          {row.group}
                        </td>
                        <td className="border-b border-border/50 px-4 py-2.5 text-right">
                          <div className="inline-flex items-center gap-1">
                            <Button
                              type="button"
                              size="xs"
                              variant="ghost"
                              onClick={() => downloadFile(row.new_path, row.renamed)}
                              title="Download file"
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                            <Button
                              type="button"
                              size="xs"
                              variant="ghost"
                              onClick={() => void openInOS(row.new_path)}
                              title="Reveal in Finder"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > 200 && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Showing first 200 of {rows.length} files. Use the File Explorer to browse all.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

/* -------------------- DEMO -------------------- */

const demoOptions = [
  {
    id: "files",
    title: "Download Renamed Files",
    body: "Receive clean copies using RoboVault's standardized naming format.",
    icon: FolderDown,
  },
  {
    id: "manifest",
    title: "Download JSON Manifest",
    body: "Export extracted metadata, hashes, source names, and review decisions.",
    icon: FileJson,
  },
  {
    id: "compressed",
    title: "Create Compressed Archive",
    body: "Bundle renamed files and the manifest into a single archive.",
    icon: FileArchive,
  },
  {
    id: "encrypted",
    title: "Create Encrypted Archive",
    body: "Protect the final package for secure sharing and retention.",
    icon: LockKeyhole,
  },
];

function DemoExport() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[oklch(0.76_0.18_78/0.45)] bg-[oklch(0.99_0.04_78)] p-4 text-sm text-[oklch(0.36_0.16_78)]">
        <div className="font-medium">Backend offline — export actions are disabled in demo mode.</div>
        <p className="mt-1 text-xs text-[oklch(0.46_0.16_78)]">
          Start Flask (
          <code className="rounded bg-[oklch(0.96_0.04_78)] px-1">python web_app.py</code> in{" "}
          <code>raw_data/AMAZON</code>) and run a job to enable real downloads.
        </p>
      </div>

      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            What you&apos;ll see when wired
          </CardTitle>
          <CardDescription>
            These actions become live once a job manifest exists on disk.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {demoOptions.map((opt) => {
              const Icon = opt.icon;
              return (
                <div
                  key={opt.id}
                  className="rounded-xl border border-[oklch(0.84_0.026_242)] bg-[oklch(0.99_0.004_240)] p-5"
                >
                  <div className="grid h-11 w-11 place-items-center rounded-lg bg-white text-[oklch(0.46_0.18_282)] shadow-[0_0_0_1px_oklch(0.86_0.024_240)]">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold leading-5 text-foreground">
                    {opt.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{opt.body}</p>
                  <div className="mt-4 inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3" />
                    Available in live mode
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// keep referenced types from being tree-shaken (no-ops at runtime)
void formatBytes;
