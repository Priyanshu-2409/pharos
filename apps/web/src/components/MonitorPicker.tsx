"use client";

import { useEffect, useState } from "react";
import { monitorsApi, type Monitor } from "@/lib/api";
import { Alert, Button, Loading } from "@/components/app/ui";

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

  if (loading) return <Loading label="Loading monitors…" />;

  if (allMonitors.length === 0) {
    return (
      <p className="text-sm text-fog">
        You have no monitors yet. Create some from the dashboard first.
      </p>
    );
  }

  const arrow =
    "flex h-7 w-7 items-center justify-center rounded-md border border-line text-xs text-fog transition-colors hover:border-fog hover:text-chalk disabled:cursor-not-allowed disabled:opacity-30";

  return (
    <div>
      <p className="mb-3 text-sm text-fog">
        Select which monitors appear on this page. Reorder with the arrows.
      </p>
      <ul className="flex flex-col gap-2">
        {allMonitors.map((m) => {
          const selected = selectedIds.includes(m.id);
          const position = selected ? selectedIds.indexOf(m.id) + 1 : null;
          return (
            <li
              key={m.id}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                selected ? "border-beam/50 bg-beam/5" : "border-line bg-ink"
              }`}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={() => toggle(m.id)}
                className="h-4 w-4 accent-[#e8c46a]"
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{m.name}</div>
                <div className="truncate font-mono text-xs text-fog">{m.url}</div>
              </div>
              {selected && position !== null && (
                <div className="flex items-center gap-1.5">
                  <span className="mr-1 min-w-6 text-right font-mono text-xs text-beam">
                    #{position}
                  </span>
                  <button
                    type="button"
                    onClick={() => moveUp(m.id)}
                    disabled={position === 1}
                    className={arrow}
                    aria-label="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDown(m.id)}
                    disabled={position === selectedIds.length}
                    className={arrow}
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

      <div className="mt-4 flex flex-col gap-3">
        {error && <Alert tone="error">{error}</Alert>}
        {success && <Alert tone="success">Saved</Alert>}
        <div>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save monitors"}
          </Button>
        </div>
      </div>
    </div>
  );
}
