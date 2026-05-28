"use client";

import { File, FileSpreadsheet, FileText, FileImage, FileCode } from "lucide-react";
import { motion } from "framer-motion";
import type { RoboVaultFile } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { SensitivityPill } from "./sensitivity-pill";
import { EncryptionBadge } from "./encryption-badge";
import { cn, formatBytes, shortHash } from "@/lib/utils";
import { TimeAgo } from "./time-ago";

function FileIcon({ mime }: { mime: string }) {
  const cls = "h-4 w-4";
  if (mime.includes("sheet") || mime.includes("csv"))
    return <FileSpreadsheet className={cn(cls, "text-[color:oklch(0.78_0.17_158)]")} />;
  if (mime.includes("pdf"))
    return <FileText className={cn(cls, "text-[color:oklch(0.78_0.22_22)]")} />;
  if (mime.includes("image"))
    return <FileImage className={cn(cls, "text-[color:oklch(0.86_0.16_78)]")} />;
  if (mime.includes("plain") || mime.includes("env"))
    return <FileCode className={cn(cls, "text-[color:oklch(0.34_0.115_262)]")} />;
  if (mime.includes("word"))
    return <FileText className={cn(cls, "text-[color:oklch(0.86_0.12_232)]")} />;
  return <File className={cls} />;
}

export function FileRow({
  file,
  selected,
  onToggle,
  index,
}: {
  file: RoboVaultFile;
  selected?: boolean;
  onToggle?: () => void;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: (index ?? 0) * 0.02 }}
      className={cn(
        "group grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-border/60 px-4 py-2.5 transition-colors hover:bg-accent/40",
        selected && "bg-accent/50"
      )}
    >
      <div className="flex items-center gap-3">
        {onToggle && (
          <Checkbox checked={selected} onCheckedChange={onToggle} aria-label="select" />
        )}
        <div className="grid h-7 w-7 place-items-center rounded-md border border-border bg-background/40">
          <FileIcon mime={file.mimeType} />
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className="truncate text-[13px] font-medium text-foreground">
            {file.renamedTo ?? file.originalName}
          </div>
          {file.status === "failed" && (
            <Badge variant="destructive" size="sm">Blocked</Badge>
          )}
          {file.status === "queued" && (
            <Badge variant="info" size="sm">
              <span className="pulse-dot inline-block h-1 w-1 rounded-full bg-current" />
              Queued
            </Badge>
          )}
          {file.status === "analyzing" && (
            <Badge variant="primary" size="sm">
              <span className="pulse-dot inline-block h-1 w-1 rounded-full bg-current" />
              Analyzing
            </Badge>
          )}
        </div>
        {file.renamedTo && file.originalName !== file.renamedTo && (
          <div className="mt-0.5 truncate text-[10.5px] text-muted-foreground">
            <span className="line-through opacity-60">{file.originalName}</span>
            <span className="mx-1.5 opacity-50">→</span>
            <span className="text-[color:oklch(0.34_0.115_262)]">renamed</span>
          </div>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <SensitivityPill level={file.sensitivity} />
          <EncryptionBadge state={file.encryption} />
          {file.framework?.slice(0, 2).map((f) => (
            <Badge key={f} variant="outline" size="sm">
              {f}
            </Badge>
          ))}
          {file.entities.slice(0, 2).map((e) => (
            <Badge key={e.type} variant="muted" size="sm">
              {e.type}·{e.count}
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4 text-right text-[11px] text-muted-foreground tabular">
        <div className="hidden md:block w-20 truncate">{file.uploadedBy}</div>
        <div className="hidden md:block w-16">{formatBytes(file.size)}</div>
        <div className="hidden lg:block w-24 font-mono text-muted-foreground/80">
          {shortHash(file.hash, 14)}
        </div>
        <div className="w-16"><TimeAgo date={file.uploadedAt} /></div>
      </div>
    </motion.div>
  );
}
