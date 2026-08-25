"use client";

import { useState } from "react";
import Link from "next/link";

const FREE = [
  "5 monitors",
  "5-minute check interval",
  "Email alerts",
  "1 public status page",
];

const PRO = [
  "Unlimited monitors",
  "1-minute check interval",
  "More alert channels",
  "Custom status page domains",
  "Everything in Free",
];

export function Pricing() {
  const [yearly, setYearly] = useState(true);

  return (
    <section id="pricing" className="scroll-mt-24 border-t border-line">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
          <div className="max-w-xl">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-beam">Pricing</p>
            <h2 className="mt-4 font-display text-4xl font-medium tracking-tight text-chalk md:text-5xl">
              Free while you build. Ten dollars when it matters.
            </h2>
          </div>

          <div
            role="group"
            aria-label="Billing period"
            className="inline-flex rounded-full border border-line bg-slate p-1 text-sm"
          >
            <button
              type="button"
              onClick={() => setYearly(false)}
              aria-pressed={!yearly}
              className={`rounded-full px-4 py-1.5 transition-colors ${
                !yearly ? "bg-chalk text-ink" : "text-fog hover:text-chalk"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setYearly(true)}
              aria-pressed={yearly}
              className={`rounded-full px-4 py-1.5 transition-colors ${
                yearly ? "bg-chalk text-ink" : "text-fog hover:text-chalk"
              }`}
            >
              Yearly
              <span className={`ml-2 text-xs ${yearly ? "text-beam-deep" : "text-beam"}`}>
                save 25%
              </span>
            </button>
          </div>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-2">
          <Plan
            name="Free"
            blurb="For side projects, portfolios, and finding out whether this is useful."
            price={<Price amount={0} period={yearly ? "year" : "month"} />}
            features={FREE}
            cta={{ label: "Create a free account", href: "/signup" }}
          />
          <Plan
            name="Pro"
            highlight
            blurb="For anything with users. Faster checks, more places to be alerted, your own domain."
            price={
              yearly ? (
                <Price amount={90} period="year" was={120} />
              ) : (
                <Price amount={10} period="month" />
              )
            }
            features={PRO}
            cta={{ label: "Start with Pro", href: "/signup" }}
          />
        </div>

        <p className="mt-6 text-sm text-fog">
          Both plans include the full check engine, incident history, and the open-source
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
}: {
  amount: number;
  period: "month" | "year";
  was?: number;
}) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="font-display text-5xl font-medium tracking-tight text-chalk">${amount}</span>
      <span className="text-sm text-fog">/ {period}</span>
      {was !== undefined && (
        <span className="text-sm text-fog line-through decoration-signal/70">${was}</span>
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
  highlight = false,
}: {
  name: string;
  blurb: string;
  price: React.ReactNode;
  features: string[];
  cta: { label: string; href: string };
  highlight?: boolean;
}) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-8 ${
        highlight ? "border-beam/50 bg-slate-2" : "border-line bg-slate"
      }`}
    >
      {highlight && (
        <div className="absolute -top-px left-8 h-px w-24 bg-beam" aria-hidden="true" />
      )}
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl font-medium text-chalk">{name}</h3>
        {highlight && (
          <span className="rounded-full border border-beam/40 px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wider text-beam">
            Recommended
          </span>
        )}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-fog">{blurb}</p>
      <div className="mt-8">{price}</div>
      <ul className="mt-8 flex flex-col gap-3 text-sm text-chalk/90">
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
        className={`mt-10 inline-flex justify-center rounded-md px-4 py-2.5 text-sm font-medium transition-colors ${
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