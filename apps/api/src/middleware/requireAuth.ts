import type { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../lib/auth.js";

// Extend Express's Request type so req.user and req.session are typed
declare module "express-serve-static-core" {
  interface Request {
    user?: {
      id: string;
      email: string;
      name: string;
      emailVerified: boolean;
      image: string | null;
      createdAt: Date;
      updatedAt: Date;
    };
    session?: {
      id: string;
      userId: string;
      expiresAt: Date;
      token: string;
    };
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Ask Better Auth to look up the session from the incoming cookies
    const result = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    // No session? Rejected.
    if (!result) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Attach user and session to the request for downstream handlers
    req.user = result.user as Request["user"];
    req.session = result.session as Request["session"];

    // All good — let the request continue to the actual route handler
    next();
  } catch (err) {
    console.error("[requireAuth] error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}