import {
  Activity,
  Boxes,
  CreditCard,
  FileSearch,
  FolderLock,
  Gauge,
  KeyRound,
  ShieldCheck,
  Server,
  Settings,
  ScrollText,
  Upload,
  Users,
  type LucideIcon,
  Sparkles,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  group: "Operate" | "Govern" | "Org";
  badge?: string;
}

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: Gauge, group: "Operate" },
  { label: "Upload Center", href: "/upload", icon: Upload, group: "Operate" },
  { label: "AI Analysis", href: "/analysis", icon: Sparkles, group: "Operate", badge: "LIVE" },
  { label: "File Explorer", href: "/files", icon: FolderLock, group: "Operate" },

  { label: "Compliance", href: "/compliance", icon: ShieldCheck, group: "Govern" },
  { label: "Encryption", href: "/encryption", icon: KeyRound, group: "Govern" },
  { label: "Policies", href: "/policies", icon: ScrollText, group: "Govern" },
  { label: "Audit Logs", href: "/audit", icon: Activity, group: "Govern" },

  { label: "Storage", href: "/storage", icon: Server, group: "Org" },
  { label: "Team", href: "/team", icon: Users, group: "Org" },
  { label: "API Keys", href: "/api-keys", icon: Boxes, group: "Org" },
  { label: "Billing", href: "/billing", icon: CreditCard, group: "Org" },
  { label: "Settings", href: "/settings", icon: Settings, group: "Org" },
];

export const navGroups: NavItem["group"][] = ["Operate", "Govern", "Org"];

export const pageMeta: Record<
  string,
  { title: string; description: string }
> = {
  "/dashboard": {
    title: "Market Insights",
    description: "Real-time signal across documents, naming, risk, and market-ready outputs.",
  },
  "/upload": {
    title: "Upload Center",
    description: "Ingest files into Project Z. AI analysis, renaming, and policy enforcement run automatically.",
  },
  "/analysis": {
    title: "AI Analysis",
    description: "Sensitivity scoring, entity extraction, and naming inference across recent uploads.",
  },
  "/files": {
    title: "File Explorer",
    description: "Search, filter, and act on every file under governance.",
  },
  "/compliance": {
    title: "Compliance Center",
    description: "Continuous control monitoring across SOC 2, HIPAA, GDPR, ISO 27001, PCI-DSS, FINRA.",
  },
  "/encryption": {
    title: "Encryption Manager",
    description: "Keys, rotation schedules, and per-file cryptographic state.",
  },
  "/policies": {
    title: "Security Policies",
    description: "Declarative rules that automatically enforce data protection at ingest and egress.",
  },
  "/audit": {
    title: "Audit Logs",
    description: "Immutable, hash-chained record of every action performed across the platform.",
  },
  "/storage": {
    title: "Storage",
    description: "Hot, cold, and decentralized archival backends with replication and immutability.",
  },
  "/team": {
    title: "Team Management",
    description: "People, roles, and access. Least-privilege by default.",
  },
  "/api-keys": {
    title: "API Keys",
    description: "Programmatic access tokens with fine-grained scopes and rotation.",
  },
  "/billing": {
    title: "Billing & Usage",
    description: "Plan, invoices, and consumption across files, scans, and storage.",
  },
  "/settings": {
    title: "Settings",
    description: "Workspace, security, and notification preferences.",
  },
};
