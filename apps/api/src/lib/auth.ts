import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@pharos/db";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // Base URL where auth is served
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:4000",

  // Secret used to sign session tokens
  secret: process.env.BETTER_AUTH_SECRET,

  // Cross-origin config — frontend at :3000, API at :4000
  trustedOrigins: [process.env.FRONTEND_URL ?? "http://localhost:3000"],

  // Email/password auth
  emailAndPassword: {
    enabled: true,
    autoSignIn: true, // sign in immediately after signup, don't require verify
    minPasswordLength: 8,
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
});