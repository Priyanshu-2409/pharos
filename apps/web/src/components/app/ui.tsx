import Link from "next/link";

/* Small UI kit shared by the signed-in app pages. Presentation only. */

const base =
  "inline-flex h-9 items-center justify-center gap-2 rounded-md px-3.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const variants = {
  primary: "bg-beam text-ink hover:bg-[#f0d081]",
  secondary: "border border-line bg-slate text-chalk hover:border-fog",
  ghost: "text-fog hover:text-chalk",
  danger: "border border-signal/30 text-signal hover:bg-signal/10",
} as const;

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: "sm" | "md";
}) {
  return (
    <button
      {...props}
      className={`${base} ${variants[variant]} ${size === "sm" ? "h-8 px-3 text-xs" : ""} ${className}`}
    />
  );
}

export function LinkButton({
  variant = "secondary",
  size = "md",
  className = "",
  href,
  external = false,
  children,
}: {
  variant?: keyof typeof variants;
  size?: "sm" | "md";
  className?: string;
  href: string;
  external?: boolean;
  children: React.ReactNode;
}) {
  const cls = `${base} ${variants[variant]} ${size === "sm" ? "h-8 px-3 text-xs" : ""} ${className}`;
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

export const inputClass =
  "h-10 w-full rounded-md border border-line bg-ink px-3 text-sm text-chalk outline-none transition-colors placeholder:text-fog/50 hover:border-fog/60 focus:border-beam focus-visible:ring-2 focus-visible:ring-beam/30";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-fog">{label}</span>
      {children}
      {hint && <span className="text-xs text-fog/70">{hint}</span>}
    </label>
  );
}

export function Card({
  title,
  description,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-line bg-slate p-6 ${className}`}>
      {title && <h2 className="font-display text-lg font-medium text-chalk">{title}</h2>}
      {description && <p className="mt-1 text-sm text-fog">{description}</p>}
      <div className={title || description ? "mt-5" : ""}>{children}</div>
    </section>
  );
}

export function Alert({
  tone,
  children,
}: {
  tone: "error" | "success" | "info" | "warning";
  children: React.ReactNode;
}) {
  const tones = {
    error: "border-signal/40 bg-signal/10 text-signal",
    success: "border-ok/40 bg-ok/10 text-ok",
    info: "border-line bg-slate-2 text-fog",
    warning: "border-beam/40 bg-beam/10 text-beam",
  };
  return (
    <p role={tone === "error" ? "alert" : undefined} className={`rounded-md border px-3 py-2 text-sm ${tones[tone]}`}>
      {children}
    </p>
  );
}

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "danger" | "ok" | "warn";
  children: React.ReactNode;
}) {
  const tones = {
    neutral: "border-line text-fog",
    danger: "border-signal/40 text-signal",
    ok: "border-ok/40 text-ok",
    warn: "border-beam/40 text-beam",
  };
  return (
    <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${tones[tone]}`}>
      {children}
    </span>
  );
}

/** Coloured status dot. `color` is a hex from lib/monitorStatus. */
export function Dot({ color, pulse = false }: { color: string; pulse?: boolean }) {
  return (
    <span
      className={`inline-block h-2 w-2 flex-none rounded-full ${pulse ? "animate-pulse-dot" : ""}`}
      style={{ background: color }}
      aria-hidden="true"
    />
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return <p className="text-sm text-fog">{label}</p>;
}

export function Empty({ title, body }: { title: string; body?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center">
      <p className="font-display text-lg font-medium text-chalk">{title}</p>
      {body && <p className="mt-2 text-sm text-fog">{body}</p>}
    </div>
  );
}
