import {
  Archive,
  ClipboardCheck,
  Gauge,
  Home,
  Upload,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  group: "Workspace";
  badge?: string;
}

export const navItems: NavItem[] = [
  { label: "Home", href: "/", icon: Home, group: "Workspace" },
  { label: "Dashboard", href: "/dashboard", icon: Gauge, group: "Workspace" },
  { label: "Upload", href: "/upload", icon: Upload, group: "Workspace" },
  { label: "Review", href: "/review", icon: ClipboardCheck, group: "Workspace" },
  { label: "Export", href: "/export", icon: Archive, group: "Workspace" },
];

export const navGroups: NavItem["group"][] = ["Workspace"];

export const pageMeta: Record<
  string,
  { title: string; description: string }
> = {
  "/": {
    title: "Home",
    description: "RoboVault landing page and workflow overview.",
  },
  "/dashboard": {
    title: "Dashboard",
    description: "A practical overview of document jobs, processing volume, and review needs.",
  },
  "/upload": {
    title: "Upload",
    description: "Drop financial research files into RoboVault for metadata extraction and renaming.",
  },
  "/review": {
    title: "Review",
    description: "Review suggested metadata before export.",
  },
  "/export": {
    title: "Export",
    description: "Create clean renamed copies, manifests, archives, and database records.",
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
