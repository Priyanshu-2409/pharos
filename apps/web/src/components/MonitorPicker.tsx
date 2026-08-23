"use client";

import { useEffect, useState } from "react";
import { monitorsApi, type Monitor } from "@/lib/api";

type Props = {
  initialSelectedIds: string[];
  onSave: (ids: string[]) => Promise<void>;
};

export function MonitorPicker({ initialSelectedIds, onSave }: Props) {
  const [allMonitors, setAllMonitors] = useState<Monitor[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const { monitors } = await monitorsApi.list();
        setAllMonitors(monitors);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load monitors");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function toggle(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function moveUp(id: string) {
    setSelectedIds((prev) => {
      const i = prev.indexOf(id);
      if (i <= 0) return prev;
      const next = [...prev];
      [next[i - 1], next[i]] = [next[i], next[i - 1]];
      return next;
    });
  }

  function moveDown(id: string) {
    setSelectedIds((prev) => {
      const i = prev.indexOf(id);
      if (i < 0 || i >= prev.length - 1) return prev;
      const next = [...prev];
      [next[i], next[i + 1]] = [next[i + 1], next[i]];
      return next;
    });
  }

  async function handleSave() {
    setError(null);
    setSuccess(false);
    setSaving(true);
    try {
      await onSave(selectedIds);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p style={{ fontSize: 13, color: "#666" }}>Loading monitors…</p>;

  if (allMonitors.length === 0) {
    return (
      <p style={{ fontSize: 13, color: "#666" }}>
        You have no monitors yet. Create some from the dashboard first.
      </p>
    );
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: "#666", marginTop: 0, marginBottom: 12 }}>
        Select which monitors appear on this page. Reorder using the arrows.
      </p>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        {allMonitors.map((m) => {
          const selected = selectedIds.includes(m.id);
          const position = selected ? selectedIds.indexOf(m.id) + 1 : null;
          return (
            <li
              key={m.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: 8,
                background: selected ? "#e6f4ea" : "#fff",
                color: "black",
                borderRadius: 4,
                border: selected ? "1px solid #2ea043" : "1px solid #ccc",
              }}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={() => toggle(m.id)}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{m.name}</div>
                <div style={{ fontSize: 12, color: "#666" }}>{m.url}</div>
              </div>
              {selected && position !== null && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                  <span style={{ fontWeight: 600, minWidth: 24, textAlign: "right" }}>
                    #{position}
                  </span>
                  <button
                    type="button"
                    onClick={() => moveUp(m.id)}
                    disabled={position === 1}
                    style={arrowStyle(position === 1)}
                    aria-label="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDown(m.id)}
                    disabled={position === selectedIds.length}
                    style={arrowStyle(position === selectedIds.length)}
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {error && <p style={{ color: "crimson", fontSize: 13, marginTop: 12, marginBottom: 0 }}>{error}</p>}
      {success && <p style={{ color: "#2ea043", fontSize: 13, marginTop: 12, marginBottom: 0 }}>✓ Saved</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          marginTop: 16,
          padding: "8px 16px",
          fontSize: 14,
          cursor: saving ? "not-allowed" : "pointer",
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? "Saving…" : "Save monitors"}
      </button>
    </div>
  );
}

function arrowStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: "2px 8px",
    fontSize: 12,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.3 : 1,
    background: "white",
    border: "1px solid #ccc",
    borderRadius: 3,
    color: "black",
  };
}
