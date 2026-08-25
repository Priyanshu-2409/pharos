"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn, authClient } from "@/lib/auth-client";
import { AuthShell, Field, SubmitButton, FormError } from "@/components/auth/AuthShell";

export default function LoginPage() {
  // useSearchParams needs a Suspense boundary for static prerendering.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const justVerified = params.get("verified") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unverified, setUnverified] = useState(false);
  const [resent, setResent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setUnverified(false);
    setLoading(true);

    const { error: signInError } = await signIn.email({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      // 403 = correct credentials, email not verified yet.
      if (signInError.status === 403) {
        setUnverified(true);
        return;
      }
      setError(signInError.message ?? "Invalid email or password");
      return;
    }

    router.push("/dashboard");
  }

  async function handleResend() {
    setResent(false);
    await authClient.sendVerificationEmail({
      email,
      callbackURL: `${window.location.origin}/login?verified=1`,
    });
    setResent(true);
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to see what your endpoints have been doing."
      footer={
        <>
          No account yet?{" "}
          <Link href="/signup" className="text-chalk underline-offset-4 hover:underline">
            Sign up
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {justVerified && !unverified && (
          <p className="rounded-md border border-ok/40 bg-ok/10 px-3 py-2 text-sm text-ok">
            Email verified. You can log in now.
          </p>
        )}

        <Field
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Field
          label="Password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <FormError message={error} />

        {unverified && (
          <div className="rounded-md border border-beam/40 bg-beam/10 px-3 py-2 text-sm text-beam">
            Verify your email first — check your inbox for the link.{" "}
            <button
              type="button"
              onClick={handleResend}
              className="underline underline-offset-4 hover:text-chalk"
            >
              Resend it
            </button>
            {resent && <span className="ml-2 text-ok">Sent</span>}
          </div>
        )}

        <SubmitButton loading={loading} idle="Log in" busy="Signing in…" />
      </form>
    </AuthShell>
  );
}
