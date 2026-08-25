import Link from "next/link";
import { Wordmark } from "@/components/landing/Wordmark";

/**
 * Split-screen frame for /login and /signup.
 * Left: brand panel with a CSS-only beam (no Three.js on auth pages).
 * Right: the form. Panel collapses to a slim header on mobile.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen bg-ink font-sans text-chalk selection:bg-beam/30 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {/* brand panel */}
      <aside className="relative flex flex-col justify-between overflow-hidden border-b border-line p-6 lg:border-b-0 lg:border-r lg:p-10">
        <div
          className="pointer-events-none absolute -left-1/3 -top-1/3 hidden aspect-square w-[130%] rounded-full border border-line/50 lg:block"
          aria-hidden="true"
        >
          <div className="animate-sweep absolute inset-0 rounded-full [background:conic-gradient(from_0deg,transparent_0deg,rgba(232,196,106,0.12)_16deg,transparent_34deg)]" />
          <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-beam" />
        </div>
        <div
          className="pointer-events-none absolute inset-0 hidden bg-[radial-gradient(ellipse_at_top_left,transparent_20%,var(--color-ink)_70%)] lg:block"
          aria-hidden="true"
        />

        <Link href="/" className="relative z-10 w-fit">
          <Wordmark />
        </Link>

        <div className="relative z-10 mt-16 hidden lg:block">
          <p className="max-w-sm font-display text-3xl font-medium leading-tight tracking-tight">
            Your API returned 200.
            <br />
            <span className="text-fog">It was still broken.</span>
          </p>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-fog">
            Pharos reads the response, not just the status code, and tells you
            before your users do.
          </p>
        </div>
      </aside>

      {/* form panel */}
      <main className="flex items-center justify-center px-6 py-16 lg:px-10">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-3xl font-medium tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-fog">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <p className="mt-8 text-sm text-fog">{footer}</p>
        </div>
      </main>
    </div>
  );
}

export function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-fog">{label}</span>
      <input
        {...props}
        className="h-11 rounded-md border border-line bg-slate px-3 text-sm text-chalk outline-none transition-colors placeholder:text-fog/60 hover:border-fog/60 focus:border-beam focus-visible:ring-2 focus-visible:ring-beam/30"
      />
    </label>
  );
}

export function SubmitButton({
  loading,
  idle,
  busy,
}: {
  loading: boolean;
  idle: string;
  busy: string;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="mt-2 h-11 rounded-md bg-beam text-sm font-medium text-ink transition-colors hover:bg-[#f0d081] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? busy : idle}
    </button>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md border border-signal/40 bg-signal/10 px-3 py-2 text-sm text-signal">
      {message}
    </p>
  );
}