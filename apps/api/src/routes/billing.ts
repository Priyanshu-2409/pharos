import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { prisma } from "@pharos/db";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  createSubscription,
  cancelSubscription,
  verifyCheckoutSignature,
  mapStatus,
} from "../lib/razorpay.js";

export const billingRouter = Router();

// Razorpay plan ids come from env — you create the two plans once in the
// Razorpay dashboard (or via API) and paste their ids here.
const PLANS = {
  MONTHLY: process.env.RAZORPAY_PLAN_MONTHLY ?? "",
  YEARLY: process.env.RAZORPAY_PLAN_YEARLY ?? "",
} as const;

// Renew for a long time; the user cancels to stop. 120 monthly cycles = 10y,
// 12 yearly cycles = 12y. Razorpay requires a finite total_count.
const TOTAL_COUNT = { MONTHLY: 120, YEARLY: 12 } as const;

// ─── Create a subscription (authenticated) ───────────────────────────
const subscribeSchema = z.object({
  cycle: z.enum(["MONTHLY", "YEARLY"]),
});

billingRouter.post("/subscribe", requireAuth, async (req: Request, res: Response) => {
  const parsed = subscribeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }
  const { cycle } = parsed.data;
  const planId = PLANS[cycle];
  if (!planId) {
    return res.status(500).json({ error: `No Razorpay plan configured for ${cycle}` });
  }

  const userId = req.user!.id;

  // Guard: don't let an already-active subscriber create a second one.
  const existing = await prisma.subscription.findUnique({ where: { userId } });
  if (existing && ["ACTIVE", "AUTHENTICATED", "PENDING"].includes(existing.status)) {
    return res.status(409).json({ error: "You already have an active subscription" });
  }

  try {
    const sub = await createSubscription({
      planId,
      totalCount: TOTAL_COUNT[cycle],
      notes: { userId, cycle },
    });

    // Upsert our record in CREATED state. The webhook flips it to ACTIVE once
    // Razorpay confirms the first charge — we do NOT grant Pro here.
    await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        razorpaySubscriptionId: sub.id,
        planId,
        cycle,
        status: mapStatus(sub.status),
      },
      update: {
        razorpaySubscriptionId: sub.id,
        planId,
        cycle,
        status: mapStatus(sub.status),
        cancelAtPeriodEnd: false,
      },
    });

    // Frontend opens Razorpay Checkout with this subscription id + the public key.
    return res.status(201).json({
      subscriptionId: sub.id,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("[billing] subscribe failed:", err);
    return res.status(502).json({ error: "Could not start subscription" });
  }
});

// ─── Verify checkout handoff (authenticated) ─────────────────────────
// Called by the frontend right after Razorpay Checkout succeeds. This is a
// UX signal only — the source of truth is the webhook. We verify the
// signature so a client can't spoof "success", but we still wait for the
// webhook to grant Pro.
const verifySchema = z.object({
  razorpay_payment_id: z.string(),
  razorpay_subscription_id: z.string(),
  razorpay_signature: z.string(),
});

billingRouter.post("/verify", requireAuth, async (req: Request, res: Response) => {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }
  const ok = verifyCheckoutSignature({
    razorpayPaymentId: parsed.data.razorpay_payment_id,
    razorpaySubscriptionId: parsed.data.razorpay_subscription_id,
    razorpaySignature: parsed.data.razorpay_signature,
  });
  if (!ok) {
    return res.status(400).json({ error: "Signature verification failed" });
  }
  // Confirmed the handoff is genuine. Pro may take a few seconds (webhook).
  return res.json({ verified: true });
});

// ─── Current subscription (authenticated) ────────────────────────────
billingRouter.get("/subscription", requireAuth, async (req: Request, res: Response) => {
  const sub = await prisma.subscription.findUnique({
    where: { userId: req.user!.id },
  });
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { plan: true },
  });
  return res.json({
    plan: user?.plan ?? "FREE",
    subscription: sub
      ? {
          status: sub.status,
          cycle: sub.cycle,
          currentPeriodEnd: sub.currentPeriodEnd,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        }
      : null,
  });
});

// ─── Cancel (authenticated) ──────────────────────────────────────────
billingRouter.post("/cancel", requireAuth, async (req: Request, res: Response) => {
  const sub = await prisma.subscription.findUnique({ where: { userId: req.user!.id } });
  if (!sub?.razorpaySubscriptionId) {
    return res.status(404).json({ error: "No active subscription" });
  }
  try {
    // cancel_at_cycle_end: keep Pro until the paid period ends, then stop.
    await cancelSubscription(sub.razorpaySubscriptionId, true);
    await prisma.subscription.update({
      where: { userId: req.user!.id },
      data: { cancelAtPeriodEnd: true },
    });
    return res.json({ ok: true });
  } catch (err) {
    console.error("[billing] cancel failed:", err);
    return res.status(502).json({ error: "Could not cancel subscription" });
  }
});
