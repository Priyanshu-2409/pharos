"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";
import { MonitorList } from "@/components/MonitorList";
import Link from "next/link";


export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [isPending, session, router]);

  if (isPending) {
    return (
      <div style={{ maxWidth: 800, margin: "40px auto", fontFamily: "sans-serif" }}>
        <p>Loading…</p>
      </div>
    );
  }

  if (!session) return null;

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <div style={{ maxWidth: 800, margin: "40px auto", fontFamily: "sans-serif", padding: "0 16px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h1 style={{ fontSize: 24, margin: 0 }}>Dashboard</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 14, color: "#666" }}>{session.user.name}</span>
          <Link
            href="/status-pages"
            style={{ fontSize: 13, color: "#58a6ff", textDecoration: "none" }}
          >
            Status pages
          </Link>
          <Link
            href="/settings"
            style={{ fontSize: 13, color: "#58a6ff", textDecoration: "none" }}
          >
            Settings
          </Link>
          <button
            onClick={handleSignOut}
            style={{ padding: "6px 12px", fontSize: 13, cursor: "pointer" }}
          >
            Sign out
          </button>
        </div>
      </div>

      <MonitorList />
    </div>
  );
}
