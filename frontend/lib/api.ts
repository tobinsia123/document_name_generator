/**
 * AEGIS frontend API client.
 *
 * Talks to the local Python/Flask backend in `raw_data/AMAZON/web_app.py`.
 * Override the base URL by setting `NEXT_PUBLIC_AEGIS_API` (e.g. in `.env.local`):
 *
 *     NEXT_PUBLIC_AEGIS_API=http://127.0.0.1:5001
 *
 * All methods are best-effort: when the backend is unreachable they return
 * `null` (or throw on explicit user actions like submitting a job) so pages
 * can fall back to mock data. Use `pingBackend()` to determine live/demo mode.
 */

import type {
  BackendConfig,
  BrowseResult,
  DashboardSummary,
  EncryptionSummary,
  EncryptionVerifyResult,
  JobManifest,
  JobRecord,
  ReviewStatus,
  ReviewsMap,
  RunOptions,
} from "./types";

export const AEGIS_API_BASE = (
  process.env.NEXT_PUBLIC_AEGIS_API ?? "http://127.0.0.1:5001"
).replace(/\/+$/, "");

interface ApiEnvelope<T> {
  ok: boolean;
  error?: string;
  [k: string]: unknown;
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function request<T extends ApiEnvelope<unknown>>(
  path: string,
  init: RequestInit = {},
  { signal }: { signal?: AbortSignal } = {}
): Promise<T> {
  const url = `${AEGIS_API_BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    signal: signal ?? init.signal,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  let body: T;
  try {
    body = (await res.json()) as T;
  } catch {
    throw new ApiError(`Invalid JSON from ${path}`, res.status);
  }
  if (!res.ok || body.ok === false) {
    throw new ApiError(body.error ?? `Request failed (${res.status})`, res.status);
  }
  return body;
}

async function safe<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise;
  } catch {
    return null;
  }
}

/* ---------- public methods ---------- */

export async function pingBackend(timeoutMs = 1500): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(`${AEGIS_API_BASE}/api/config`, {
      method: "GET",
      signal: ctl.signal,
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

export async function getConfig(): Promise<BackendConfig | null> {
  const body = await safe(
    request<ApiEnvelope<unknown> & BackendConfig>("/api/config", { method: "GET" })
  );
  if (!body) return null;
  return body as BackendConfig;
}

export async function getManifest(
  path?: string
): Promise<{ manifest: JobManifest; path: string } | null> {
  const qs = path ? `?path=${encodeURIComponent(path)}` : "";
  const body = await safe(
    request<ApiEnvelope<unknown> & { manifest: JobManifest; path: string }>(
      `/api/manifest${qs}`,
      { method: "GET" }
    )
  );
  if (!body) return null;
  return { manifest: body.manifest, path: body.path };
}

export async function listJobs(): Promise<JobRecord[] | null> {
  const body = await safe(
    request<ApiEnvelope<unknown> & { jobs: JobRecord[] }>(`/api/jobs`, {
      method: "GET",
    })
  );
  return body ? body.jobs : null;
}

export async function getJob(jobId: string): Promise<JobRecord | null> {
  const body = await safe(
    request<ApiEnvelope<unknown> & { job: JobRecord }>(
      `/api/jobs/${encodeURIComponent(jobId)}`,
      { method: "GET" }
    )
  );
  return body ? body.job : null;
}

export async function browse(
  path?: string,
  kind: "any" | "dir" | "file" = "any"
): Promise<BrowseResult | null> {
  const params = new URLSearchParams();
  if (path) params.set("path", path);
  if (kind) params.set("kind", kind);
  const body = await safe(
    request<ApiEnvelope<unknown> & BrowseResult>(
      `/api/browse?${params.toString()}`,
      { method: "GET" }
    )
  );
  return body ? (body as unknown as BrowseResult) : null;
}

/** Start a job asynchronously. Throws on validation/server errors. */
export async function startJob(opts: RunOptions): Promise<{ job_id: string }> {
  const body = await request<ApiEnvelope<unknown> & { job_id: string }>(
    `/api/run-async`,
    {
      method: "POST",
      body: JSON.stringify(opts),
    }
  );
  return { job_id: body.job_id };
}

/** Synchronous run — blocks until completion. Returns the manifest. */
export async function runJobSync(opts: RunOptions): Promise<JobManifest> {
  const body = await request<ApiEnvelope<unknown> & { manifest: JobManifest }>(
    `/api/run`,
    {
      method: "POST",
      body: JSON.stringify(opts),
    }
  );
  return body.manifest;
}

export async function rollback(manifestPath: string): Promise<{ removed: string[] }> {
  const body = await request<ApiEnvelope<unknown> & { removed: string[] }>(
    `/api/rollback`,
    {
      method: "POST",
      body: JSON.stringify({ manifest: manifestPath }),
    }
  );
  return { removed: body.removed };
}

/* ---------- new endpoints: download, open, dashboard, reviews ---------- */

/** Best-effort URL to download a file via the backend. */
export function fileDownloadUrl(serverPath: string): string {
  return `${AEGIS_API_BASE}/api/file?path=${encodeURIComponent(serverPath)}&download=1`;
}

/** Download the macOS RoboVault Opener (.app zip) for double-click .enc decryption. */
export function downloadMacosOpener() {
  if (typeof window === "undefined") return;
  const a = document.createElement("a");
  a.href = `${AEGIS_API_BASE}/api/opener/macos`;
  a.download = "RoboVault-Opener-macOS.zip";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/** Triggers a browser download of any file the backend can serve. */
export function downloadFile(serverPath: string, filename?: string) {
  if (typeof window === "undefined") return;
  const a = document.createElement("a");
  a.href = fileDownloadUrl(serverPath);
  if (filename) a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/** Ask the backend to reveal a path in the host OS file manager. */
export async function openInOS(serverPath: string): Promise<boolean> {
  try {
    await request<ApiEnvelope<unknown>>(`/api/open`, {
      method: "POST",
      body: JSON.stringify({ path: serverPath }),
    });
    return true;
  } catch {
    return false;
  }
}

export async function getDashboard(): Promise<DashboardSummary | null> {
  const body = await safe(
    request<ApiEnvelope<unknown> & DashboardSummary>(`/api/dashboard`, {
      method: "GET",
    })
  );
  return body ? (body as unknown as DashboardSummary) : null;
}

export async function getReviews(): Promise<ReviewsMap | null> {
  const body = await safe(
    request<ApiEnvelope<unknown> & { reviews: ReviewsMap }>(`/api/reviews`, {
      method: "GET",
    })
  );
  return body ? body.reviews : null;
}

export async function setReview(
  key: string,
  status: ReviewStatus | null,
  note?: string | null
): Promise<ReviewsMap> {
  const body = await request<ApiEnvelope<unknown> & { reviews: ReviewsMap }>(
    `/api/reviews`,
    {
      method: "POST",
      body: JSON.stringify({ key, status, note: note ?? null }),
    }
  );
  return body.reviews;
}

/* ---------- encryption ---------- */

export async function getEncryptionSummary(): Promise<EncryptionSummary | null> {
  const body = await safe(
    request<ApiEnvelope<unknown> & EncryptionSummary>(`/api/encryption`, {
      method: "GET",
    })
  );
  return body ? (body as unknown as EncryptionSummary) : null;
}

export async function verifyEncryptionPassphrase(
  path: string,
  passphrase: string
): Promise<EncryptionVerifyResult> {
  try {
    const body = await request<
      ApiEnvelope<unknown> & EncryptionVerifyResult & { verified?: boolean }
    >(`/api/encryption/verify`, {
      method: "POST",
      body: JSON.stringify({ path, passphrase }),
    });
    return {
      verified: Boolean(body.verified),
      source_name: body.source_name,
      algorithm: body.algorithm,
      bytes: body.bytes,
    };
  } catch (e) {
    return {
      verified: false,
      error: e instanceof Error ? e.message : "Verification failed",
    };
  }
}

/** Decrypt an encrypted archive and download extracted documents (ZIP of PDFs). */
export async function decryptAndDownload(path: string, passphrase: string): Promise<void> {
  if (typeof window === "undefined") return;
  const res = await fetch(`${AEGIS_API_BASE}/api/encryption/decrypt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, passphrase }),
  });
  if (!res.ok) {
    let message = `Decrypt failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  const blob = await res.blob();
  const cd = res.headers.get("Content-Disposition") ?? "";
  const match = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(cd);
  const filename = match
    ? decodeURIComponent(match[1].replace(/"/g, ""))
    : path.split("/").pop()?.replace(/\.enc$/, "") ?? "decrypted.bin";
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ---------- helpers used across pages ---------- */

/**
 * Flatten a job manifest's `quickfinder_groups` into a list of files
 * with derived metadata (ticker, year/quarter, doc type) parsed from
 * the renamer's filename convention: TICKER_PUBLISHER_DOCTYPE_YYYYQ_LANG_DATE.ext
 */
export function flattenManifest(manifest: JobManifest) {
  const out: Array<{
    id: string;
    group: string;
    original: string;
    renamed: string;
    new_path: string;
    ticker: string;
    publisher: string;
    docType: string;
    yearQuarter: string;
    language: string;
    publicationDate: string;
    archive?: JobManifest["quickfinder_groups"][string]["archive"];
    encrypted: boolean;
  }> = [];

  // Doc type can span multiple tokens (e.g. EARNINGS_CALL, ANNUAL_REPORT, 10-K).
  // The year_quarter token (e.g. 2024Q3) is the anchor. Everything before
  // index 2..yqIdx-1 is the doc type; after is language and date.
  const yqRegex = /^\d{4}Q[0-9]$/;

  for (const [groupKey, group] of Object.entries(manifest.quickfinder_groups)) {
    for (const f of group.files) {
      const parts = f.new_filename.replace(/\.[^.]+$/, "").split("_");
      const ticker = parts[0] ?? "";
      const publisher = parts[1] ?? "";
      const yqIdx = parts.findIndex((p, i) => i >= 2 && yqRegex.test(p));
      const docType =
        yqIdx > 2 ? parts.slice(2, yqIdx).join("_") : parts[2] ?? "";
      const yearQuarter = yqIdx >= 0 ? parts[yqIdx] : parts[3] ?? "";
      const language = yqIdx >= 0 ? parts[yqIdx + 1] ?? "" : parts[4] ?? "";
      const publicationDate =
        yqIdx >= 0
          ? parts.slice(yqIdx + 2).join("_")
          : parts.slice(5).join("_");

      out.push({
        id: `${manifest.job_id}:${groupKey}:${f.new_filename}`,
        group: groupKey,
        original: f.original,
        renamed: f.new_filename,
        new_path: f.new_path,
        ticker,
        publisher,
        docType,
        yearQuarter,
        language,
        publicationDate,
        archive: group.archive,
        encrypted: Boolean(group.archive?.encrypted_archive_path),
      });
    }
  }
  return out;
}

export { ApiError };
