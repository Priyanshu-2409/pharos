"use client";

import { useEffect, useState } from "react";
import { monitorsApi, type Monitor } from "@/lib/api";
import { getStatusIndicator, timeSince } from "@/lib/monitorStatus";
import { Modal } from "./Modal";
import { MonitorForm } from "./MonitorForm";
import { Alert, Badge, Button, Dot, Empty, Loading } from "@/components/app/ui";

export function MonitorList() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [editingMonitor, setEditingMonitor] = useState<Monitor | null>(null);

  async function fetchMonitors() {
    setError(null);
    try {
      const { monitors } = await monitorsApi.list();
      setMonitors(monitors);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load monitors");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
  fetchMonitors();
  const interval = setInterval(fetchMonitors, 10000);
  return () => clearInterval(interval);
}, []);

  async function handleDelete(monitor: Monitor) {
    if (!confirm(`Delete "${monitor.name}"?`)) return;
    try {
      await monitorsApi.delete(monitor.id);
      await fetchMonitors();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  }

  if (loading) return <Loading label="Loading monitors…" />;
  if (error) return <Alert tone="error">{error}</Alert>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-medium">
          Your monitors{" "}
          <span className="ml-1 font-mono text-xs text-fog">{monitors.length}</span>
        </h2>
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          New monitor
        </Button>
      </div>

      {monitors.length === 0 ? (
        <Empty
          title="No monitors yet"
          body="Add an endpoint and Pharos starts checking it within the minute."
        />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-slate">
          {monitors.map((m) => {
            const indicator = getStatusIndicator(m);
            return (
              <li
                key={m.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Dot color={indicator.color} pulse={m.hasOpenIncident} />
                    <span className="font-medium">{m.name}</span>
                    {m.hasOpenIncident && <Badge tone="danger">Incident</Badge>}
                    {m.status === "PAUSED" && <Badge>Paused</Badge>}
                  </div>
                  <div className="mt-1 truncate font-mono text-xs text-fog">
                    {m.url} <span className="text-fog/50">·</span> every {m.intervalSeconds}s
                  </div>
                  <div className="mt-1.5 text-xs text-fog">
                    {m.latestCheck ? (
                      <>
                        <span style={{ color: indicator.color }}>{indicator.label}</span>
                        {" · "}
                        {timeSince(m.latestCheck.checkedAt)}
                        {" · "}
                        {m.latestCheck.responseTime}ms
                        {m.latestCheck.statusCode !== null && ` · HTTP ${m.latestCheck.statusCode}`}
                      </>
                    ) : (
                      <>{indicator.label}</>
                    )}
                  </div>
                </div>
                <div className="flex flex-none gap-2">
                  <Button size="sm" onClick={() => setEditingMonitor(m)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => handleDelete(m)}>
                    Delete
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New monitor">
        <MonitorForm
          onSuccess={() => {
            setCreateOpen(false);
            fetchMonitors();
          }}
          onCancel={() => setCreateOpen(false)}
        />
      </Modal>

      <Modal open={!!editingMonitor} onClose={() => setEditingMonitor(null)} title="Edit monitor">
        {editingMonitor && (
          <MonitorForm
            monitor={editingMonitor}
            onSuccess={() => {
              setEditingMonitor(null);
              fetchMonitors();
            }}
            onCancel={() => setEditingMonitor(null)}
          />
        )}
      </Modal>
    </div>
  );
}
