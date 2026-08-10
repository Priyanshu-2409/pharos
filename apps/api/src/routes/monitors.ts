import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { prisma } from "@pharos/db";
import { requireAuth } from "../middleware/requireAuth.js";

export const monitorsRouter = Router();

// Every route in this router requires authentication.
// Mounted here once instead of on each route individually.
monitorsRouter.use(requireAuth);

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

  const monitor = await prisma.monitor.create({
    data: {
      ...parsed.data,
      userId: req.user!.id,
    },
  });

  return res.status(201).json({ monitor });
});

// GET /api/monitors — list all monitors owned by the current user
monitorsRouter.get("/", async (req: Request, res: Response) => {
  const monitors = await prisma.monitor.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" },
  });

  return res.json({ monitors });
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

  await prisma.monitor.delete({ where: { id } });

  return res.status(204).send();
});