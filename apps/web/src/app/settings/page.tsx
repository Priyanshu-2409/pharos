"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { settingsApi, type Settings } from "@/lib/api";
import { AppShell, PageTitle, ShellLoading } from "@/components/app/AppShell";
import { Alert, Button, Card, Field, inputClass } from "@/components/app/ui";

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const [settings, setSettings] = useState<Settings | null>(null);
  const [notificationEmail, setNotificationEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [isPending, session, router]);

  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await settingsApi.get();
        setSettings(data);
        setNotificationEmail(data.notificationEmail);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load settings");
      } finally {
        setLoading(false);
      }
    }
    if (session) loadSettings();
  }, [session]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);
    try {
      await settingsApi.update(notificationEmail);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (isPending || loading) return <ShellLoading />;

  if (!session || !settings) return null;

  return (
    <AppShell userName={session.user.name} width="sm" title={<PageTitle>Settings</PageTitle>}>
      <Card title="Notifications" description="Where Pharos sends incident alerts.">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field
            label="Notification email"
            hint={
              !settings.hasChannel
                ? "Currently using your signup email. Save to lock this in."
                : undefined
            }
          >
            <input
              type="email"
              value={notificationEmail}
              onChange={(e) => setNotificationEmail(e.target.value)}
              required
              className={inputClass}
            />
          </Field>

          {error && <Alert tone="error">{error}</Alert>}
          {success && <Alert tone="success">Saved</Alert>}

          <div>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </Card>
    </AppShell>
  );
}
