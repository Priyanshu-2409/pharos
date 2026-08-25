"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/lib/auth-client";
import { AuthShell, Field, SubmitButton, FormError } from "@/components/auth/AuthShell";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signUpError } = await signUp.email({
      email,
      password,
      name,
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message ?? "Something went wrong");
      return;
    }

    // Success — session cookie is already set. Redirect.
    router.push("/dashboard");
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
          placeholder="Priyanshu"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
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