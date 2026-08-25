"use client";

import { useState } from "react";
import Link from "next/link";
import { signUp, authClient } from "@/lib/auth-client";
import { AuthShell, Field, SubmitButton, FormError } from "@/components/auth/AuthShell";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [resent, setResent] = useState(false);

  // After the user clicks the link in their inbox, Better Auth verifies the
  // token and redirects here. Must be an absolute URL on a trusted origin.
  const callbackURL =
    typeof window !== "undefined" ? `${window.location.origin}/login?verified=1` : "/login";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signUpError } = await signUp.email({
      email,
      password,
      name,
      callbackURL,
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message ?? "Something went wrong");
      return;
    }

    // No session yet — the account exists but can't sign in until verified.
    setSent(true);
  }

  async function handleResend() {
    setResent(false);
    await authClient.sendVerificationEmail({ email, callbackURL });
    setResent(true);
  }

  if (sent) {
    return (
      <AuthShell
        title="Check your inbox"
        subtitle={`We sent a verification link to ${email}.`}
        footer={
          <>
            Wrong address?{" "}
            <button
              type="button"
              onClick={() => setSent(false)}
              className="text-chalk underline-offset-4 hover:underline"
            >
              Go back
            </button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-fog">
          Click the link to activate your account. It expires in an hour. If it
          isn&apos;t there, check spam, or send another one.
        </p>
        <div className="mt-6 flex items-center gap-4">
          <button
            type="button"
            onClick={handleResend}
            className="h-10 rounded-md border border-line px-4 text-sm text-chalk transition-colors hover:border-fog"
          >
            Resend link
          </button>
          {resent && <span className="text-sm text-ok">Sent</span>}
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Five monitors, email alerts, and a status page. Free, no card."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="text-chalk underline-offset-4 hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field
          label="Name"
          type="text"
          placeholder="Your name..."
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Field
          label="Email"
          type="email"
          placeholder="your-email@example.com"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Field
          label="Password"
          type="password"
          placeholder="At least 8 characters"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />

        <FormError message={error} />

        <SubmitButton loading={loading} idle="Create account" busy="Creating account…" />
      </form>
    </AuthShell>
  );
}
