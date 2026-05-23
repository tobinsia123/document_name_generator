"use client";

import { motion } from "framer-motion";
import {
  Activity,
  CheckCircle2,
  Cloud,
  Database,
  HardDrive,
  Network,
  Plus,
  Server,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { storageBackends } from "@/lib/data";
import type { StorageBackend } from "@/lib/types";
import { formatBytes, cn } from "@/lib/utils";

const typeMeta: Record<
  StorageBackend["type"],
  { label: string; icon: typeof Cloud; gradient: string }
> = {
  vault: {
    label: "AEGIS Vault",
    icon: ShieldCheck,
    gradient: "from-[oklch(0.72_0.16_264/0.18)] to-transparent",
  },
  filecoin: {
    label: "Filecoin",
    icon: Network,
    gradient: "from-[oklch(0.78_0.17_158/0.18)] to-transparent",
  },
  arweave: {
    label: "Arweave",
    icon: Database,
    gradient: "from-[oklch(0.86_0.16_78/0.18)] to-transparent",
  },
  s3: {
    label: "AWS S3",
    icon: Cloud,
    gradient: "from-[oklch(0.86_0.13_232/0.18)] to-transparent",
  },
  gcs: {
    label: "Google Cloud Storage",
    icon: Cloud,
    gradient: "from-[oklch(0.86_0.13_232/0.18)] to-transparent",
  },
  azure: {
    label: "Azure Blob",
    icon: Cloud,
    gradient: "from-[oklch(0.86_0.13_232/0.18)] to-transparent",
  },
};

export default function StoragePage() {
  const totalCapacity = storageBackends.reduce((s, b) => s + b.capacity, 0);
  const totalUsed = storageBackends.reduce((s, b) => s + b.used, 0);
  const totalFiles = storageBackends.reduce((s, b) => s + b.files, 0);
  const totalCost = storageBackends.reduce((s, b) => s + b.cost, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Stat label="Total capacity" value={formatBytes(totalCapacity, 0)} icon={HardDrive} />
        <Stat label="In use" value={formatBytes(totalUsed, 0)} icon={Activity} hint={`${((totalUsed / totalCapacity) * 100).toFixed(1)}% of capacity`} />
        <Stat label="Files" value={totalFiles.toLocaleString()} icon={Server} />
        <Stat label="Monthly cost" value={`$${totalCost.toLocaleString()}`} icon={Cloud} hint="-12.4% optimization YTD" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {storageBackends.map((b, i) => {
          const meta = typeMeta[b.type];
          const Icon = meta.icon;
          const usedPct = (b.used / b.capacity) * 100;
          return (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card className="relative h-full overflow-hidden">
                <div
                  className={cn(
                    "pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br blur-2xl",
                    meta.gradient
                  )}
                />
                <CardHeader className="flex flex-row items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-background/40">
                      <Icon className="h-4 w-4 text-foreground/90" />
                    </div>
                    <div>
                      <CardTitle>{b.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1.5">
                        <span>{meta.label}</span>
                        {b.region && (
                          <>
                            <span>·</span>
                            <span className="font-mono">{b.region}</span>
                          </>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant={
                      b.status === "healthy"
                        ? "success"
                        : b.status === "syncing"
                        ? "info"
                        : "warning"
                    }
                    size="sm"
                  >
                    {b.status === "healthy" && <CheckCircle2 className="h-2.5 w-2.5" />}
                    {b.status === "syncing" && (
                      <span className="pulse-dot inline-block h-1 w-1 rounded-full bg-current" />
                    )}
                    {b.status}
                  </Badge>
                </CardHeader>
                <CardContent className="relative space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Used</span>
                      <span className="tabular text-foreground">
                        {formatBytes(b.used, 0)} / {formatBytes(b.capacity, 0)}
                      </span>
                    </div>
                    <Progress value={usedPct} className="mt-1.5" />
                    <div className="mt-1 text-[10.5px] text-muted-foreground tabular">
                      {usedPct.toFixed(1)}%
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <KV k="Files" v={b.files.toLocaleString()} />
                    <KV k="Encryption" v={b.encryption.toUpperCase()} mono />
                    <KV k="Immutable" v={b.immutable ? "Yes" : "No"} />
                  </div>

                  <div className="flex items-center justify-between border-t border-border/60 pt-3">
                    <div>
                      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
                        Monthly
                      </div>
                      <div className="text-[14px] font-semibold tabular">
                        ${b.cost.toLocaleString()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="xs">
                        Test
                      </Button>
                      <Button variant="outline" size="xs">
                        Configure
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="flex h-full min-h-[260px] items-center justify-center border-dashed">
            <CardContent className="text-center">
              <div className="mx-auto grid h-10 w-10 place-items-center rounded-lg border border-border bg-background/40">
                <Plus className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-3 text-[13px] font-medium">Connect new backend</div>
              <div className="mt-1 max-w-[200px] text-[11px] text-muted-foreground">
                Bring your own S3, Filecoin, Arweave, or HSM-backed vault.
              </div>
              <Button size="sm" className="mt-4">
                Add backend
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string;
  icon: typeof HardDrive;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/80 p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </div>
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="mt-2 text-2xl font-semibold tabular tracking-tight">{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function KV({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="rounded-md border border-border/60 bg-background/30 p-2">
      <div className="text-[9.5px] uppercase tracking-wider text-muted-foreground">{k}</div>
      <div className={cn("mt-0.5 text-[12px]", mono && "font-mono")}>{v}</div>
    </div>
  );
}
