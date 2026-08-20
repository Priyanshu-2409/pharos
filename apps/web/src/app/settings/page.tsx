"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { settingsApi, type Settings } from "@/lib/api";

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

  if (isPending || loading) {
    return (
      <div style={{ maxWidth: 600, margin: "40px auto", fontFamily: "sans-serif", padding: "0 16px" }}>
        <p>Loading…</p>
      </div>
    );
  }

  if (!session || !settings) return null;

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", fontFamily: "sans-serif", padding: "0 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, margin: 0 }}>Settings</h1>
        <a href="/dashboard" style={{ fontSize: 14, color: "#58a6ff" }}>← Back to dashboard</a>
      </div>

      <div style={{ background: "#f5f5f5", color: "black", padding: 20, borderRadius: 6 }}>
        <h2 style={{ fontSize: 16, marginTop: 0, marginBottom: 4 }}>Notifications</h2>
        <p style={{ fontSize: 13, color: "#666", marginTop: 0, marginBottom: 16 }}>
          Where should Pharos send incident alerts?
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
            Notification email
            <input
              type="email"
              value={notificationEmail}
              onChange={(e) => setNotificationEmail(e.target.value)}
              required
              style={{
                padding: 8,
                fontSize: 14,
                border: "1px solid #ccc",
                borderRadius: 4,
                background: "white",
                color: "black",
              }}
            />
          </label>

          {!settings.hasChannel && (
            <p style={{ fontSize: 12, color: "#666", margin: 0 }}>
              Currently using your signup email. Click Save to lock this in.
            </p>
          )}

          {error && <p style={{ color: "crimson", fontSize: 13, margin: 0 }}>{error}</p>}
          {success && <p style={{ color: "#2ea043", fontSize: 13, margin: 0 }}>✓ Saved</p>}

          <button
            type="submit"
            disabled={saving}
            style={{
              padding: "8px 16px",
              fontSize: 14,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.6 : 1,
              alignSelf: "flex-start",
            }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </form>
      </div>
    </div>
  );
}