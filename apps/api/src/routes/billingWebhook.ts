import { Router, type Request, type Response } from "express";
import express from "express";
import { prisma } from "@pharos/db";
import { verifyWebhookSignature, mapStatus } from "../lib/razorpay.js";

/**
 * Razorpay webhook receiver. This is the SOURCE OF TRUTH for subscription
 * state — the browser checkout callback is only a UX hint. Mounted with a raw
 * body parser (not express.json) because the signature is computed over the
 * exact bytes Razorpay sent.
 *
 * Must be registered BEFORE app.use(express.json()) in index.ts.
 */
export const billingWebhookRouter = Router();

billingWebhookRouter.post(
  "/",
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response) => {
    const signature = req.header("x-razorpay-signature");
    const eventId = req.header("x-razorpay-event-id");
    const rawBody: Buffer = req.body; // Buffer, thanks to express.raw

    if (!signature || !eventId) {
      return res.status(400).json({ error: "Missing signature or event id" });
    }

    // 1. Verify authenticity. Reject anything we can't cryptographically trust.
    let valid = false;
    try {
      valid = verifyWebhookSignature(rawBody, signature);
    } catch (err) {
      console.error("[webhook] verify error:", err);
      return res.status(500).json({ error: "Webhook secret not configured" });
    }
    if (!valid) {
      return res.status(400).json({ error: "Invalid signature" });
    }

    // 2. Idempotency. Razorpay retries on any non-2xx, so a given event id may
    // arrive several times — process it once.
    try {
      await prisma.processedWebhook.create({
        data: { eventId, eventType: "pending" },
      });
    } catch {
      // Unique constraint => already processed. Ack so retries stop.
      return res.status(200).json({ status: "already processed" });
    }

    // 3. Parse and handle.
    let event: RazorpayWebhookEvent;
    try {
      event = JSON.parse(rawBody.toString("utf8"));
    } catch {
      return res.status(400).json({ error: "Invalid JSON" });
    }

    try {
      await handleEvent(event);
      await prisma.processedWebhook.update({
        where: { eventId },
        data: { eventType: event.event },
      });
      return res.status(200).json({ status: "ok" });
    } catch (err) {
      console.error(`[webhook] handler error for ${event.event}:`, err);
      // Roll back the idempotency marker so Razorpay's retry can try again.
      await prisma.processedWebhook.delete({ where: { eventId } }).catch(() => {});
      return res.status(500).json({ error: "Handler failed" });
    }
  },
);

// ─── Event handling ──────────────────────────────────────────────────

type RazorpaySubscriptionEntity = {
  id: string;
  status: string;
  current_end?: number | null;
  notes?: Record<string, string>;
};

type RazorpayWebhookEvent = {
  event: string;
  payload: {
    subscription?: { entity: RazorpaySubscriptionEntity };
  };
};

async function handleEvent(event: RazorpayWebhookEvent): Promise<void> {
  const entity = event.payload.subscription?.entity;
  if (!entity) return; // not a subscription event we care about

  // Find our subscription by Razorpay id.
  const sub = await prisma.subscription.findUnique({
    where: { razorpaySubscriptionId: entity.id },
  });
  if (!sub) {
    console.warn(`[webhook] no local subscription for ${entity.id}`);
    return;
  }

  const status = mapStatus(entity.status) as "CREATED" | "AUTHENTICATED" | "ACTIVE" | "PENDING" | "HALTED" | "CANCELLED" | "COMPLETED" | "EXPIRED";
  const currentPeriodEnd = entity.current_end
    ? new Date(entity.current_end * 1000)
    : sub.currentPeriodEnd;

  // Update our subscription record to match Razorpay.
  await prisma.subscription.update({
    where: { id: sub.id },
    data: { status, currentPeriodEnd },
  });

  // Decide the user's plan from the event. Pro is granted only on real
  // activation/charge; revoked when the sub ends and the paid period is over.
  const GRANT = ["subscription.activated", "subscription.charged", "subscription.resumed"];
  const REVOKE = [
    "subscription.halted",
    "subscription.cancelled",
    "subscription.completed",
    "subscription.expired",
  ];

  if (GRANT.includes(event.event)) {
    await prisma.user.update({ where: { id: sub.userId }, data: { plan: "PRO" } });
  } else if (REVOKE.includes(event.event)) {
    // Don't cut access early: if we still have paid time left, stay Pro until
    // it lapses. A daily job (or the next login check) can downgrade at expiry.
    const stillPaid = currentPeriodEnd && currentPeriodEnd.getTime() > Date.now();
    const cancelledImmediately = event.event === "subscription.cancelled" && !stillPaid;
    if (!stillPaid || cancelledImmediately) {
      await prisma.user.update({ where: { id: sub.userId }, data: { plan: "FREE" } });
    }
  }
}
