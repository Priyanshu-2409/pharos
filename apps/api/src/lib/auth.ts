import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@pharos/db";
import { Resend } from "resend";

const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:3000";
const FROM_EMAIL = process.env.ALERTS_FROM_EMAIL ?? "onboarding@resend.dev";
const FROM_NAME = process.env.ALERTS_FROM_NAME ?? "Pharos";

// Same Resend account the worker uses for incident alerts.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // Base URL where auth is served
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:4000",

  // Secret used to sign session tokens
  secret: process.env.BETTER_AUTH_SECRET,

  // Cross-origin config — frontend at :3000, API at :4000
  trustedOrigins: [FRONTEND_URL],

  // Email/password auth. Accounts can't sign in until the address is verified,
  // so a typo'd or fake email never becomes a usable account.
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    async sendVerificationEmail({ user, url }) {
      if (!resend) {
        // Local dev without RESEND_API_KEY: print the link instead of sending.
        console.log(`[auth] verify ${user.email}: ${url}`);
        return;
      }
      const { error } = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: user.email,
        subject: "Verify your Pharos email",
        text: [
          `Hi ${user.name || "there"},`,
          "",
          "Confirm your email address to start monitoring:",
          url,
          "",
          "If you didn't create a Pharos account, you can ignore this message.",
        ].join("\n"),
      });
      if (error) {
        console.error("[auth] verification email failed:", error.message);
        throw new Error("Could not send verification email");
      }
    },
  },

  // GitHub OAuth (conditional — only enabled if env vars are set)
  socialProviders: process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
    ? {
        github: {
          clientId: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
        },
      }
    : {},

  // Session config
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days in seconds
    updateAge: 60 * 60 * 24, // refresh session cookie if older than 1 day
  },
  // Cross-domain cookies: frontend (Vercel) and API (Railway) are on
  // different domains, so the session cookie must be SameSite=None + Secure
  // for the browser to store and send it across origins.
  advanced: {
    defaultCookieAttributes: {
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
    },
  },
});
