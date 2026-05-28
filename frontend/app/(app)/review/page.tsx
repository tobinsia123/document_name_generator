"use client";

import { useMemo, useState } from "react";
import { Check, Edit3, Flag, FileSearch, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { files } from "@/lib/data";
import { cn } from "@/lib/utils";

type Confidence = "High" | "Medium" | "Low";
type Sensitivity = "Low" | "Medium" | "High";
type ReviewStatus = "pending" | "approved" | "flagged";
type Filter =
  | "All Files"
  | "Needs Review"
  | "High Confidence"
  | "Low Confidence"
  | "Sensitive"
  | "Approved"
  | "Flagged";

type FileRecord = (typeof files)[number];

interface MetadataDraft {
  suggestedName: string;
  reportType: string;
  ticker: string;
  publisher: string;
}

function confidenceFor(file: FileRecord): Confidence {
  if (file.status === "failed" || !file.renamedTo) return "Low";
  if (file.sensitivityScore >= 85 || !file.ticker || !file.publisher) return "Medium";
  return "High";
}

function sensitivityFor(file: FileRecord): Sensitivity {
  if (file.sensitivityScore >= 75) return "High";
  if (file.sensitivityScore >= 35) return "Medium";
  return "Low";
}

function confidenceVariant(value: Confidence) {
  if (value === "High") return "success" as const;
  if (value === "Medium") return "primary" as const;
  return "warning" as const;
}

function sensitivityVariant(value: Sensitivity) {
  if (value === "High") return "destructive" as const;
  if (value === "Medium") return "warning" as const;
  return "info" as const;
}

function initialDraft(file: FileRecord): MetadataDraft {
  return {
    suggestedName: file.renamedTo ?? "",
    reportType: file.reportType ?? "",
    ticker: file.ticker ?? "",
    publisher: file.publisher ?? "",
  };
}

const filters: Filter[] = [
  "All Files",
  "Needs Review",
  "High Confidence",
  "Low Confidence",
  "Sensitive",
  "Approved",
  "Flagged",
];

export default function ReviewPage() {
  const [activeFilter, setActiveFilter] = useState<Filter>("All Files");
  const [query, setQuery] = useState("");
  const [statuses, setStatuses] = useState<Record<string, ReviewStatus>>({});
  const [metadata, setMetadata] = useState<Record<string, MetadataDraft>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<MetadataDraft | null>(null);

  const rows = useMemo(
    () =>
      files.map((file) => {
        const fileMetadata = metadata[file.id] ?? initialDraft(file);
        const confidence = confidenceFor(file);
        const sensitivity = sensitivityFor(file);
        const status = statuses[file.id] ?? "pending";
        return { file, metadata: fileMetadata, confidence, sensitivity, status };
      }),
    [metadata, statuses]
  );

  const filteredRows = rows.filter((row) => {
    const text = [
      row.file.originalName,
      row.metadata.suggestedName,
      row.metadata.reportType,
      row.metadata.ticker,
      row.metadata.publisher,
    ]
      .join(" ")
      .toLowerCase();
    const matchesQuery = text.includes(query.toLowerCase());
    const matchesFilter =
      activeFilter === "All Files" ||
      (activeFilter === "Needs Review" && row.confidence !== "High") ||
      (activeFilter === "High Confidence" && row.confidence === "High") ||
      (activeFilter === "Low Confidence" && row.confidence === "Low") ||
      (activeFilter === "Sensitive" && row.sensitivity === "High") ||
      (activeFilter === "Approved" && row.status === "approved") ||
      (activeFilter === "Flagged" && row.status === "flagged");
    return matchesQuery && matchesFilter;
  });

  const summary = [
    {
      label: "Ready to Approve",
      value: rows.filter((row) => row.confidence === "High" && row.status !== "approved").length,
    },
    {
      label: "Needs Review",
      value: rows.filter((row) => row.confidence !== "High").length,
    },
    {
      label: "Flagged",
      value: rows.filter((row) => row.status === "flagged").length,
    },
    {
      label: "High Sensitivity",
      value: rows.filter((row) => row.sensitivity === "High").length,
    },
  ];

  const editingRow = editingId ? rows.find((row) => row.file.id === editingId) : null;

  function openEditor(fileId: string) {
    const row = rows.find((item) => item.file.id === fileId);
    if (!row) return;
    setEditingId(fileId);
    setDraft(row.metadata);
  }

  function saveDraft() {
    if (!editingId || !draft) return;
    setMetadata((prev) => ({ ...prev, [editingId]: draft }));
    setEditingId(null);
    setDraft(null);
  }

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summary.map((item) => (
          <Card key={item.label} className="bg-white">
            <CardContent className="p-5">
              <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
              <p className="mt-3 text-3xl font-semibold tracking-normal text-[oklch(0.2_0.045_260)]">
                {item.value}
              </p>
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
                Review suggested metadata before export.
              </CardTitle>
              <CardDescription>
                Search, filter, approve, edit, or flag document metadata before export.
              </CardDescription>
            </div>
            <div className="relative w-full xl:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search files, tickers, publishers..."
                className="h-10 bg-background/70 pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
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

          <div className="overflow-x-auto rounded-xl border border-border/70">
            <table className="w-full min-w-[1120px] border-separate border-spacing-0 text-left text-sm">
              <thead className="bg-[oklch(0.98_0.01_245)]">
                <tr className="text-xs text-muted-foreground">
                  <th className="border-b border-border/70 px-4 py-3 font-medium">Original File</th>
                  <th className="border-b border-border/70 px-4 py-3 font-medium">Suggested Name</th>
                  <th className="border-b border-border/70 px-4 py-3 font-medium">Document Type</th>
                  <th className="border-b border-border/70 px-4 py-3 font-medium">Ticker</th>
                  <th className="border-b border-border/70 px-4 py-3 font-medium">Publisher</th>
                  <th className="border-b border-border/70 px-4 py-3 font-medium">Confidence</th>
                  <th className="border-b border-border/70 px-4 py-3 font-medium">Sensitivity</th>
                  <th className="border-b border-border/70 px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr
                    key={row.file.id}
                    className={cn(
                      "align-middle transition-colors",
                      row.confidence === "Low" && "bg-[oklch(0.98_0.02_78)]",
                      row.confidence !== "Low" && row.sensitivity === "High" && "bg-[oklch(0.985_0.012_26)]",
                      row.confidence !== "Low" && row.sensitivity !== "High" && "hover:bg-[oklch(0.98_0.008_245)]"
                    )}
                  >
                    <td className="max-w-[220px] border-b border-border/50 px-4 py-4">
                      <div className="truncate font-medium text-foreground">
                        {row.file.originalName}
                      </div>
                      {row.status !== "pending" && (
                        <Badge
                          variant={row.status === "approved" ? "success" : "warning"}
                          size="sm"
                          className="mt-2"
                        >
                          {row.status}
                        </Badge>
                      )}
                    </td>
                    <td className="max-w-[320px] border-b border-border/50 px-4 py-4">
                      <div className="truncate rounded-md bg-white/70 px-2 py-1 font-mono text-xs text-[oklch(0.32_0.07_260)]">
                        {row.metadata.suggestedName || "Needs metadata before naming"}
                      </div>
                    </td>
                    <td className="border-b border-border/50 px-4 py-4">
                      {row.metadata.reportType || "Unclassified"}
                    </td>
                    <td className="border-b border-border/50 px-4 py-4">
                      {row.metadata.ticker || "N/A"}
                    </td>
                    <td className="border-b border-border/50 px-4 py-4">
                      {row.metadata.publisher || "Unknown"}
                    </td>
                    <td className="border-b border-border/50 px-4 py-4">
                      <Badge variant={confidenceVariant(row.confidence)}>
                        {row.confidence}
                      </Badge>
                    </td>
                    <td className="border-b border-border/50 px-4 py-4">
                      <Badge variant={sensitivityVariant(row.sensitivity)}>
                        {row.sensitivity}
                      </Badge>
                    </td>
                    <td className="border-b border-border/50 px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="xs"
                          variant={row.status === "approved" ? "secondary" : "outline"}
                          onClick={() =>
                            setStatuses((prev) => ({ ...prev, [row.file.id]: "approved" }))
                          }
                        >
                          <Check className="h-3.5 w-3.5" />
                          Approve
                        </Button>
                        <Button type="button" size="xs" variant="ghost" onClick={() => openEditor(row.file.id)}>
                          <Edit3 className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="xs"
                          variant={row.status === "flagged" ? "secondary" : "ghost"}
                          onClick={() =>
                            setStatuses((prev) => ({ ...prev, [row.file.id]: "flagged" }))
                          }
                        >
                          <Flag className="h-3.5 w-3.5" />
                          Flag
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredRows.length === 0 && (
            <div className="rounded-xl border border-dashed border-border/70 py-10 text-center text-sm text-muted-foreground">
              No files match the current filter.
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(editingId)} onOpenChange={(open) => !open && setEditingId(null)}>
        <DialogContent className="max-w-2xl bg-white">
          <DialogHeader>
            <DialogTitle>Edit metadata</DialogTitle>
            <DialogDescription>
              Update suggested metadata for {editingRow?.file.originalName}. This is a UI-level
              review edit and does not change source files.
            </DialogDescription>
          </DialogHeader>
          {draft && (
            <div className="grid gap-4">
              <EditField
                label="Suggested Name"
                value={draft.suggestedName}
                onChange={(value) => setDraft((prev) => prev && { ...prev, suggestedName: value })}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <EditField
                  label="Document Type"
                  value={draft.reportType}
                  onChange={(value) => setDraft((prev) => prev && { ...prev, reportType: value })}
                />
                <EditField
                  label="Ticker"
                  value={draft.ticker}
                  onChange={(value) => setDraft((prev) => prev && { ...prev, ticker: value })}
                />
                <EditField
                  label="Publisher"
                  value={draft.publisher}
                  onChange={(value) => setDraft((prev) => prev && { ...prev, publisher: value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingId(null)}>
              Cancel
            </Button>
            <Button
              onClick={saveDraft}
              className="bg-[oklch(0.46_0.18_282)] text-white hover:bg-[oklch(0.42_0.18_282)]"
            >
              Save Metadata
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
