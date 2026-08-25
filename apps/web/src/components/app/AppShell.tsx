"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { Wordmark } from "@/components/landing/Wordmark";
import { Button } from "./ui";

const NAV = [
  { href: "/dashboard", label: "Monitors" },
  { href: "/status-pages", label: "Status pages" },
  { href: "/settings", label: "Settings" },
];

/**
 * Frame for signed-in pages: top bar with navigation and sign-out, then a
 * centred content column. Pages keep their own session guards.
 */
export function AppShell({
  userName,
  title,
  actions,
  width = "md",
  children,
}: {
  userName?: string;
  title?: React.ReactNode;
  actions?: React.ReactNode;
  width?: "sm" | "md";
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-ink font-sans text-chalk selection:bg-beam/30">
      <header className="border-b border-line">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <Link href="/dashboard">
              <Wordmark />
            </Link>
            <nav className="hidden items-center gap-1 sm:flex">
              {NAV.map((n) => {
                const active = pathname === n.href || pathname.startsWith(n.href + "/");
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                      active ? "bg-slate-2 text-chalk" : "text-fog hover:text-chalk"
                    }`}
                  >
                    {n.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {userName && <span className="hidden text-sm text-fog sm:inline">{userName}</span>}
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-4 pb-2 sm:hidden">
          {NAV.map((n) => {
            const active = pathname === n.href || pathname.startsWith(n.href + "/");
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm ${
                  active ? "bg-slate-2 text-chalk" : "text-fog"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className={`mx-auto px-6 py-10 ${width === "sm" ? "max-w-2xl" : "max-w-5xl"}`}>
        {(title || actions) && (
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>{title}</div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}

export function PageTitle({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <>
      <h1 className="font-display text-3xl font-medium tracking-tight">{children}</h1>
      {sub && <p className="mt-1 text-sm text-fog">{sub}</p>}
    </>
  );
}

/** Full-page loading state inside the shell chrome. */
export function ShellLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink text-sm text-fog">
      Loading…
    </div>
  );
}
