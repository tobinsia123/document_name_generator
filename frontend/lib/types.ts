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
