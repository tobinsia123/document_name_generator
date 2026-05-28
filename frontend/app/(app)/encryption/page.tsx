"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Download,
  ExternalLink,
  KeyRound,
  Lock,
  LockKeyhole,
  RefreshCcw,
  ShieldCheck,
  TriangleAlert,
  UploadCloud,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { DonutChart } from "@/components/charts/donut-chart";
import { useBackendStatus } from "@/lib/backend-status";
import {
  decryptAndDownload,
  downloadFile,
  downloadMacosOpener,
  getEncryptionSummary,
  openInOS,
  verifyEncryptionPassphrase,
} from "@/lib/api";
import { cn, formatBytes } from "@/lib/utils";
import type { EncryptionArchive, EncryptionSummary } from "@/lib/types";
import { toast } from "sonner";

export default function EncryptionPage() {
  const { mode } = useBackendStatus();
  if (mode !== "live") return <DemoEncryption />;
  return <LiveEncryption />;
}

function LiveEncryption() {
  const [data, setData] = useState<EncryptionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [verifyPath, setVerifyPath] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [decrypting, setDecrypting] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const summary = await getEncryptionSummary();
      setData(summary);
      if (!summary) {
        setError("Could not load encryption summary from the backend.");
      } else if (!summary.cryptography_available) {
        setError(
          "The cryptography package is not installed on the server. Run: pip install cryptography"
        );
      } else if (summary.archives.length > 0) {
        setVerifyPath((prev) => prev || summary.archives[0].encrypted_path);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const s = data?.summary;
  const archives = data?.archives ?? [];
  const encPct =
    s && s.total_archives > 0
      ? Math.round((s.encrypted_archives / s.total_archives) * 100)
      : 0;

  async function handleVerify() {
    if (!verifyPath || !passphrase) {
      toast.error("Select an archive and enter the passphrase.");
      return;
    }
    setVerifying(true);
    setVerifyResult(null);
    const result = await verifyEncryptionPassphrase(verifyPath, passphrase);
    setVerifying(false);
    if (result.verified) {
      setVerifyResult({
        ok: true,
        message: `Passphrase valid · decrypts to ${result.source_name ?? "archive"} (${formatBytes(result.bytes ?? 0)})`,
      });
      toast.success("Passphrase verified");
    } else {
      setVerifyResult({
        ok: false,
        message: result.error ?? "Wrong passphrase or corrupt file",
      });
      toast.error(result.error ?? "Verification failed");
    }
  }

  async function handleDecrypt(row: EncryptionArchive) {
    if (!passphrase) {
      toast.error("Enter the passphrase in the verifier panel first.");
      return;
    }
    setDecrypting(row.encrypted_path);
    try {
      await decryptAndDownload(row.encrypted_path, passphrase);
      toast.success(`Downloaded documents for ${row.group_key} (ZIP of PDFs)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Decrypt failed");
    } finally {
      setDecrypting(null);
    }
  }

  return (
    <div className="space-y-6">
      {!data?.cryptography_available && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <div className="flex items-center gap-2 font-medium">
            <TriangleAlert className="h-4 w-4" />
            cryptography not available on server
          </div>
          <p className="mt-1 text-xs opacity-90">
            Install with <code className="rounded bg-destructive/10 px-1">pip install cryptography</code>{" "}
            in <code>raw_data/AMAZON</code>, then restart Flask.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="bg-white lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Archive encryption posture
              </CardTitle>
              <CardDescription>
                AES-256-GCM · PBKDF2-HMAC-SHA256 · 200,000 iterations · DRENC1 envelope
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
                <RefreshCcw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              </Button>
              <Badge variant={archives.length > 0 ? "success" : "muted"}>
                {archives.length > 0 ? "Sealed archives" : "No encrypted archives yet"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <PostureStat
              label="Encrypted archives"
              value={s ? String(s.encrypted_archives) : "—"}
              hint={s ? `of ${s.total_archives} groups` : ""}
            />
            <PostureStat
              label="Encrypted bytes"
              value={s ? formatBytes(s.encrypted_bytes) : "—"}
              hint="At-rest sealed bundles"
            />
            <PostureStat
              label="Coverage"
              value={s ? `${encPct}%` : "—"}
              hint="Groups with .enc output"
            />
            <PostureStat
              label="Last job"
              value={data?.job_encrypt_enabled ? "Encryption on" : "Encryption off"}
              hint="From manifest processing_options"
            />
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader>
            <CardTitle>Seal ratio</CardTitle>
            <CardDescription>Encrypted vs total archive groups</CardDescription>
          </CardHeader>
          <CardContent>
            <DonutChart
              data={
                s && s.total_archives > 0
                  ? [
                      { name: "Encrypted (.enc)", value: s.encrypted_archives },
                      {
                        name: "Plain / none",
                        value: Math.max(0, s.total_archives - s.encrypted_archives),
                      },
                    ]
                  : [{ name: "No archives", value: 1 }]
              }
              colors={["oklch(0.78 0.17 158)", "oklch(0.4 0.012 250)"]}
              centerValue={s ? String(s.encrypted_archives) : "0"}
              centerLabel="Encrypted"
              height={200}
            />
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              Passphrase verifier
            </CardTitle>
            <CardDescription>
              Test the passphrase used when you ran the job (Upload → enable archive encryption).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Encrypted archive</Label>
              {archives.length > 0 ? (
                <select
                  className="h-10 w-full rounded-md border border-border bg-background/70 px-3 text-sm"
                  value={verifyPath}
                  onChange={(e) => setVerifyPath(e.target.value)}
                >
                  {archives.map((a) => (
                    <option key={a.encrypted_path} value={a.encrypted_path}>
                      {a.group_key}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No encrypted archives in the manifest.{" "}
                  <Link href="/upload" className="font-medium text-foreground underline">
                    Run a job with encryption enabled
                  </Link>
                  .
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Passphrase</Label>
              <Input
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Same passphrase used at job run"
                autoComplete="off"
              />
            </div>
            <Button
              type="button"
              className="w-full rounded-lg bg-[oklch(0.46_0.18_282)] text-white hover:bg-[oklch(0.42_0.18_282)]"
              disabled={verifying || archives.length === 0}
              onClick={() => void handleVerify()}
            >
              {verifying ? (
                <RefreshCcw className="h-4 w-4 animate-spin" />
              ) : (
                <LockKeyhole className="h-4 w-4" />
              )}
              Verify passphrase
            </Button>
            {verifyResult && (
              <div
                className={cn(
                  "rounded-lg border px-3 py-2 text-xs",
                  verifyResult.ok
                    ? "border-[oklch(0.58_0.14_158/0.4)] bg-[oklch(0.97_0.02_158)] text-[oklch(0.28_0.12_158)]"
                    : "border-destructive/40 bg-destructive/10 text-destructive"
                )}
              >
                {verifyResult.message}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              How archive encryption works
            </CardTitle>
            <CardDescription>Real behavior in this build (not cloud KMS)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
            <p>
              When you enable <strong className="text-foreground">Encrypt archives</strong> on the
              Upload page, each <code className="text-xs">.tar.zst</code> bundle is sealed with
              AES-256-GCM. The key is derived from your passphrase via PBKDF2 (200k iterations).
            </p>
            <p>
              Plaintext archives are removed by default after sealing. Only the{" "}
              <code className="text-xs">.tar.zst.enc</code> file remains, with an embedded DRENC1
              header (salt, nonce, algorithm metadata).
            </p>
            <p>
              On macOS, install <strong className="text-foreground">RoboVault Opener</strong> once
              so double-clicking a downloaded <code className="text-xs">.enc</code> prompts for the
              same passphrase (instead of using this web page).
            </p>
            <Separator />
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  downloadMacosOpener();
                  toast.success("Downloading RoboVault Opener for macOS…");
                }}
              >
                <Download className="h-4 w-4" />
                Download macOS opener (.app)
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/upload">
                  <UploadCloud className="h-4 w-4" />
                  Run a new encrypted job
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LockKeyhole className="h-4 w-4 text-primary" />
            Encrypted archives
          </CardTitle>
          <CardDescription>
            From the latest workspace manifest · download .enc or decrypt with passphrase
          </CardDescription>
        </CardHeader>
        <CardContent>
          {archives.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 py-12 text-center text-sm text-muted-foreground">
              No encrypted archives yet. Enable encryption on{" "}
              <Link href="/upload" className="font-medium text-foreground underline">
                Upload
              </Link>{" "}
              and run a job that creates archives.
            </div>
          ) : (
            <div className="space-y-2">
              {archives.map((row) => (
                <div
                  key={row.encrypted_path}
                  className="grid grid-cols-1 items-center gap-3 rounded-xl border border-border/70 bg-[oklch(0.99_0.004_240)] p-4 md:grid-cols-[1fr_auto]"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {row.group_key}
                      </span>
                      <Badge variant="success" size="sm">
                        {row.encryption_algorithm || "AES-256-GCM"}
                      </Badge>
                      {!row.has_plaintext_archive && (
                        <Badge variant="muted" size="sm">
                          Plaintext removed
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                      {row.encrypted_path.split("/").pop()}
                    </div>
                    {row.encrypted_checksum_sha256 && (
                      <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                        sha256 {row.encrypted_checksum_sha256.slice(0, 20)}…
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      onClick={() =>
                        downloadFile(
                          row.encrypted_path,
                          row.encrypted_path.split("/").pop() ?? "archive.enc"
                        )
                      }
                    >
                      <Download className="h-3 w-3" />
                      .enc
                    </Button>
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      disabled={decrypting === row.encrypted_path || !passphrase}
                      onClick={() => void handleDecrypt(row)}
                      title={!passphrase ? "Enter passphrase in verifier first" : undefined}
                    >
                      {decrypting === row.encrypted_path ? (
                        <RefreshCcw className="h-3 w-3 animate-spin" />
                      ) : (
                        <LockKeyhole className="h-3 w-3" />
                      )}
                      Decrypt
                    </Button>
                    <Button
                      type="button"
                      size="xs"
                      variant="ghost"
                      onClick={() => void openInOS(row.encrypted_path)}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DemoEncryption() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[oklch(0.76_0.18_78/0.45)] bg-[oklch(0.99_0.04_78)] p-4 text-sm text-[oklch(0.36_0.16_78)]">
        <div className="font-medium">Backend offline — encryption tools need the Flask API.</div>
        <p className="mt-1 text-xs text-[oklch(0.46_0.16_78)]">
          Start <code className="rounded bg-[oklch(0.96_0.04_78)] px-1">python web_app.py</code> in{" "}
          <code>raw_data/AMAZON</code>, run an encrypted job from Upload, then return here to verify
          passphrases and decrypt archives.
        </p>
      </div>

      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            What works in live mode
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-[oklch(0.5_0.16_158)]" />
            <span>
              <strong className="text-foreground">Upload</strong> — toggle Encrypt archives +
              passphrase; pipeline writes <code>.tar.zst.enc</code> files.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-[oklch(0.5_0.16_158)]" />
            <span>
              <strong className="text-foreground">Encryption Manager</strong> — lists sealed
              archives from manifest, verify passphrase, decrypt & download.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-[oklch(0.5_0.16_158)]" />
            <span>
              <strong className="text-foreground">Export</strong> — download encrypted bundles
              directly.
            </span>
          </div>
          <Button asChild className="mt-2">
            <Link href="/upload">
              <UploadCloud className="h-4 w-4" />
              Go to Upload
            </Link>
          </Button>
        </CardContent>
      </Card>
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
