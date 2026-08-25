import Link from "next/link";
import { Reveal } from "./Reveal";

const FREE = ["5 monitors", "5-minute check interval", "Email alerts", "1 public status page"];

const PRO = [
  "Unlimited monitors",
  "1-minute check interval",
  "More alert channels",
  "Custom status page domains",
  "Everything in Free",
];

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-24 border-t border-line">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <Reveal from="left" className="max-w-xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-beam">Pricing</p>
          <h2 className="mt-4 font-display text-4xl font-medium tracking-tight text-chalk md:text-5xl">
            Free while you build. Ten dollars when it matters.
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          <Reveal from="card" delay={0}>
            <Plan
              name="Free"
              blurb="For side projects, portfolios, and finding out whether this is useful."
              price={<Price amount={0} period="forever" />}
              features={FREE}
              cta={{ label: "Create a free account", href: "/signup" }}
            />
          </Reveal>
          <Reveal from="card" delay={120}>
            <Plan
              name="Pro monthly"
              blurb="Everything in Pro, billed month to month. Cancel whenever."
              price={<Price amount={10} period="month" />}
              features={PRO}
              cta={{ label: "Start Pro monthly", href: "/signup" }}
            />
          </Reveal>
          <Reveal from="card" delay={240}>
            <Plan
              name="Pro yearly"
              highlight
              badge="Recommended"
              blurb="Pay for the year up front and keep three months of the price."
              price={<Price amount={90} period="year" was={120} save="Save 25%" />}
              features={PRO}
              cta={{ label: "Start Pro yearly", href: "/signup" }}
            />
          </Reveal>
        </div>

        <p className="mt-6 text-sm text-fog">
          Every plan includes the full check engine, incident history, and the open-source
          codebase. No card required for Free.
        </p>
      </div>
    </section>
  );
}

function Price({
  amount,
  period,
  was,
  save,
}: {
  amount: number;
  period: string;
  was?: number;
  save?: string;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-5xl font-medium tracking-tight text-chalk">
          ${amount}
        </span>
        <span className="text-sm text-fog">/ {period}</span>
      </div>
      {was !== undefined && (
        <div className="mt-2 flex items-center gap-2 text-sm">
          <span className="text-fog line-through decoration-signal/70">${was}</span>
          {save && (
            <span className="rounded-full bg-beam/15 px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider text-beam">
              {save}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function Plan({
  name,
  blurb,
  price,
  features,
  cta,
  badge,
  highlight = false,
}: {
  name: string;
  blurb: string;
  price: React.ReactNode;
  features: string[];
  cta: { label: string; href: string };
  badge?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`relative flex h-full flex-col rounded-2xl border p-7 ${
        highlight ? "border-beam/50 bg-slate-2" : "border-line bg-slate"
      }`}
    >
      {highlight && (
        <div className="absolute -top-px left-7 h-px w-20 bg-beam" aria-hidden="true" />
      )}
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-xl font-medium text-chalk">{name}</h3>
        {badge && (
          <span className="rounded-full border border-beam/40 px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wider text-beam">
            {badge}
          </span>
        )}
      </div>
      <p className="mt-2 min-h-[2.5rem] text-sm leading-relaxed text-fog">{blurb}</p>
      <div className="mt-7 min-h-[5.5rem]">{price}</div>
      <ul className="mt-6 flex flex-1 flex-col gap-3 text-sm text-chalk/90">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-3">
            <svg
              className="mt-1 h-3.5 w-3.5 flex-none text-beam"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden="true"
            >
              <path d="M2.5 7.5l3 3 6-6" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            {f}
          </li>
        ))}
      </ul>
      <Link
        href={cta.href}
        className={`mt-9 inline-flex justify-center rounded-md px-4 py-2.5 text-sm font-medium transition-colors ${
          highlight
            ? "bg-beam text-ink hover:bg-[#f0d081]"
            : "border border-line text-chalk hover:border-fog"
        }`}
      >
        {cta.label}
      </Link>
    </div>
  );
}
