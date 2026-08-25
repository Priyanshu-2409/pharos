"use client";

import { useState } from "react";
import { statusPagesApi, type StatusPageSummary } from "@/lib/api";
import { Alert, Button, Field, inputClass } from "@/components/app/ui";

type Props = {
  statusPage?: StatusPageSummary;
  onSuccess: (page: StatusPageSummary) => void;
  onCancel: () => void;
};

export function StatusPageForm({ statusPage, onSuccess, onCancel }: Props) {
  const isEdit = !!statusPage;

  const [slug, setSlug] = useState(statusPage?.slug ?? "");
  const [title, setTitle] = useState(statusPage?.title ?? "");
  const [description, setDescription] = useState(statusPage?.description ?? "");
  const [isPublic, setIsPublic] = useState(statusPage?.isPublic ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isEdit) {
        const { statusPage: updated } = await statusPagesApi.update(statusPage.id, {
          slug,
          title,
          description: description || null,
          isPublic,
        });
        onSuccess(updated);
      } else {
        const { statusPage: created } = await statusPagesApi.create({
          slug,
          title,
          description: description || null,
        });
        onSuccess(created);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field
        label="Slug"
        hint={
          <>
            Lowercase letters, numbers, and hyphens. Public URL:{" "}
            <span className="font-mono text-chalk/80">/status/{slug || "…"}</span>
          </>
        }
      >
        <input
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase())}
          required
          minLength={3}
          maxLength={32}
          pattern="[a-z0-9-]+"
          placeholder="mycompany"
          className={`${inputClass} font-mono`}
        />
      </Field>

      <Field label="Title">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={100}
          placeholder="My Company Status"
          className={inputClass}
        />
      </Field>

      <Field label="Description (optional)">
        <textarea
          value={description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Live status of our production services"
          className={`${inputClass} h-auto resize-y py-2`}
        />
      </Field>

      {isEdit && (
        <label className="flex items-center gap-3 text-sm text-chalk">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="h-4 w-4 accent-[#e8c46a]"
          />
          Publicly accessible
        </label>
      )}

      {error && <Alert tone="error">{error}</Alert>}

      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? "Saving…" : isEdit ? "Save changes" : "Create page"}
        </Button>
      </div>
    </form>
  );
}
