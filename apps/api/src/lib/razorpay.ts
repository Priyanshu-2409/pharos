import crypto from "crypto";

/**
 * Thin Razorpay REST client. We call the API directly rather than pulling in
 * the `razorpay` SDK, so there's one fewer dependency and the request shape is
 * explicit. Only the calls Pharos needs are implemented.
 *
 * Auth is HTTP Basic with key_id:key_secret. In test mode use the rzp_test_*
 * keys; live mode uses rzp_live_* — the code is identical, only env changes.
 */

const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const BASE = "https://api.razorpay.com/v1";

function authHeader(): string {
  if (!KEY_ID || !KEY_SECRET) {
    throw new Error("RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set");
  }
  return "Basic " + Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64");
}

async function rzp<T>(path: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const message = json?.error?.description ?? `Razorpay ${method} ${path} failed (${res.status})`;
    throw new Error(message);
  }
  return json as T;
}

export type RazorpaySubscription = {
  id: string;
  entity: "subscription";
  plan_id: string;
  customer_id?: string;
  status: string;
  current_end?: number | null; // unix seconds
  current_start?: number | null;
  short_url?: string;
  notes?: Record<string, string>;
};

/**
 * Create a subscription. `totalCount` is how many billing cycles to run:
 * for a monthly plan that's the number of months, for an annual plan it's the
 * number of years. We use a large count so it renews until cancelled.
 */
export function createSubscription(params: {
  planId: string;
  totalCount: number;
  notes?: Record<string, string>;
}): Promise<RazorpaySubscription> {
  return rzp<RazorpaySubscription>("/subscriptions", "POST", {
    plan_id: params.planId,
    total_count: params.totalCount,
    customer_notify: 1,
    notes: params.notes ?? {},
  });
}

export function fetchSubscription(id: string): Promise<RazorpaySubscription> {
  return rzp<RazorpaySubscription>(`/subscriptions/${id}`, "GET");
}

export function cancelSubscription(
  id: string,
  cancelAtCycleEnd: boolean,
): Promise<RazorpaySubscription> {
  return rzp<RazorpaySubscription>(`/subscriptions/${id}/cancel`, "POST", {
    cancel_at_cycle_end: cancelAtCycleEnd ? 1 : 0,
  });
}

/**
 * Verify the signature Razorpay sends on the checkout success handler.
 * For subscriptions the signed payload is `${razorpay_payment_id}|${subscription_id}`
 * (note: payment id first, then subscription id — different from one-time orders).
 */
export function verifyCheckoutSignature(params: {
  razorpayPaymentId: string;
  razorpaySubscriptionId: string;
  razorpaySignature: string;
}): boolean {
  if (!KEY_SECRET) throw new Error("RAZORPAY_KEY_SECRET is not set");
  const expected = crypto
    .createHmac("sha256", KEY_SECRET)
    .update(`${params.razorpayPaymentId}|${params.razorpaySubscriptionId}`)
    .digest("hex");
  return timingSafeEqual(expected, params.razorpaySignature);
}

/**
 * Verify a webhook body against the X-Razorpay-Signature header. The signature
 * is an HMAC-SHA256 of the *raw* request body using the webhook secret (which
 * is separate from the API key secret — set it when you create the webhook).
 */
export function verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) throw new Error("RAZORPAY_WEBHOOK_SECRET is not set");
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return timingSafeEqual(expected, signature);
}

function timingSafeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

// Map Razorpay's subscription status strings to our enum values.
export function mapStatus(rzpStatus: string): string {
  const map: Record<string, string> = {
    created: "CREATED",
    authenticated: "AUTHENTICATED",
    active: "ACTIVE",
    pending: "PENDING",
    halted: "HALTED",
    cancelled: "CANCELLED",
    completed: "COMPLETED",
    expired: "EXPIRED",
  };
  return map[rzpStatus] ?? "CREATED";
}
