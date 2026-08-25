"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { MonitorList } from "@/components/MonitorList";
import { AppShell, PageTitle, ShellLoading } from "@/components/app/AppShell";

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [isPending, session, router]);

  if (isPending) return <ShellLoading />;

  if (!session) return null;

  return (
    <AppShell
      userName={session.user.name}
      title={<PageTitle sub="Every endpoint you're watching, refreshed every 10 seconds.">Monitors</PageTitle>}
    >
      <MonitorList />
    </AppShell>
  );
}
