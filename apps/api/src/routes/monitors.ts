import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { prisma } from "@pharos/db";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  scheduleMonitorChecks,
  unscheduleMonitorChecks,
  enqueueImmediateCheck,
} from "../lib/queue.js";

export const monitorsRouter = Router();

// Every route in this router requires authentication.
// Mounted here once instead of on each route individually.
monitorsRouter.use(requireAuth);

// Plan limits. Free is capped; Pro is effectively unlimited and can check
// as often as every 60s. Enforced server-side so the UI can't bypass them.
const FREE_MAX_MONITORS = 5;
const FREE_MIN_INTERVAL = 300; // 5 minutes
const PRO_MIN_INTERVAL = 60;   // 1 minute

// ─── Zod schemas ─────────────────────────────────────────────

const createMonitorSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  url: z.string().url("Must be a valid URL"),
  intervalSeconds: z
    .number()
    .int()
    .min(30, "Interval must be at least 30 seconds")
    .max(3600, "Interval must be at most 1 hour")
    .default(300),
});

const updateMonitorSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  url: z.string().url().optional(),
  intervalSeconds: z.number().int().min(30).max(3600).optional(),
  status: z.enum(["ACTIVE", "PAUSED"]).optional(),
});

// ─── Routes ──────────────────────────────────────────────────

// POST /api/monitors — create a new monitor
monitorsRouter.post("/", async (req: Request, res: Response) => {
  const parsed = createMonitorSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid input",
      details: parsed.error.flatten(),
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { plan: true },
  });
  const isPro = user?.plan === "PRO";

  // Enforce the monitor count cap for Free.
  if (!isPro) {
    const count = await prisma.monitor.count({ where: { userId: req.user!.id } });
    if (count >= FREE_MAX_MONITORS) {
      return res.status(403).json({
        error: `Free plan is limited to ${FREE_MAX_MONITORS} monitors. Upgrade to Pro for unlimited monitors.`,
        code: "PLAN_LIMIT_MONITORS",
      });
    }
  }

  // Enforce the minimum check interval for the plan.
  const minInterval = isPro ? PRO_MIN_INTERVAL : FREE_MIN_INTERVAL;
  if (parsed.data.intervalSeconds < minInterval) {
    return res.status(403).json({
      error: isPro
        ? `The fastest check interval is ${minInterval} seconds.`
        : `Free plan checks run at most every ${minInterval} seconds. Upgrade to Pro for 1-minute checks.`,
      code: "PLAN_LIMIT_INTERVAL",
    });
  }

  const monitor = await prisma.monitor.create({
    data: {
      ...parsed.data,
      userId: req.user!.id,
    },
  });

  await scheduleMonitorChecks(monitor.id, monitor.intervalSeconds);
  await enqueueImmediateCheck(monitor.id);

  return res.status(201).json({ monitor });
});

// GET /api/monitors — list all monitors owned by the current user
monitorsRouter.get("/", async (req: Request, res: Response) => {
  const monitors = await prisma.monitor.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" },
    include: {
      // Pull the single latest check for each monitor
      checks: {
        orderBy: { checkedAt: "desc" },
        take: 1,
      },
      // Pull ongoing incidents so we know if this monitor is in an incident state
      incidents: {
        where: { status: "ONGOING" },
        take: 1,
      },
    },
  });

  // Flatten the shape for the frontend
  const withStatus = monitors.map((m) => ({
    id: m.id,
    name: m.name,
    url: m.url,
    intervalSeconds: m.intervalSeconds,
    status: m.status,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
    latestCheck: m.checks[0]
      ? {
          result: m.checks[0].result,
          statusCode: m.checks[0].statusCode,
          responseTime: m.checks[0].responseTime,
          errorMessage: m.checks[0].errorMessage,
          checkedAt: m.checks[0].checkedAt,
        }
      : null,
    hasOpenIncident: m.incidents.length > 0,
  }));

  return res.json({ monitors: withStatus });
});

// PATCH /api/monitors/:id — update a monitor (must own it)
monitorsRouter.patch("/:id", async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const parsed = updateMonitorSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid input",
      details: parsed.error.flatten(),
    });
  }

  // Ownership check baked into the query: findFirst with both id + userId.
  // If the monitor exists but belongs to someone else, this returns null.
  const existing = await prisma.monitor.findFirst({
    where: { id, userId: req.user!.id },
  });

  if (!existing) {
    return res.status(404).json({ error: "Monitor not found" });
  }

  const monitor = await prisma.monitor.update({
    where: { id },
    data: parsed.data,
  });

  // If interval or status changed, update the scheduler.
  if (parsed.data.intervalSeconds !== undefined) {
    await scheduleMonitorChecks(monitor.id, monitor.intervalSeconds);
  }

  return res.json({ monitor });
});

// DELETE /api/monitors/:id — delete a monitor (must own it)
monitorsRouter.delete("/:id", async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const existing = await prisma.monitor.findFirst({
    where: { id, userId: req.user!.id },
  });

  if (!existing) {
    return res.status(404).json({ error: "Monitor not found" });
  }

  await unscheduleMonitorChecks(id);

  await prisma.monitor.delete({ where: { id } });

  return res.status(204).send();
});