"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { statusPagesApi, type StatusPageSummary } from "@/lib/api";
import { Modal } from "@/components/Modal";
import { StatusPageForm } from "@/components/StatusPageForm";
import { AppShell, PageTitle, ShellLoading } from "@/components/app/AppShell";
import { Alert, Badge, Button, Empty, LinkButton } from "@/components/app/ui";

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

  if (isPending || loading) return <ShellLoading />;

  if (!session) return null;

  return (
    <AppShell
      userName={session.user.name}
      title={
        <PageTitle sub="Shareable public URLs showing the status of selected monitors.">
          Status pages
        </PageTitle>
      }
      actions={
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          New page
        </Button>
      }
    >
      {error && (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      {pages.length === 0 ? (
        <Empty title="No status pages yet" body="Create one to get a shareable URL." />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-slate">
          {pages.map((p) => {
            const publicUrl = `/status/${p.slug}`;
            return (
              <li key={p.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="font-medium">{p.title}</span>
                    {!p.isPublic && <Badge>Private</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => copyLink(p.slug)} title="Copy shareable URL">
                      Copy URL
                    </Button>
                    <LinkButton size="sm" href={publicUrl} external>
                      View
                    </LinkButton>
                    <LinkButton size="sm" href={`/status-pages/${p.id}`}>
                      Edit
                    </LinkButton>
                    <Button size="sm" variant="danger" onClick={() => handleDelete(p)}>
                      Delete
                    </Button>
                  </div>
                </div>
                <div className="mt-1.5 font-mono text-xs text-fog">
                  {publicUrl} <span className="text-fog/50">·</span> {p.monitors.length} monitor
                  {p.monitors.length === 1 ? "" : "s"}
                </div>
                {p.description && <div className="mt-1 text-xs text-fog/80">{p.description}</div>}
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
    </AppShell>
  );
}
