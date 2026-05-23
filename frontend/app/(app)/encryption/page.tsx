"use client";

import {
  Activity,
  Calendar,
  CheckCircle2,
  Copy,
  Key,
  KeyRound,
  Lock,
  RotateCw,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { DonutChart } from "@/components/charts/donut-chart";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const keys = [
  {
    id: "kms-prod-vault-1",
    label: "Vault — Production (us-east-1)",
    algo: "AES-256-GCM",
    rotated: "12 days ago",
    next: "in 18 days",
    files: 41_220,
    status: "active",
  },
  {
    id: "kms-prod-vault-2",
    label: "Vault — Production (eu-west-1)",
    algo: "AES-256-GCM",
    rotated: "9 days ago",
    next: "in 21 days",
    files: 24_882,
    status: "active",
  },
  {
    id: "kms-prod-archive",
    label: "Archive — Filecoin sealing key",
    algo: "ChaCha20-Poly1305",
    rotated: "31 days ago",
    next: "rotate now",
    files: 8_402,
    status: "rotate",
  },
  {
    id: "kms-staging-vault",
    label: "Vault — Staging",
    algo: "AES-256-GCM",
    rotated: "2 days ago",
    next: "in 28 days",
    files: 1_244,
    status: "active",
  },
  {
    id: "kms-bring-your-own",
    label: "Customer-managed (Atlas Capital)",
    algo: "AES-256-GCM",
    rotated: "—",
    next: "external",
    files: 12_109,
    status: "external",
  },
];

export default function EncryptionPage() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                Cryptographic posture
              </CardTitle>
              <CardDescription>
                Default cipher AES-256-GCM · KMS rotation 30d · BYOK supported
              </CardDescription>
            </div>
            <Badge variant="success">FIPS 140-3 Validated</Badge>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <PostureStat label="Files encrypted" value="305,492" hint="74% of corpus" />
            <PostureStat label="Active keys" value="14" hint="2 customer-managed" />
            <PostureStat label="Avg rotation" value="22d" hint="target ≤ 30d" />
            <PostureStat label="Failed decrypts (24h)" value="0" hint="last incident: 41d" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cipher distribution</CardTitle>
            <CardDescription>By files at rest</CardDescription>
          </CardHeader>
          <CardContent>
            <DonutChart
              data={[
                { name: "AES-256-GCM", value: 281_119 },
                { name: "ChaCha20-Poly1305", value: 18_882 },
                { name: "Customer-managed", value: 12_109 },
                { name: "Plaintext (low-sens)", value: 100_771 },
              ]}
              colors={[
                "oklch(0.78 0.17 158)",
                "oklch(0.74 0.14 232)",
                "oklch(0.78 0.18 264)",
                "oklch(0.4 0.012 250)",
              ]}
              centerValue="305K"
              centerLabel="Encrypted"
              height={200}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-3.5 w-3.5 text-primary" />
              Key rings
            </CardTitle>
            <CardDescription>Master keys, rotation schedules, and BYOK roots</CardDescription>
          </div>
          <Button size="sm">
            <RotateCw className="h-3.5 w-3.5" /> Rotate all due
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {keys.map((k, i) => (
            <motion.div
              key={k.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="grid grid-cols-1 items-center gap-3 rounded-lg border border-border/70 bg-background/30 p-3 md:grid-cols-[260px_1fr_auto]"
            >
              <div>
                <div className="flex items-center gap-2">
                  <KeyRound className="h-3.5 w-3.5 text-primary" />
                  <div className="text-[12.5px] font-medium">{k.label}</div>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[10.5px] text-muted-foreground">
                  <span className="font-mono">{k.id}</span>
                  <button className="opacity-60 hover:opacity-100">
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-[11px]">
                <Field label="Algorithm" value={k.algo} mono />
                <Field label="Files" value={k.files.toLocaleString()} />
                <Field label="Last rotation" value={k.rotated} />
                <Field label="Next" value={k.next} />
              </div>
              <div className="flex items-center justify-end gap-2">
                {k.status === "rotate" && (
                  <Badge variant="warning">
                    <RotateCw className="h-2.5 w-2.5" /> Rotate now
                  </Badge>
                )}
                {k.status === "active" && (
                  <Badge variant="success">
                    <CheckCircle2 className="h-2.5 w-2.5" /> Active
                  </Badge>
                )}
                {k.status === "external" && (
                  <Badge variant="primary">External (BYOK)</Badge>
                )}
                <Button variant="outline" size="xs">
                  Manage
                </Button>
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-primary" />
              Default encryption settings
            </CardTitle>
            <CardDescription>Workspace-wide unless overridden by policy</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Setting
              label="Encrypt at rest by default"
              hint="All new files written to vault tiers are encrypted."
              checked
            />
            <Separator />
            <Setting
              label="Encrypt in transit (mTLS)"
              hint="Mandatory for service-to-service traffic."
              checked
              disabled
            />
            <Separator />
            <Setting
              label="Allow customer-managed keys (BYOK)"
              hint="Connect AWS KMS, GCP KMS, or HashiCorp Vault."
              checked
            />
            <Separator />
            <Setting
              label="Require passphrase for restricted exports"
              hint="Adds AES-wrapped passphrase prompt at download."
              checked
            />
            <Separator />
            <Setting
              label="Quantum-safe envelope (preview)"
              hint="Wrap symmetric keys with Kyber-768 hybrid scheme."
              checked={false}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-primary" />
              Recent key activity
            </CardTitle>
            <CardDescription>Last 24 hours</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { t: "Rotation completed", who: "system", target: "kms-prod-vault-2", time: "12m ago", ok: true },
              { t: "BYOK validated", who: "Maya Patel", target: "Atlas KMS root", time: "2h ago", ok: true },
              { t: "Decryption denied", who: "Jon Reyes", target: "patient_records_export.csv", time: "4h ago", ok: false },
              { t: "Key created", who: "Maya Patel", target: "kms-staging-archive", time: "1d ago", ok: true },
              { t: "Rotation scheduled", who: "system", target: "kms-prod-archive", time: "1d ago", ok: true },
            ].map((a, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-start gap-3"
              >
                <div
                  className={cn(
                    "mt-0.5 grid h-7 w-7 place-items-center rounded-md border border-border bg-background/40",
                    a.ok
                      ? "text-[color:oklch(0.84_0.15_158)]"
                      : "text-[color:oklch(0.85_0.18_22)]"
                  )}
                >
                  {a.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px]">
                    <span className="font-medium">{a.t}</span>{" "}
                    <span className="text-muted-foreground">· {a.who}</span>
                  </div>
                  <div className="font-mono text-[10.5px] text-muted-foreground">{a.target}</div>
                </div>
                <div className="flex items-center gap-1 text-[10.5px] text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {a.time}
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PostureStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/30 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular tracking-tight">{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[9.5px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-0.5 ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

function Setting({
  label,
  hint,
  checked,
  disabled,
}: {
  label: string;
  hint: string;
  checked: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="text-[12.5px] font-medium">{label}</div>
        <div className="text-[11px] text-muted-foreground">{hint}</div>
      </div>
      <Switch defaultChecked={checked} disabled={disabled} />
    </div>
  );
}
