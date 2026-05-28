"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, FolderClock, ServerCog, ShieldCheck, Zap } from "lucide-react";
import { AEGIS_API_BASE, getDashboard, pingBackend } from "@/lib/api";
import type { DashboardSummary } from "@/lib/types";

function formatBytes(bytes: number): string {
  if (!bytes || bytes < 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(v >= 100 ? 0 : 1)} ${units[i]}`;
}

function relativeAge(iso: string | null): string {
  if (!iso) return "never";
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return iso;
  const secs = Math.floor((Date.now() - then) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export function HomeLiveRail() {
  const [mode, setMode] = useState<"checking" | "live" | "demo">("checking");
  const [dash, setDash] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ok = await pingBackend();
      if (cancelled) return;
      setMode(ok ? "live" : "demo");
      if (ok) {
        const d = await getDashboard();
        if (!cancelled) setDash(d);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (mode === "checking") {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-white/65 backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-white/65" />
          Checking RoboVault backend at <code className="text-white/85">{AEGIS_API_BASE}</code>…
        </div>
      </div>
    );
  }

  if (mode === "demo") {
    return (
      <div className="rounded-2xl border border-[oklch(0.76_0.18_78/0.45)] bg-[oklch(0.76_0.18_78/0.12)] px-5 py-4 text-sm text-white/85 backdrop-blur">
        <div className="flex items-center gap-3">
          <ServerCog className="h-4 w-4 text-[oklch(0.92_0.13_78)]" />
          <div className="flex-1">
            <div className="font-medium">Backend not reachable — showing demo data.</div>
            <p className="text-xs leading-5 text-white/65">
              Start the Python pipeline at <code>raw_data/AMAZON</code> with{" "}
              <code className="text-white/85">python web_app.py</code> (port 5001). Override via{" "}
              <code>NEXT_PUBLIC_AEGIS_API</code> in <code>.env.local</code>.
            </p>
          </div>
          <Link
            href="/upload"
            className="hidden shrink-0 items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium hover:bg-white/15 sm:inline-flex"
          >
            Try anyway <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    );
  }

  const kpis = dash?.kpis;
  const lastJob = dash?.recent_jobs[0] ?? null;

  const stats = [
    {
      label: "Files processed",
      value: kpis ? kpis.files_processed.toString() : "—",
      icon: Zap,
    },
    {
      label: "Archives created",
      value: kpis ? `${kpis.archives_created}/${kpis.groups}` : "—",
      icon: FolderClock,
    },
    {
      label: "Encrypted",
      value: kpis ? kpis.encrypted_archives.toString() : "—",
      icon: ShieldCheck,
    },
    {
      label: "Storage",
      value: kpis ? formatBytes(kpis.total_bytes) : "—",
      icon: ServerCog,
    },
  ];

  return (
    <div className="rounded-2xl border border-[oklch(0.78_0.18_158/0.4)] bg-[linear-gradient(135deg,oklch(0.78_0.18_158/0.16),oklch(0.78_0.18_158/0.06))] px-5 py-4 text-sm text-white backdrop-blur">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-2 text-[12px] uppercase tracking-wider text-[oklch(0.92_0.13_158)]">
          <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-[oklch(0.82_0.18_158)]" />
          Live · {dash?.ticker ?? "—"} {lastJob ? `· last job ${relativeAge(lastJob.created_at)}` : ""}
        </div>

        <div className="grid flex-1 grid-cols-2 gap-3 md:grid-cols-4">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 text-white/70" />
                <div>
                  <div className="text-[10.5px] uppercase tracking-wider text-white/60">
                    {s.label}
                  </div>
                  <div className="text-sm font-semibold text-white">{s.value}</div>
                </div>
              </div>
            );
          })}
        </div>

        <Link
          href="/dashboard"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium hover:bg-white/15"
        >
          Open dashboard <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
