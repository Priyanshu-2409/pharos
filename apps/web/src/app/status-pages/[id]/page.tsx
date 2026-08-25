"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { statusPagesApi, type StatusPageSummary } from "@/lib/api";
import { StatusPageForm } from "@/components/StatusPageForm";
import { MonitorPicker } from "@/components/MonitorPicker";
import { AppShell, PageTitle, ShellLoading } from "@/components/app/AppShell";
import { Alert, Card, LinkButton } from "@/components/app/ui";

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

  if (isPending || loading) return <ShellLoading />;

  if (!session) return null;

  if (notFound) {
    return (
      <AppShell userName={session.user.name} width="sm" title={<PageTitle>Not found</PageTitle>}>
        <p className="text-sm text-fog">
          This status page doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <div className="mt-6">
          <LinkButton href="/status-pages">Back to status pages</LinkButton>
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell userName={session.user.name} width="sm">
        <Alert tone="error">{error}</Alert>
      </AppShell>
    );
  }

  if (!page) return null;

  const publicUrl = `/status/${page.slug}`;

  return (
    <AppShell
      userName={session.user.name}
      width="sm"
      title={
        <>
          <Link href="/status-pages" className="text-xs text-fog hover:text-chalk">
            ← Status pages
          </Link>
          <div className="mt-2">
            <PageTitle>{page.title}</PageTitle>
          </div>
        </>
      }
    >
      <div className="mb-6 rounded-2xl border border-line bg-slate-2 px-5 py-4 text-sm">
        <div className="text-xs text-fog">Public URL</div>
        <a
          href={publicUrl}
          target="_blank"
          rel="noopener"
          className="mt-1 block truncate font-mono text-chalk underline-offset-4 hover:underline"
        >
          {typeof window !== "undefined" ? window.location.origin : ""}
          {publicUrl}
        </a>
        {!page.isPublic && (
          <div className="mt-3">
            <Alert tone="warning">Public access is currently disabled</Alert>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-6">
        <Card title="Page details">
          <StatusPageForm
            statusPage={page}
            onSuccess={(updated) => setPage((prev) => (prev ? { ...prev, ...updated } : prev))}
            onCancel={() => router.push("/status-pages")}
          />
        </Card>

        <Card title="Monitors on this page">
          <MonitorPicker
            initialSelectedIds={page.monitors.map((m) => m.id)}
            onSave={handleSaveMonitors}
          />
        </Card>
      </div>
    </AppShell>
  );
}
