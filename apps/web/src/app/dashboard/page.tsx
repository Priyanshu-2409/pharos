"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  // If not authenticated, kick to login
  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [isPending, session, router]);

  // While the session check is in flight, show a placeholder
  if (isPending) {
    return (
      <div style={{ maxWidth: 600, margin: "80px auto", fontFamily: "sans-serif" }}>
        <p>Loading…</p>
      </div>
    );
  }

  // Guard against the moment between "no session confirmed" and "redirect fires"
  if (!session) {
    return null;
  }

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <div style={{ maxWidth: 600, margin: "80px auto", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 24, marginBottom: 24 }}>Dashboard</h1>

      <div style={{ marginBottom: 24, padding: 16, background: "#f5f5f5", borderRadius: 4 }}>
        <p style={{ margin: 0 }}>
          Logged in as <strong>{session.user.name}</strong> ({session.user.email})
        </p>
      </div>

      <button
        onClick={handleSignOut}
        style={{ padding: 10, fontSize: 14, cursor: "pointer" }}
      >
        Sign out
      </button>
    </div>
  );
}