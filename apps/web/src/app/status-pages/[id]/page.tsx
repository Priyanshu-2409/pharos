"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { statusPagesApi, type StatusPageSummary } from "@/lib/api";
import { StatusPageForm } from "@/components/StatusPageForm";
import { MonitorPicker } from "@/components/MonitorPicker";

export default function EditStatusPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: session, isPending } = useSession();

  const [page, setPage] = useState<StatusPageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [isPending, session, router]);

  async function loadPage() {
    try {
      const { statusPages } = await statusPagesApi.list();
      const found = statusPages.find((p) => p.id === id);
      if (!found) {
        setNotFound(true);
        return;
      }
      setPage(found);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (session) loadPage();
  }, [session, id]);

  async function handleSaveMonitors(monitorIds: string[]) {
    await statusPagesApi.setMonitors(id, monitorIds);
    await loadPage();
  }

  if (isPending || loading) {
    return (
      <div style={pageStyle}>
        <p>Loading…</p>
      </div>
    );
  }

  if (!session) return null;

  if (notFound) {
    return (
      <div style={pageStyle}>
        <div style={headerStyle}>
          <h1 style={{ fontSize: 24, margin: 0 }}>Not found</h1>
          <a href="/status-pages" style={linkStyle}>← Back</a>
        </div>
        <p style={{ color: "#666" }}>
          This status page doesn't exist or you don't have access to it.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={pageStyle}>
        <p style={{ color: "crimson" }}>{error}</p>
      </div>
    );
  }

  if (!page) return null;

  const publicUrl = `/status/${page.slug}`;

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <h1 style={{ fontSize: 24, margin: 0 }}>{page.title}</h1>
        <a href="/status-pages" style={linkStyle}>← Back to list</a>
      </div>

      <div style={{ background: "#161b22", color: "white", padding: 12, borderRadius: 6, marginBottom: 24, fontSize: 13 }}>
        <div style={{ color: "#888", marginBottom: 4 }}>Public URL</div>
        <a href={publicUrl} target="_blank" rel="noopener" style={{ color: "#58a6ff" }}>
          {typeof window !== "undefined" ? window.location.origin : ""}{publicUrl}
        </a>
        {!page.isPublic && (
          <div style={{ marginTop: 6, color: "#d29922", fontSize: 12 }}>
            ⚠ Public access is currently disabled
          </div>
        )}
      </div>

      <section style={cardStyle}>
        <h2 style={sectionHeadingStyle}>Page details</h2>
        <StatusPageForm
          statusPage={page}
          onSuccess={(updated) => setPage((prev) => (prev ? { ...prev, ...updated } : prev))}
          onCancel={() => router.push("/status-pages")}
        />
      </section>

      <section style={cardStyle}>
        <h2 style={sectionHeadingStyle}>Monitors on this page</h2>
        <MonitorPicker
          initialSelectedIds={page.monitors.map((m) => m.id)}
          onSave={handleSaveMonitors}
        />
      </section>
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

const cardStyle: React.CSSProperties = {
  background: "#f5f5f5",
  color: "black",
  padding: 20,
  borderRadius: 6,
  marginBottom: 24,
};

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: 16,
  marginTop: 0,
  marginBottom: 16,
};