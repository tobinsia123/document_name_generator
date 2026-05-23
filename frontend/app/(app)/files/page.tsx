"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Download,
  Filter,
  Lock,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  Upload,
  RefreshCcw,
  FileText,
  Loader2,
  TriangleAlert,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { FileRow } from "@/components/shared/file-row";
import { files as mockFiles } from "@/lib/data";
import type { Sensitivity } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useBackendStatus } from "@/lib/backend-status";
import { flattenManifest, getManifest } from "@/lib/api";
import type { JobManifest } from "@/lib/types";

const sensFilters: ("all" | Sensitivity)[] = [
  "all",
  "public",
  "internal",
  "confidential",
  "restricted",
];

type LiveFile = ReturnType<typeof flattenManifest>[number];

export default function FilesPage() {
  const { mode } = useBackendStatus();
  const isLive = mode === "live";

  const [q, setQ] = useState("");
  const [sens, setSens] = useState<"all" | Sensitivity>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // live data
  const [manifest, setManifest] = useState<JobManifest | null>(null);
  const [manifestPath, setManifestPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setLoadError(null);
    const res = await getManifest();
    if (res) {
      setManifest(res.manifest);
      setManifestPath(res.path);
    } else {
      setManifest(null);
      setLoadError("No manifest found yet. Run a job from the Upload Center.");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isLive) void refresh();
  }, [isLive]);

  const liveRows = useMemo<LiveFile[]>(
    () => (manifest ? flattenManifest(manifest) : []),
    [manifest]
  );

  const filteredLive = useMemo(() => {
    return liveRows.filter((r) => {
      const term = q.toLowerCase();
      const matchesQ =
        !term ||
        r.renamed.toLowerCase().includes(term) ||
        r.original.toLowerCase().includes(term) ||
        r.group.toLowerCase().includes(term);
      // sensitivity not computed by Python — only filter by encryption state
      const matchesSens =
        sens === "all" ||
        (sens === "restricted" && r.encrypted) ||
        (sens === "confidential" && !r.encrypted && r.archive?.archive_path) ||
        (sens === "internal" && !r.archive?.archive_path);
      return matchesQ && matchesSens;
    });
  }, [liveRows, q, sens]);

  const filteredMock = useMemo(() => {
    return mockFiles.filter((f) => {
      const matchesQ =
        !q ||
        (f.renamedTo ?? f.originalName).toLowerCase().includes(q.toLowerCase()) ||
        f.originalName.toLowerCase().includes(q.toLowerCase()) ||
        f.tags.some((t) => t.toLowerCase().includes(q.toLowerCase()));
      const matchesSens = sens === "all" || f.sensitivity === sens;
      return matchesQ && matchesSens;
    });
  }, [q, sens]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search filename, group, original…"
              className="pl-8"
            />
          </div>
          <div className="flex items-center gap-1 rounded-md border border-border bg-card/40 p-1">
            {sensFilters.map((s) => (
              <button
                key={s}
                onClick={() => setSens(s)}
                className={cn(
                  "rounded px-2 py-1 text-[11px] capitalize transition-colors",
                  s === sens
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {s}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-3.5 w-3.5" /> Filters
          </Button>
          <Button variant="outline" size="sm">
            <Settings2 className="h-3.5 w-3.5" /> Columns
          </Button>
          <div className="ml-auto flex items-center gap-2">
            {isLive && (
              <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCcw className="h-3.5 w-3.5" />
                )}
                Refresh
              </Button>
            )}
            <Button size="sm">
              <Upload className="h-3.5 w-3.5" /> Upload
            </Button>
          </div>
        </CardContent>
      </Card>

      {selected.size > 0 && (
        <Card className="border-primary/40 bg-primary/[0.04]">
          <CardContent className="flex items-center justify-between p-3">
            <div className="text-[12.5px]">
              <span className="font-medium">{selected.size}</span> file
              {selected.size > 1 ? "s" : ""} selected
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Sparkles className="h-3.5 w-3.5" /> Re-analyze
              </Button>
              <Button variant="outline" size="sm">
                <Lock className="h-3.5 w-3.5" /> Encrypt
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-3.5 w-3.5" /> Export
              </Button>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-3.5 w-3.5" /> Quarantine
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Live banner with manifest source */}
      {isLive && manifest && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 bg-card/40 px-3 py-2 text-[11.5px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <Badge variant="success" size="sm">live</Badge>
            <span>
              Job <code className="font-mono text-foreground/80">{manifest.job_id.slice(0, 8)}</code> ·
              {" "}
              <span className="text-foreground/80">{manifest.summary.successful}</span> successful ·
              {" "}
              <span className="text-foreground/80">{manifest.summary.groups}</span> groups
            </span>
          </div>
          {manifestPath && <code className="font-mono opacity-70">{manifestPath}</code>}
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-border/70 bg-card/60 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={isLive ? filteredLive.length > 0 && filteredLive.every((f) => selected.has(f.id)) : filteredMock.length > 0 && filteredMock.every((f) => selected.has(f.id))}
              onCheckedChange={(v) => {
                if (v) {
                  setSelected(new Set((isLive ? filteredLive : filteredMock).map((f) => f.id)));
                } else {
                  setSelected(new Set());
                }
              }}
            />
            <span>File</span>
          </div>
          <div />
          <div className="flex items-center gap-4 text-right">
            <div className="hidden md:block w-24">{isLive ? "Doc type" : "Owner"}</div>
            <div className="hidden md:block w-20">{isLive ? "Period" : "Size"}</div>
            <div className="hidden lg:block w-24">{isLive ? "Group" : "Hash"}</div>
            <div className="w-20">{isLive ? "Date" : "Updated"}</div>
          </div>
        </div>

        <div>
          {isLive ? (
            <LiveTable
              loading={loading}
              error={loadError}
              rows={filteredLive}
              selected={selected}
              onToggle={(id) => {
                const next = new Set(selected);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                setSelected(next);
              }}
            />
          ) : filteredMock.length === 0 ? (
            <div className="py-12 text-center text-[12px] text-muted-foreground">
              No files match the current filters.
            </div>
          ) : (
            filteredMock.map((f, i) => (
              <FileRow
                key={f.id}
                file={f}
                index={i}
                selected={selected.has(f.id)}
                onToggle={() => {
                  const next = new Set(selected);
                  if (next.has(f.id)) next.delete(f.id);
                  else next.add(f.id);
                  setSelected(next);
                }}
              />
            ))
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border/70 bg-card/60 px-4 py-2 text-[11px] text-muted-foreground">
          <div>
            {isLive
              ? manifest
                ? `Showing ${filteredLive.length} of ${liveRows.length} renamed files`
                : "Awaiting manifest…"
              : (
                  <>
                    Showing {filteredMock.length} of {mockFiles.length} ·{" "}
                    <Badge variant="muted" size="sm">demo dataset</Badge>
                  </>
                )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="xs" disabled>← Prev</Button>
            <span className="tabular">1 / 1</span>
            <Button variant="ghost" size="xs" disabled>Next →</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function LiveTable({
  loading,
  error,
  rows,
  selected,
  onToggle,
}: {
  loading: boolean;
  error: string | null;
  rows: LiveFile[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  if (loading && rows.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-[12px] text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading manifest…
      </div>
    );
  }
  if (error && rows.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-[12px] text-muted-foreground">
        <TriangleAlert className="h-3.5 w-3.5 text-[color:oklch(0.9_0.15_78)]" />
        {error}
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="py-12 text-center text-[12px] text-muted-foreground">
        No files match the current filters.
      </div>
    );
  }
  return (
    <>
      {rows.map((r, i) => (
        <LiveFileRow
          key={r.id}
          row={r}
          index={i}
          selected={selected.has(r.id)}
          onToggle={() => onToggle(r.id)}
        />
      ))}
    </>
  );
}

function LiveFileRow({
  row,
  selected,
  onToggle,
  index,
}: {
  row: LiveFile;
  selected?: boolean;
  onToggle?: () => void;
  index?: number;
}) {
  const ext = row.renamed.split(".").pop() ?? "";
  return (
    <div
      style={{ animationDelay: `${(index ?? 0) * 18}ms` }}
      className={cn(
        "grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-border/60 px-4 py-2.5 transition-colors hover:bg-white/[0.025]",
        selected && "bg-white/[0.04]"
      )}
    >
      <div className="flex items-center gap-3">
        <Checkbox checked={selected} onCheckedChange={onToggle} aria-label="select" />
        <div className="grid h-7 w-7 place-items-center rounded-md border border-border bg-background/40">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      </div>

      <div className="min-w-0">
        <div className="truncate text-[13px] font-medium text-foreground">
          {row.renamed}
        </div>
        <div className="mt-0.5 truncate text-[10.5px] text-muted-foreground">
          <span className="line-through opacity-60">{row.original}</span>
          <span className="mx-1.5 opacity-50">→</span>
          <span className="text-[color:oklch(0.86_0.13_264)]">renamed</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {row.encrypted ? (
            <Badge variant="success" size="sm">
              <Lock className="h-2.5 w-2.5" />
              AES-256-GCM
            </Badge>
          ) : row.archive?.archive_path ? (
            <Badge variant="info" size="sm">archive</Badge>
          ) : (
            <Badge variant="muted" size="sm">renamed</Badge>
          )}
          {row.ticker && <Badge variant="outline" size="sm">{row.ticker}</Badge>}
          {ext && <Badge variant="muted" size="sm">{ext.toUpperCase()}</Badge>}
        </div>
      </div>

      <div className="flex items-center gap-4 text-right text-[11px] text-muted-foreground tabular">
        <div className="hidden md:block w-24 truncate">{row.docType || "—"}</div>
        <div className="hidden md:block w-20">{row.yearQuarter || "—"}</div>
        <div className="hidden lg:block w-24 truncate font-mono text-muted-foreground/80">
          {row.group}
        </div>
        <div className="w-20">{row.publicationDate || "—"}</div>
      </div>
    </div>
  );
}
