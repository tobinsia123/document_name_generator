"use client";

import { useMemo, useState } from "react";
import {
  Download,
  Filter,
  Lock,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { FileRow } from "@/components/shared/file-row";
import { files } from "@/lib/data";
import type { Sensitivity } from "@/lib/types";
import { cn } from "@/lib/utils";

const sensFilters: ("all" | Sensitivity)[] = ["all", "public", "internal", "confidential", "restricted"];

export default function FilesPage() {
  const [q, setQ] = useState("");
  const [sens, setSens] = useState<"all" | Sensitivity>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    return files.filter((f) => {
      const matchesQ =
        !q ||
        (f.renamedTo ?? f.originalName).toLowerCase().includes(q.toLowerCase()) ||
        f.originalName.toLowerCase().includes(q.toLowerCase()) ||
        f.tags.some((t) => t.toLowerCase().includes(q.toLowerCase()));
      const matchesSens = sens === "all" || f.sensitivity === sens;
      return matchesQ && matchesSens;
    });
  }, [q, sens]);

  const allChecked = filtered.length > 0 && filtered.every((f) => selected.has(f.id));

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by filename, tag, hash…"
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

      <Card className="overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-border/70 bg-card/60 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={allChecked}
              onCheckedChange={(v) => {
                if (v) setSelected(new Set(filtered.map((f) => f.id)));
                else setSelected(new Set());
              }}
            />
            <span>File</span>
          </div>
          <div />
          <div className="flex items-center gap-4 text-right">
            <div className="hidden md:block w-20">Owner</div>
            <div className="hidden md:block w-16">Size</div>
            <div className="hidden lg:block w-24">Hash</div>
            <div className="w-16">Updated</div>
          </div>
        </div>
        <div>
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-[12px] text-muted-foreground">
              No files match the current filters.
            </div>
          ) : (
            filtered.map((f, i) => (
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
            Showing {filtered.length} of {files.length} ·{" "}
            <Badge variant="muted" size="sm">
              412,881 total under governance
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="xs" disabled>
              ← Prev
            </Button>
            <span className="tabular">1 / 1</span>
            <Button variant="ghost" size="xs" disabled>
              Next →
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
