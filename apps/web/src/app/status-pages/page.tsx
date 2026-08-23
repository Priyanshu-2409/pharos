"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { statusPagesApi, type StatusPageSummary } from "@/lib/api";
import { Modal } from "@/components/Modal";
import { StatusPageForm } from "@/components/StatusPageForm";

export default function StatusPagesListPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const [pages, setPages] = useState<StatusPageSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [isPending, session, router]);

  async function fetchPages() {
    setError(null);
    try {
      const { statusPages } = await statusPagesApi.list();
      setPages(statusPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load status pages");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (session) fetchPages();
  }, [session]);

  async function handleDelete(page: StatusPageSummary) {
    if (!confirm(`Delete status page "${page.title}"? This cannot be undone.`)) return;
    try {
      await statusPagesApi.delete(page.id);
      await fetchPages();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  }

  function copyLink(slug: string) {
    const url = `${window.location.origin}/status/${slug}`;
    navigator.clipboard.writeText(url);
  }

  if (isPending || loading) {
    return (
      <div style={pageStyle}>
        <p>Loading…</p>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <h1 style={{ fontSize: 24, margin: 0 }}>Status pages</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <a href="/dashboard" style={linkStyle}>Dashboard</a>
          <a href="/settings" style={linkStyle}>Settings</a>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <p style={{ fontSize: 14, color: "#888", margin: 0 }}>
          Shareable public URLs showing the status of selected monitors.
        </p>
        <button
          onClick={() => setCreateOpen(true)}
          style={{ padding: "8px 12px", fontSize: 14, cursor: "pointer" }}
        >
          + New page
        </button>
      </div>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {pages.length === 0 ? (
        <p style={{ color: "#666" }}>
          No status pages yet. Create one to get a shareable URL.
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {pages.map((p) => {
            const publicUrl = `/status/${p.slug}`;
            return (
              <li
                key={p.id}
                style={{
                  padding: 12,
                  background: "#f5f5f5",
                  color: "black",
                  borderRadius: 4,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 600 }}>{p.title}</span>
                    {!p.isPublic && (
                      <span style={{ fontSize: 10, background: "#888", color: "white", padding: "2px 6px", borderRadius: 3, fontWeight: 600 }}>
                        PRIVATE
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => copyLink(p.slug)} style={smallBtn} title="Copy shareable URL">
                      Copy URL
                    </button>
                    <a href={publicUrl} target="_blank" rel="noopener" style={smallBtnLink}>
                      View
                    </a>
                    <a href={`/status-pages/${p.id}`} style={smallBtnLink}>
                      Edit
                    </a>
                    <button onClick={() => handleDelete(p)} style={{ ...smallBtn, color: "crimson" }}>
                      Delete
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: "#666" }}>
                  {publicUrl} · {p.monitors.length} monitor{p.monitors.length === 1 ? "" : "s"}
                </div>
                {p.description && (
                  <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>{p.description}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New status page">
        <StatusPageForm
          onSuccess={(created) => {
            setCreateOpen(false);
            router.push(`/status-pages/${created.id}`);
          }}
          onCancel={() => setCreateOpen(false)}
        />
      </Modal>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  maxWidth: 800,
  margin: "40px auto",
  fontFamily: "sans-serif",
  padding: "0 16px",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 24,
};

const linkStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#58a6ff",
  textDecoration: "none",
};

const smallBtn: React.CSSProperties = {
  padding: "4px 10px",
  fontSize: 12,
  cursor: "pointer",
  background: "white",
  border: "1px solid #ccc",
  borderRadius: 3,
  color: "black",
};

const smallBtnLink: React.CSSProperties = {
  ...smallBtn,
  textDecoration: "none",
  display: "inline-block",
};