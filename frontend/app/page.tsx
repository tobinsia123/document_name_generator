import Link from "next/link";
import {
  ArrowRight,
  ClipboardCheck,
  Database,
  FileArchive,
  FileSearch,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const workflowSteps = [
  {
    title: "Upload & Ingest",
    body: "Drop analyst reports, transcripts, SEC filings, and supporting research files into one job.",
    icon: UploadCloud,
  },
  {
    title: "Extract & Analyze Metadata",
    body: "Pull ticker, publisher, document type, period, language, and dates from messy source files.",
    icon: FileSearch,
  },
  {
    title: "Classify & Assess Sensitivity",
    body: "Surface confidence and sensitivity signals before files move into the clean document set.",
    icon: ClipboardCheck,
  },
  {
    title: "Rename & Organize",
    body: "Create standardized filenames and structured outputs that are easy to search and audit.",
    icon: ArrowRight,
  },
  {
    title: "Compress & Encrypt",
    body: "Package clean copies into compressed or encrypted archives for controlled distribution.",
    icon: FileArchive,
  },
  {
    title: "Secure Storage & Retrieval",
    body: "Store final documents and manifests with retrieval-ready metadata and traceable records.",
    icon: Database,
  },
];

export default function Home() {
  return (
    <main className="min-h-svh bg-white text-[color:oklch(0.18_0.035_260)]">
      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_72%_18%,oklch(0.58_0.22_280/0.36),transparent_28%),radial-gradient(circle_at_63%_45%,oklch(0.63_0.2_235/0.46),transparent_33%),linear-gradient(145deg,oklch(0.11_0.032_260),oklch(0.08_0.024_255)_52%,oklch(0.025_0.012_265))] px-4 py-5 text-white sm:px-6">
        <div className="absolute inset-x-0 top-20 h-64 bg-[radial-gradient(ellipse_at_center,oklch(0.6_0.2_245/0.24),transparent_64%)] blur-2xl" />
        <div className="absolute -right-20 top-24 h-[520px] w-[720px] rounded-full border border-white/10 bg-[linear-gradient(120deg,transparent,oklch(0.62_0.23_250/0.24),transparent)] blur-sm" />
        <div className="relative mx-auto flex min-h-[720px] max-w-[1400px] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-black/20 px-6 py-7 shadow-[0_28px_80px_-36px_oklch(0.1_0.08_260/0.9)] backdrop-blur sm:px-10 lg:px-14">
          <header className="flex items-center gap-5">
            <Link href="/" className="mr-auto flex items-center">
              <img
                src="/robovault-logo.svg"
                alt="RoboVault"
                className="h-12 w-auto max-w-[210px] brightness-0 invert"
              />
            </Link>
            <nav className="hidden items-center gap-8 text-sm font-medium text-white/78 md:flex">
              <Link href="/" className="transition hover:text-white">
                Home
              </Link>
              <Link href="/dashboard" className="transition hover:text-white">
                Dashboard
              </Link>
              <Link href="/upload" className="transition hover:text-white">
                Upload
              </Link>
              <Link href="/review" className="transition hover:text-white">
                Review
              </Link>
              <Link href="/export" className="transition hover:text-white">
                Export
              </Link>
            </nav>
            <Button
              asChild
              className="hidden bg-[oklch(0.62_0.22_286)] text-white shadow-[0_0_32px_oklch(0.62_0.22_286/0.52)] hover:bg-[oklch(0.58_0.22_286)] sm:inline-flex"
            >
              <Link href="/upload">Start New Job</Link>
            </Button>
          </header>

          <div className="relative z-10 flex flex-1 items-center py-20">
            <div className="max-w-4xl">
              <h1 className="max-w-5xl text-5xl font-semibold leading-[0.98] tracking-normal text-white sm:text-6xl lg:text-7xl">
                Secure, organize, and retrieve financial research documents.
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-white/72 sm:text-xl">
                RoboVault turns messy analyst reports, earnings transcripts, and SEC filings
                into standardized, searchable, and secure document sets.
              </p>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="h-12 rounded-lg bg-[oklch(0.62_0.22_286)] px-6 text-white shadow-[0_0_36px_oklch(0.62_0.22_286/0.56)] hover:bg-[oklch(0.58_0.22_286)]"
                >
                  <Link href="/upload">
                    Start New Job <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 rounded-lg border-white/18 bg-white/5 px-6 text-white hover:bg-white/10 hover:text-white"
                >
                  <Link href="#workflow">Review Workflow</Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute -bottom-20 right-[-40px] select-none text-[150px] font-black leading-none tracking-normal text-white/[0.075] sm:text-[210px] lg:text-[260px]">
            ROBOVAULT
          </div>
        </div>
      </section>

      <section id="workflow" className="bg-[oklch(0.98_0.006_240)] px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-[1220px]">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-normal text-[color:oklch(0.2_0.04_260)]">
              A clean path from messy files to secure document sets.
            </h2>
            <p className="mt-3 text-sm leading-6 text-[color:oklch(0.46_0.025_250)]">
              Each step stays readable, auditable, and designed for research, finance,
              compliance, and data operations teams.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {workflowSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
                  className="group rounded-xl border border-[oklch(0.86_0.022_238)] bg-white p-6 shadow-[0_18px_42px_-34px_oklch(0.18_0.05_250/0.4)] transition hover:-translate-y-0.5 hover:border-[oklch(0.68_0.1_260)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-[oklch(0.94_0.026_245)] text-[oklch(0.46_0.18_282)]">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-semibold text-[oklch(0.48_0.12_260)]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold tracking-normal text-[color:oklch(0.2_0.04_260)]">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[color:oklch(0.46_0.025_250)]">
                    {step.body}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
