"use client";

import { useState } from "react";
import { monitorsApi, type Monitor, type MonitorInput } from "@/lib/api";
import { Alert, Button, Field, inputClass } from "@/components/app/ui";

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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Name">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={100}
          placeholder="Payments API"
          className={inputClass}
        />
      </Field>

      <Field label="URL">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          placeholder="https://example.com"
          className={`${inputClass} font-mono`}
        />
      </Field>

      <Field label="Check interval (seconds)" hint="Between 30 and 3600.">
        <input
          type="number"
          value={intervalSeconds}
          onChange={(e) => setIntervalSeconds(Number(e.target.value))}
          required
          min={30}
          max={3600}
          className={inputClass}
        />
      </Field>

      {error && <Alert tone="error">{error}</Alert>}

      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? "Saving…" : isEdit ? "Save changes" : "Create monitor"}
        </Button>
      </div>
    </form>
  );
}
