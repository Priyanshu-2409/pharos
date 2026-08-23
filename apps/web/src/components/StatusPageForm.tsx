"use client";

import { useState } from "react";
import { statusPagesApi, type StatusPageSummary } from "@/lib/api";

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
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
        Slug
        <input
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase())}
          required
          minLength={3}
          maxLength={32}
          pattern="[a-z0-9-]+"
          placeholder="mycompany"
          style={inputStyle}
        />
        <span style={helpStyle}>
          Lowercase letters, numbers, and hyphens only. Public URL: /status/{slug || "..."}
        </span>
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
        Title
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={100}
          placeholder="My Company Status"
          style={inputStyle}
        />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
        Description (optional)
        <textarea
          value={description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Live status of our production services"
          style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
        />
      </label>

      {isEdit && (
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
          />
          Publicly accessible
        </label>
      )}

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

const inputStyle: React.CSSProperties = {
  padding: 8,
  fontSize: 14,
  border: "1px solid #ccc",
  borderRadius: 4,
  background: "white",
  color: "black",
};

const helpStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#666",
};