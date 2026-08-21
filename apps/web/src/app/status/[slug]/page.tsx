import { notFound } from "next/navigation";
import { StatusPageAutoRefresh } from "./StatusPageAutoRefresh";

const API_BASE = "http://localhost:4000";

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
  if (monitors.length === 0) return { label: "No monitors configured", color: "#888" };
  const statuses = monitors.map((m) => m.currentStatus);
  if (statuses.some((s) => s === "DOWN")) return { label: "Major outage", color: "#f85149" };
  if (statuses.some((s) => s === "DEGRADED")) return { label: "Degraded performance", color: "#d29922" };
  if (statuses.every((s) => s === "UP")) return { label: "All systems operational", color: "#2ea043" };
  return { label: "Status unknown", color: "#888" };
}

function statusColor(status: MonitorSummary["currentStatus"]): string {
  if (status === "UP") return "#2ea043";
  if (status === "DEGRADED") return "#d29922";
  if (status === "DOWN") return "#f85149";
  return "#888";
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

  return (
    <div
      style={{
        maxWidth: 800,
        margin: "40px auto",
        fontFamily: "sans-serif",
        padding: "0 16px",
        color: "white",
      }}
    >
      <StatusPageAutoRefresh />

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, margin: 0 }}>{data.title}</h1>
        {data.description && (
          <p style={{ fontSize: 14, color: "#888", marginTop: 8 }}>{data.description}</p>
        )}
      </div>

      {/* Overall banner */}
      <div
        style={{
          padding: 20,
          background: overall.color,
          color: "white",
          borderRadius: 6,
          marginBottom: 24,
          fontSize: 18,
          fontWeight: 600,
        }}
      >
        {overall.label}
      </div>

      {/* Monitor list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
        {data.monitors.map((m) => (
          <div
            key={m.id}
            style={{
              padding: 16,
              background: "#161b22",
              border: "1px solid #30363d",
              borderRadius: 6,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{m.name}</div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{m.url}</div>
              </div>
              <div
                style={{
                  padding: "4px 10px",
                  background: statusColor(m.currentStatus),
                  color: "white",
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 4,
                  letterSpacing: 0.3,
                }}
              >
                {statusLabel(m.currentStatus)}
              </div>
            </div>
            <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#888" }}>
              {m.uptimePercent !== null && (
                <span>
                  <strong style={{ color: "white" }}>{m.uptimePercent.toFixed(2)}%</strong> uptime
                  ({data.windowDays}d)
                </span>
              )}
              {m.latestResponseTime !== null && (
                <span>
                  <strong style={{ color: "white" }}>{m.latestResponseTime}ms</strong> response
                </span>
              )}
              {m.latestCheckedAt && (
                <span>Checked {formatDate(m.latestCheckedAt)}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Incidents section */}
      <div>
        <h2 style={{ fontSize: 20, marginBottom: 16 }}>
          Recent incidents (last {data.windowDays} days)
        </h2>
        {data.monitors.every((m) => m.incidents.length === 0) ? (
          <p style={{ fontSize: 14, color: "#888" }}>
            No incidents in the last {data.windowDays} days. 🎉
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {data.monitors.flatMap((m) =>
              m.incidents.map((inc) => (
                <div
                  key={inc.id}
                  style={{
                    padding: 12,
                    background: "#161b22",
                    border: "1px solid #30363d",
                    borderLeft: `4px solid ${inc.status === "ONGOING" ? "#f85149" : "#888"}`,
                    borderRadius: 4,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <strong style={{ fontSize: 14 }}>{m.name}</strong>
                    <span style={{ fontSize: 12, color: inc.status === "ONGOING" ? "#f85149" : "#888" }}>
                      {inc.status === "ONGOING" ? "ONGOING" : "RESOLVED"}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>
                    {formatDate(inc.startedAt)}
                    {" · "}
                    Duration: {formatDuration(inc.startedAt, inc.resolvedAt)}
                  </div>
                  {inc.summary && (
                    <div style={{ fontSize: 13, marginTop: 6, color: "#c9d1d9" }}>
                      {inc.summary}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}