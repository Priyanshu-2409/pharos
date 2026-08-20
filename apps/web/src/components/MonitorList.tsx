"use client";

import { useEffect, useState } from "react";
import { monitorsApi, type Monitor } from "@/lib/api";
import { getStatusIndicator, timeSince } from "@/lib/monitorStatus";
import { Modal } from "./Modal";
import { MonitorForm } from "./MonitorForm";

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

  if (loading) return <p>Loading monitors…</p>;
  if (error) return <p style={{ color: "crimson" }}>{error}</p>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, margin: 0 }}>Your monitors</h2>
        <button
          onClick={() => setCreateOpen(true)}
          style={{ padding: "8px 12px", fontSize: 14, cursor: "pointer" }}
        >
          + New Monitor
        </button>
      </div>

      {monitors.length === 0 ? (
        <p style={{ color: "#666" }}>No monitors yet. Create one to get started.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {monitors.map((m) => {
            const indicator = getStatusIndicator(m);
            return (
              <li
                key={m.id}
                style={{
                  padding: 12,
                  background: "#f5f5f5",
                  color: "black",
                  borderRadius: 4,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 14 }}>{indicator.emoji}</span>
                    <span style={{ fontWeight: 600 }}>{m.name}</span>
                    {m.hasOpenIncident && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          background: "#f85149",
                          color: "white",
                          padding: "2px 6px",
                          borderRadius: 3,
                          letterSpacing: 0.5,
                        }}
                      >
                        INCIDENT
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: "#666" }}>
                    {m.url} • every {m.intervalSeconds}s
                  </div>
                  <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
                    {m.latestCheck ? (
                      <>
                        {indicator.label} • {timeSince(m.latestCheck.checkedAt)} • {m.latestCheck.responseTime}ms
                        {m.latestCheck.statusCode !== null && ` • HTTP ${m.latestCheck.statusCode}`}
                      </>
                    ) : (
                      <>No checks yet</>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setEditingMonitor(m)}
                    style={{ padding: "6px 10px", fontSize: 13, cursor: "pointer" }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(m)}
                    style={{ padding: "6px 10px", fontSize: 13, cursor: "pointer", color: "crimson" }}
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Monitor">
        <MonitorForm
          onSuccess={() => {
            setCreateOpen(false);
            fetchMonitors();
          }}
          onCancel={() => setCreateOpen(false)}
        />
      </Modal>

      <Modal open={!!editingMonitor} onClose={() => setEditingMonitor(null)} title="Edit Monitor">
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