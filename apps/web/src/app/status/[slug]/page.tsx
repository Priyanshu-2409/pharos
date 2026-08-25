import { notFound } from "next/navigation";
import Link from "next/link";
import { StatusPageAutoRefresh } from "./StatusPageAutoRefresh";
import { Wordmark } from "@/components/landing/Wordmark";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type Incident = {
  id: string;
  startedAt: string;
  resolvedAt: string | null;
  summary: string | null;
  status: "ONGOING" | "RESOLVED";
};

type MonitorSummary = {
  id: string;
  name: string;
  url: string;
  currentStatus: "UP" | "DOWN" | "DEGRADED" | null;
  latestResponseTime: number | null;
  latestCheckedAt: string | null;
  uptimePercent: number | null;
  incidents: Incident[];
};

type StatusPageData = {
  title: string;
  description: string | null;
  monitors: MonitorSummary[];
  windowDays: number;
};

async function fetchStatus(slug: string): Promise<StatusPageData | null> {
  try {
    const res = await fetch(`${API_BASE}/api/public/status/${slug}`, {
      // Don't cache — always fetch fresh so status is live
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function overallStatus(monitors: MonitorSummary[]): { label: string; color: string } {
  if (monitors.length === 0) return { label: "No monitors configured", color: "#8b93a6" };
  const statuses = monitors.map((m) => m.currentStatus);
  if (statuses.some((s) => s === "DOWN")) return { label: "Major outage", color: "#e5484d" };
  if (statuses.some((s) => s === "DEGRADED")) return { label: "Degraded performance", color: "#e8c46a" };
  if (statuses.every((s) => s === "UP")) return { label: "All systems operational", color: "#3ecf8e" };
  return { label: "Status unknown", color: "#8b93a6" };
}

function statusColor(status: MonitorSummary["currentStatus"]): string {
  if (status === "UP") return "#3ecf8e";
  if (status === "DEGRADED") return "#e8c46a";
  if (status === "DOWN") return "#e5484d";
  return "#8b93a6";
}

function statusLabel(status: MonitorSummary["currentStatus"]): string {
  if (status === "UP") return "Operational";
  if (status === "DEGRADED") return "Degraded";
  if (status === "DOWN") return "Down";
  return "Unknown";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

function formatDuration(startedAt: string, resolvedAt: string | null): string {
  const start = new Date(startedAt).getTime();
  const end = resolvedAt ? new Date(resolvedAt).getTime() : Date.now();
  const minutes = Math.floor((end - start) / 60000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMin = minutes % 60;
  if (hours < 24) return `${hours}h ${remainingMin}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

export default async function StatusPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await fetchStatus(slug);

  if (!data) {
    notFound();
  }

  const overall = overallStatus(data.monitors);
  const incidents = data.monitors.flatMap((m) => m.incidents.map((inc) => ({ inc, monitor: m })));

  return (
    <div className="min-h-screen bg-ink font-sans text-chalk selection:bg-beam/30">
      <StatusPageAutoRefresh />

      <div className="mx-auto max-w-3xl px-6 py-12">
        {/* Header */}
        <header className="mb-8">
          <h1 className="font-display text-3xl font-medium tracking-tight md:text-4xl">{data.title}</h1>
          {data.description && <p className="mt-2 text-sm text-fog">{data.description}</p>}
        </header>

        {/* Overall banner */}
        <div
          className="mb-6 flex items-center gap-3 rounded-2xl border px-5 py-4"
          style={{ borderColor: `${overall.color}66`, background: `${overall.color}14` }}
        >
          <span
            className="h-2.5 w-2.5 flex-none rounded-full"
            style={{ background: overall.color }}
            aria-hidden="true"
          />
          <span className="font-display text-lg font-medium" style={{ color: overall.color }}>
            {overall.label}
          </span>
        </div>

        {/* Monitor list */}
        <ul className="mb-12 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-slate">
          {data.monitors.map((m) => {
            const color = statusColor(m.currentStatus);
            return (
              <li key={m.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium">{m.name}</div>
                    <div className="mt-0.5 truncate font-mono text-xs text-fog">{m.url}</div>
                  </div>
                  <span
                    className="flex flex-none items-center gap-2 rounded-full border px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider"
                    style={{ color, borderColor: `${color}66` }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} aria-hidden="true" />
                    {statusLabel(m.currentStatus)}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-fog">
                  {m.uptimePercent !== null && (
                    <span>
                      <strong className="font-medium text-chalk">{m.uptimePercent.toFixed(2)}%</strong>{" "}
                      uptime ({data.windowDays}d)
                    </span>
                  )}
                  {m.latestResponseTime !== null && (
                    <span>
                      <strong className="font-medium text-chalk">{m.latestResponseTime}ms</strong> response
                    </span>
                  )}
                  {m.latestCheckedAt && <span>Checked {formatDate(m.latestCheckedAt)}</span>}
                </div>
              </li>
            );
          })}
        </ul>

        {/* Incidents section */}
        <section>
          <h2 className="mb-4 font-display text-xl font-medium">
            Recent incidents{" "}
            <span className="font-mono text-xs font-normal text-fog">last {data.windowDays} days</span>
          </h2>
          {incidents.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line px-5 py-8 text-center text-sm text-fog">
              No incidents in the last {data.windowDays} days.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {incidents.map(({ inc, monitor }) => {
                const ongoing = inc.status === "ONGOING";
                return (
                  <li
                    key={inc.id}
                    className="rounded-2xl border border-line bg-slate px-5 py-4"
                    style={{ borderLeft: `3px solid ${ongoing ? "#e5484d" : "#8b93a6"}` }}
                  >
                    <div className="flex items-baseline justify-between gap-4">
                      <strong className="text-sm font-medium">{monitor.name}</strong>
                      <span
                        className="font-mono text-[11px] uppercase tracking-wider"
                        style={{ color: ongoing ? "#e5484d" : "#8b93a6" }}
                      >
                        {ongoing ? "Ongoing" : "Resolved"}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-fog">
                      {formatDate(inc.startedAt)}
                      {" · "}
                      Duration: {formatDuration(inc.startedAt, inc.resolvedAt)}
                    </div>
                    {inc.summary && <div className="mt-2 text-sm text-chalk/85">{inc.summary}</div>}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <footer className="mt-16 flex items-center justify-between border-t border-line pt-6 text-xs text-fog">
          <span>Refreshes every 30 seconds.</span>
          <Link href="/" className="inline-flex items-center gap-1.5 hover:text-chalk">
            Powered by <Wordmark className="[&>span]:text-sm" />
          </Link>
        </footer>
      </div>
    </div>
  );
}
