export type Sensitivity = "public" | "internal" | "confidential" | "restricted";
export type FileStatus = "queued" | "analyzing" | "renamed" | "encrypted" | "archived" | "failed";
export type EncryptionState = "none" | "aes256" | "chacha20" | "client-managed";
export type ComplianceFramework =
  | "SOC2"
  | "HIPAA"
  | "GDPR"
  | "ISO27001"
  | "PCI-DSS"
  | "FINRA"
  | "CCPA";

export interface DetectedEntity {
  type:
    | "SSN"
    | "EIN"
    | "EMAIL"
    | "PHONE"
    | "CREDIT_CARD"
    | "PASSPORT"
    | "BANK_ACCOUNT"
    | "MRN"
    | "PHI"
    | "API_KEY"
    | "ROUTING";
  count: number;
}

export interface RoboVaultFile {
  id: string;
  originalName: string;
  renamedTo?: string;
  size: number;
  mimeType: string;
  ticker?: string;
  publisher?: string;
  reportType?: string;
  yearQuarter?: string;
  publicationDate?: string;
  sensitivity: Sensitivity;
  sensitivityScore: number; // 0-100
  status: FileStatus;
  encryption: EncryptionState;
  framework?: ComplianceFramework[];
  entities: DetectedEntity[];
  uploadedBy: string;
  uploadedAt: string;
  storage: "vault" | "filecoin" | "arweave" | "s3" | "gcs";
  hash: string;
  tags: string[];
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  actorAvatar?: string;
  action: string;
  resource: string;
  outcome: "success" | "denied" | "warning";
  ip: string;
  hash: string;
  prevHash: string;
  metadata?: Record<string, string | number>;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "Owner" | "Admin" | "Compliance Officer" | "Analyst" | "Viewer";
  status: "active" | "invited" | "suspended";
  lastActive: string;
  mfa: boolean;
  department: string;
  initials: string;
}

export interface Policy {
  id: string;
  name: string;
  description: string;
  trigger: string;
  action: string;
  framework: ComplianceFramework[];
  enabled: boolean;
  hits: number;
  lastTriggered?: string;
  severity: "low" | "medium" | "high" | "critical";
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  createdBy: string;
  createdAt: string;
  lastUsed?: string;
  status: "active" | "revoked";
  environment: "production" | "staging" | "development";
}

export interface StorageBackend {
  id: string;
  name: string;
  type: "vault" | "filecoin" | "arweave" | "s3" | "gcs" | "azure";
  region?: string;
  capacity: number;
  used: number;
  files: number;
  status: "healthy" | "syncing" | "degraded";
  immutable: boolean;
  encryption: "aes256" | "client-managed" | "kms";
  cost: number;
}

/* ----------------------------------------------------------------------
 * Live backend types
 * Mirror the shape returned by the Flask backend in raw_data/AMAZON/web_app.py
 * so the dashboard pages can consume real data when AEGIS_API is reachable.
 * ---------------------------------------------------------------------- */

export interface BackendConfig {
  defaults: {
    input_path: string;
    copy_to: string;
    archive_dir: string;
    manifest: string;
  };
  ticker: string;
  group_by_fields: string[];
  default_group_by: string[];
}

export interface ManifestArchive {
  archive_path?: string;
  encrypted_archive_path?: string;
  encrypted_checksum_sha256?: string;
  encryption_algorithm?: string;
  status?: string;
  file_count?: number;
  checksum_sha256?: string;
  compression_level?: number;
}

export interface ManifestFile {
  original: string;
  new_filename: string;
  new_path: string;
}

export interface ManifestGroup {
  file_count: number;
  files: ManifestFile[];
  archive?: ManifestArchive;
}

export interface JobManifest {
  manifest_version: string;
  job_id: string;
  created_at: string;
  dry_run: boolean;
  input_path: string;
  ticker: string;
  group_by: string[];
  copy_to_dir?: string;
  archive_dir?: string;
  processing_options?: {
    compression_level?: number | string;
    encrypt_archives?: boolean;
  };
  summary: {
    total_processed: number;
    successful: number;
    failed: number;
    groups: number;
    archives_created: number;
  };
  quickfinder_groups: Record<string, ManifestGroup>;
}

export interface JobEvent {
  event: string;
  stage?: string;
  current?: number;
  total?: number;
  file?: string;
  status?: string;
  message?: string;
  timestamp?: string;
  [k: string]: unknown;
}

export interface JobRecord {
  job_id: string;
  status: "queued" | "running" | "completed" | "failed";
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  current_stage: string | null;
  file_progress: {
    stage?: string;
    current?: number;
    total?: number;
    file?: string;
    status?: string;
  } | null;
  events: JobEvent[];
  summary: JobManifest["summary"] | null;
  manifest: JobManifest | null;
  error: string | null;
}

export interface BrowseEntry {
  name: string;
  path: string;
  is_dir: boolean;
  is_file: boolean;
}

export interface BrowseResult {
  ok: boolean;
  cwd: string;
  parent: string | null;
  entries: BrowseEntry[];
  roots: string[];
}

export interface RunOptions {
  input_path: string;
  copy_to?: string;
  archive_dir?: string;
  manifest?: string;
  ticker?: string;
  recursive?: boolean;
  archive?: boolean;
  dry_run?: boolean;
  group_by?: string[] | string;
  compression_level?: "fast" | "balanced" | "max" | number;
  encrypt_archives?: boolean;
  encryption_passphrase?: string;
  remove_plaintext_archive?: boolean;
}

export type ReviewStatus = "approved" | "flagged";

export interface ReviewRecord {
  status: ReviewStatus;
  note: string | null;
  updated_at: string;
}

export type ReviewsMap = Record<string, ReviewRecord>;

export interface DashboardKpis {
  files_processed: number;
  archives_created: number;
  encrypted_archives: number;
  groups: number;
  needs_review: number;
  approved: number;
  flagged: number;
  total_bytes: number;
}

export interface EncryptionArchive {
  group_key: string;
  file_count: number;
  encrypted_path: string;
  encrypted_checksum_sha256?: string;
  encryption_algorithm: string;
  archive_path?: string;
  has_plaintext_archive: boolean;
  status?: string;
}

export interface EncryptionSummary {
  cryptography_available: boolean;
  manifest_path: string | null;
  job_encrypt_enabled: boolean;
  summary: {
    encrypted_archives: number;
    total_archives: number;
    encrypted_bytes: number;
    algorithm: string;
    kdf: string;
    iterations: number;
  };
  archives: EncryptionArchive[];
}

export interface EncryptionVerifyResult {
  verified: boolean;
  source_name?: string;
  algorithm?: string;
  bytes?: number;
  error?: string;
}

export interface DashboardSummary {
  manifest_path: string | null;
  manifest_created_at: string | null;
  ticker: string | null;
  input_path: string | null;
  kpis: DashboardKpis;
  doc_type_counts: Record<string, number>;
  recent_jobs: Array<{
    job_id: string;
    status: JobRecord["status"];
    created_at: string;
    completed_at: string | null;
    current_stage: string | null;
    summary: JobManifest["summary"] | null;
    ticker: string | null;
  }>;
  active_jobs: number;
}
