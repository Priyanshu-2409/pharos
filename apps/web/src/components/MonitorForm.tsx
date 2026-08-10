"use client";

import { useState } from "react";
import { monitorsApi, type Monitor, type MonitorInput } from "@/lib/api";

type Props = {
  // If provided, form is in "edit" mode — pre-fills values, calls update
  monitor?: Monitor;
  onSuccess: () => void;
  onCancel: () => void;
};

export function MonitorForm({ monitor, onSuccess, onCancel }: Props) {
  const isEdit = !!monitor;

  const [name, setName] = useState(monitor?.name ?? "");
  const [url, setUrl] = useState(monitor?.url ?? "");
  const [intervalSeconds, setIntervalSeconds] = useState(monitor?.intervalSeconds ?? 300);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const input: MonitorInput = { name, url, intervalSeconds };
      if (isEdit) {
        await monitorsApi.update(monitor.id, input);
      } else {
        await monitorsApi.create(input);
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
        Name
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={100}
          style={{padding: 8, fontSize: 14, border: "1px solid #ccc", borderRadius: 4, background: "white",color: "black",
          }}
        />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
        URL
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          placeholder="https://example.com"
          style={{padding: 8, fontSize: 14, border: "1px solid #ccc", borderRadius: 4, background: "white",color: "black",
          }}
        />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
        Check interval (seconds)
        <input
          type="number"
          value={intervalSeconds}
          onChange={(e) => setIntervalSeconds(Number(e.target.value))}
          required
          min={30}
          max={3600}
          style={{padding: 8, fontSize: 14, border: "1px solid #ccc", borderRadius: 4, background: "white",color: "black",
          }}
        />
      </label>

      {error && <p style={{ color: "crimson", fontSize: 13, margin: 0 }}>{error}</p>}

      <div style={{ display: "flex", gap: 8, marginTop: 8, justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          style={{ padding: "8px 16px", fontSize: 14, cursor: "pointer" }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "8px 16px",
            fontSize: 14,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Saving…" : isEdit ? "Save" : "Create"}
        </button>
      </div>
    </form>
  );
}