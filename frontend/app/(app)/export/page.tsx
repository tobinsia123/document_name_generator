"use client";

import { useMemo, useState } from "react";
import {
  Archive,
  CheckCircle2,
  Database,
  Download,
  FileArchive,
  FileJson,
  FolderDown,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { files } from "@/lib/data";
import { cn } from "@/lib/utils";

const exportOptions = [
  {
    id: "files",
    title: "Download Renamed Files",
    body: "Receive clean copies using RoboVault's standardized naming format.",
    icon: FolderDown,
    action: "Prepare files",
  },
  {
    id: "manifest",
    title: "Download JSON Manifest",
    body: "Export extracted metadata, hashes, source names, and review decisions.",
    icon: FileJson,
    action: "Generate manifest",
  },
  {
    id: "compressed",
    title: "Create Compressed Archive",
    body: "Bundle renamed files and the manifest into a single archive.",
    icon: FileArchive,
    action: "Create archive",
  },
  {
    id: "encrypted",
    title: "Create Encrypted Archive",
    body: "Protect the final package for secure sharing and retention.",
    icon: LockKeyhole,
    action: "Encrypt archive",
  },
  {
    id: "database",
    title: "Save Metadata to Database",
    body: "Store searchable metadata for later retrieval and audit workflows.",
    icon: Database,
    action: "Save metadata",
  },
  {
    id: "storage",
    title: "Secure Storage & Retrieval",
    body: "Route the clean document set to secure storage with retrieval-ready metadata.",
    icon: ShieldCheck,
    action: "Route to storage",
  },
];

type OptionStatus = "Ready" | "Prepared";

export default function ExportPage() {
  const [optionStatus, setOptionStatus] = useState<Record<string, OptionStatus>>({});

  const totalFiles = files.length;
  const renamedFiles = files.filter((file) => file.renamedTo).length;
  const encryptedFiles = files.filter((file) => file.encryption !== "none").length;
  const blockedFiles = files.filter((file) => file.status === "failed").length;
  const preparedCount = Object.values(optionStatus).filter((status) => status === "Prepared").length;

  const summary = useMemo(
    () => [
      {
        label: "Total Files Processed",
        value: totalFiles.toString(),
        note: "Ready for delivery",
      },
      {
        label: "Renamed Files Created",
        value: renamedFiles.toString(),
        note: "Clean copies available",
      },
      {
        label: "Manifest Generated",
        value: optionStatus.manifest === "Prepared" ? "Yes" : "Ready",
        note: "JSON metadata output",
      },
      {
        label: "Archive Status",
        value: blockedFiles > 0 ? "Review needed" : optionStatus.compressed === "Prepared" ? "Created" : "Ready",
        note: blockedFiles > 0 ? `${blockedFiles} file needs approval` : "Compressed archive available",
      },
      {
        label: "Encryption Status",
        value: optionStatus.encrypted === "Prepared" ? "Encrypted" : `${encryptedFiles} files ready`,
        note: "Secure archive prep",
      },
    ],
    [blockedFiles, encryptedFiles, optionStatus.compressed, optionStatus.encrypted, optionStatus.manifest, renamedFiles, totalFiles]
  );

  function prepareOption(id: string) {
    setOptionStatus((prev) => ({ ...prev, [id]: "Prepared" }));
  }

  function exportAll() {
    setOptionStatus(
      exportOptions.reduce<Record<string, OptionStatus>>((acc, option) => {
        acc[option.id] = "Prepared";
        return acc;
      }, {})
    );
  }

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
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/66">
              RoboVault creates renamed copies while preserving raw source files.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                onClick={exportAll}
                className="h-11 rounded-lg bg-[oklch(0.58_0.22_286)] px-6 text-white shadow-[0_0_30px_oklch(0.58_0.22_286/0.42)] hover:bg-[oklch(0.54_0.22_286)]"
              >
                <Download className="h-4 w-4" />
                Export Clean Document Set
              </Button>
            </div>
          </div>
          <div className="relative rounded-2xl border border-white/10 bg-white/8 p-5 backdrop-blur">
            <div className="flex items-center justify-between">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/10 text-white">
                <Archive className="h-5 w-5" />
              </div>
              <Badge variant={preparedCount === exportOptions.length ? "success" : "primary"}>
                {preparedCount}/{exportOptions.length} prepared
              </Badge>
            </div>
            <div className="mt-5 text-sm font-medium">Delivery readiness</div>
            <Progress value={(preparedCount / exportOptions.length) * 100} className="mt-4 h-1.5" />
            <p className="mt-4 text-xs leading-5 text-white/60">
              Prepare individual outputs or create the full clean document set in one step.
            </p>
          </div>
        </div>
      </section>

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

      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Export options
          </CardTitle>
          <CardDescription>
            Choose the outputs needed for distribution, storage, or downstream systems.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {exportOptions.map((option) => {
              const Icon = option.icon;
              const prepared = optionStatus[option.id] === "Prepared";
              return (
                <div
                  key={option.title}
                  className={cn(
                    "rounded-xl border p-5 transition hover:-translate-y-0.5 hover:border-[oklch(0.62_0.12_270)] hover:shadow-[0_18px_36px_-32px_oklch(0.22_0.05_260/0.5)]",
                    prepared
                      ? "border-[oklch(0.58_0.14_158/0.34)] bg-[oklch(0.97_0.02_158)]"
                      : "border-[oklch(0.84_0.026_242)] bg-[oklch(0.99_0.004_240)]"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="grid h-11 w-11 place-items-center rounded-lg bg-white text-[oklch(0.46_0.18_282)] shadow-[0_0_0_1px_oklch(0.86_0.024_240)]">
                      <Icon className="h-4 w-4" />
                    </div>
                    {prepared && (
                      <Badge variant="success">
                        <CheckCircle2 className="h-3 w-3" />
                        Prepared
                      </Badge>
                    )}
                  </div>
                  <h3 className="mt-4 text-base font-semibold leading-5 text-foreground">
                    {option.title}
                  </h3>
                  <p className="mt-2 min-h-[42px] text-sm leading-6 text-muted-foreground">
                    {option.body}
                  </p>
                  <Button
                    type="button"
                    variant={prepared ? "secondary" : "outline"}
                    className="mt-5 w-full rounded-lg bg-white/70"
                    onClick={() => prepareOption(option.id)}
                  >
                    {prepared ? "Prepared" : option.action}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
