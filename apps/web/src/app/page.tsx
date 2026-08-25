import Link from "next/link";
import { Nav } from "@/components/landing/Nav";
import { HeroScene } from "@/components/landing/HeroScene";
import { Pricing } from "@/components/landing/Pricing";
import { Wordmark } from "@/components/landing/Wordmark";

const CHECKS = [
  ["api.stripe.com/v1/charges", "200", "84ms", "ok"],
  ["auth.clerk.dev/v1/session", "401", "312ms", "fail"],
  ["api.openai.com/v1/models", "200", "6.4s", "slow"],
  ["hooks.razorpay.com/webhook", "200", "91ms", "ok"],
  ["mail.resend.com/emails", "200", "118ms", "ok"],
  ["db.internal/health", "200", "22ms", "ok"],
  ["cdn.example.com/ping", "503", "—", "fail"],
  ["api.github.com/rate_limit", "200", "77ms", "ok"],
] as const;

const FAILURES = [
  {
    code: "401",
    title: "The key expired at 3 a.m.",
    body: "A third-party token rolls over. Every request since is rejected. Your server is up, your logs are quiet, and the feature just doesn't work.",
  },
  {
    code: "200",
    title: "Success, with an error in the body",
    body: "The sandbox answers 200 OK and a JSON payload that says failed. Status-code monitors call that healthy. Pharos reads the response.",
  },
  {
    code: "8.2s",
    title: "Working, technically",
    body: "The endpoint still responds, in eight seconds instead of eighty milliseconds. Nothing crashes. Users leave.",
  },
];

const FEATURES = [
  {
    title: "Checks that read the response",
    body: "Assert on status code, response time, and body content. A 200 with the wrong payload is a failure.",
  },
  {
    title: "Distributed workers",
    body: "Checks run from a BullMQ-backed worker fleet, not from your app. Your outage can't hide your outage.",
  },
  {
    title: "An honest incident model",
    body: "Consecutive-failure thresholds before alerting, automatic resolution, and a timeline of every state change.",
  },
  {
    title: "Alerts when it matters",
    body: "Email on open and on resolve. No noise for a single flaky check. More channels on Pro.",
  },
  {
    title: "Public status pages",
    body: "Pick the monitors, get a page with live status and history. Custom domains on Pro.",
  },
  {
    title: "Open source, top to bottom",
    body: "MIT licensed. Read the check engine, run it yourself, or trust the hosted version.",
  },
];

const STEPS = [
  {
    n: "1",
    title: "Add an endpoint",
    body: "Paste a URL, choose an interval, say what a healthy response looks like.",
  },
  {
    n: "2",
    title: "Workers check it",
    body: "A job is queued every interval and picked up by a worker that records the result.",
  },
  {
    n: "3",
    title: "Failures become incidents",
    body: "After the threshold is hit an incident opens. When checks recover, it closes.",
  },
  {
    n: "4",
    title: "You hear about it",
    body: "An alert goes out and your status page updates. Before the support email arrives.",
  },
];

const FAQ = [
  {
    q: "How is this different from UptimeRobot?",
    a: "UptimeRobot answers \"did the URL respond\". Pharos also asks whether the response was correct: the right status code, a body that matches what you expect, and a latency you'd accept. It's built for third-party integrations that fail silently, not just servers that go down.",
  },
  {
    q: "Do I have to install anything?",
    a: "No. Pharos calls your endpoints from its own workers. If you'd rather self-host, the whole stack is on GitHub under an MIT license.",
  },
  {
    q: "What happens on the Free plan when I hit 5 monitors?",
    a: "Nothing dramatic. Existing monitors keep running; you can upgrade to Pro to add more or delete one you don't need.",
  },
  {
    q: "Can I cancel Pro?",
    a: "Yes, any time. Yearly plans are billed up front for the year; monthly plans stop at the end of the current month.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-ink font-sans text-chalk selection:bg-beam/30">
      <Nav />

      {/* ---------------------------------------------------------------- hero */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-x-0 -top-[70%] bottom-0 -z-10 opacity-70 md:inset-0 md:opacity-100">
          <HeroScene />
        </div>

        <div className="mx-auto flex min-h-[92vh] max-w-6xl flex-col justify-end px-6 pb-16 pt-40 md:pb-24">
          <p className="animate-rise font-mono text-xs uppercase tracking-[0.2em] text-beam">
            Uptime monitoring for integrations
          </p>
          <h1 className="animate-rise mt-6 max-w-4xl font-display text-5xl font-medium leading-[1.02] tracking-tight text-chalk [animation-delay:80ms] md:text-7xl">
            Your API returned 200.
            <br />
            <span className="text-fog">It was still broken.</span>
          </h1>
          <p className="animate-rise mt-8 max-w-xl text-lg leading-relaxed text-fog [animation-delay:160ms]">
            Pharos checks the endpoints you depend on every minute, reads the
            response instead of just the status code, and tells you before your
            users do.
          </p>
          <div className="animate-rise mt-10 flex flex-wrap items-center gap-3 [animation-delay:240ms]">
            <Link
              href="/signup"
              className="rounded-md bg-beam px-5 py-3 text-sm font-medium text-ink transition-colors hover:bg-[#f0d081]"
            >
              Start monitoring for free
            </Link>
            
              href="https://github.com/Priyanshu-2409/pharos"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-line px-5 py-3 text-sm text-chalk transition-colors hover:border-fog"
            >
              Read the source
            </a>
          </div>
        </div>

        {/* check-log ticker */}
        <div className="border-y border-line bg-ink/80 backdrop-blur-sm">
          <div className="overflow-hidden py-3 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
            <div className="animate-ticker flex w-max gap-10 font-mono text-xs text-fog">
              {[...CHECKS, ...CHECKS].map(([url, code, ms, state], i) => (
                <span key={i} className="flex items-center gap-3 whitespace-nowrap">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      state === "ok"
                        ? "bg-ok"
                        : state === "slow"
                          ? "bg-beam"
                          : "animate-pulse-dot bg-signal"
                    }`}
                  />
                  <span className="text-chalk/80">{url}</span>
                  <span className={state === "fail" ? "text-signal" : ""}>{code}</span>
                  <span className={state === "slow" ? "text-beam" : ""}>{ms}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- problem */}
      <section id="problem" className="scroll-mt-24">
        <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-beam">The problem</p>
          <h2 className="mt-4 max-w-2xl font-display text-4xl font-medium tracking-tight md:text-5xl">
            Integrations don&apos;t crash. They go quiet.
          </h2>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-fog">
            The failures that cost you are the ones nothing logs. Three you&apos;ve
            probably already had:
          </p>

          <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3">
            {FAILURES.map((f) => (
              <article key={f.title} className="bg-slate p-8">
                <p className="font-mono text-3xl text-signal">{f.code}</p>
                <h3 className="mt-6 font-display text-xl font-medium">{f.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-fog">{f.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ features */}
      <section id="features" className="scroll-mt-24 border-t border-line">
        <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
          <div className="grid gap-12 md:grid-cols-[1fr_2fr]">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-beam">What you get</p>
              <h2 className="mt-4 font-display text-4xl font-medium tracking-tight md:text-5xl">
                Small surface. Sharp edges.
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-fog">
                Pharos does one thing: watch endpoints and tell the truth about
                them. Everything here is in service of that.
              </p>
            </div>
            <div className="grid gap-x-10 gap-y-12 sm:grid-cols-2">
              {FEATURES.map((f) => (
                <div key={f.title}>
                  <div className="h-px w-8 bg-beam" aria-hidden="true" />
                  <h3 className="mt-5 font-display text-lg font-medium">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-fog">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- how it works */}
      <section id="how" className="scroll-mt-24 border-t border-line bg-slate">
        <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-beam">How it works</p>
          <h2 className="mt-4 max-w-2xl font-display text-4xl font-medium tracking-tight md:text-5xl">
            From URL to alert, in four moves.
          </h2>

          <ol className="mt-16 grid gap-10 md:grid-cols-4 md:gap-6">
            {STEPS.map((s, i) => (
              <li key={s.n} className="relative">
                <div className="flex items-center gap-4">
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-beam/50 font-mono text-sm text-beam">
                    {s.n}
                  </span>
                  {i < STEPS.length - 1 && (
                    <span className="hidden h-px flex-1 bg-line md:block" aria-hidden="true" />
                  )}
                </div>
                <h3 className="mt-6 font-display text-lg font-medium">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-fog">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <Pricing />

      {/* ----------------------------------------------------------------- faq */}
      <section id="faq" className="scroll-mt-24 border-t border-line">
        <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
          <div className="grid gap-12 md:grid-cols-[1fr_2fr]">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-beam">Questions</p>
              <h2 className="mt-4 font-display text-4xl font-medium tracking-tight md:text-5xl">
                Before you sign up
              </h2>
            </div>
            <div className="divide-y divide-line border-y border-line">
              {FAQ.map((item) => (
                <details key={item.q} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-base font-medium text-chalk [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <span
                      className="flex h-6 w-6 flex-none items-center justify-center rounded-full border border-line text-fog transition-transform group-open:rotate-45"
                      aria-hidden="true"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-4 max-w-2xl text-sm leading-relaxed text-fog">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ closing */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-6xl px-6 py-24 text-center md:py-32">
          <h2 className="font-display text-4xl font-medium tracking-tight md:text-6xl">
            Find out before they do.
          </h2>
          <Link
            href="/signup"
            className="mt-10 inline-flex rounded-md bg-beam px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-[#f0d081]"
          >
            Create a free account
          </Link>
        </div>
      </section>

      {/* -------------------------------------------------------------- footer */}
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12 md:flex-row md:items-center md:justify-between">
          <div>
            <Wordmark />
            <p className="mt-3 text-sm text-fog">
              Uptime monitoring for the integrations you can&apos;t see.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-fog">
            <a href="#features" className="hover:text-chalk">Features</a>
            <a href="#pricing" className="hover:text-chalk">Pricing</a>
            
              href="https://github.com/Priyanshu-2409/pharos"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-chalk"
            >
              GitHub
            </a>
            <Link href="/login" className="hover:text-chalk">Log in</Link>
          </div>
        </div>
        <div className="border-t border-line">
          <p className="mx-auto max-w-6xl px-6 py-5 font-mono text-xs text-fog/70">
            MIT licensed. Built by Priyanshu Mullick.
          </p>
        </div>
      </footer>
    </div>
  );
}