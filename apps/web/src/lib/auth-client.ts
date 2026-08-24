import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // Where the API lives
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
});

// Re-export the hooks/methods we'll use across components
// so imports elsewhere are one-liner clean
export const {
  signUp,
  signIn,
  signOut,
  useSession,
} = authClient;