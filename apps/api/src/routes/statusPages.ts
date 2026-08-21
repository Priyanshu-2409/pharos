import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { prisma } from "@pharos/db";
import { requireAuth } from "../middleware/requireAuth.js";

export const statusPagesRouter = Router();
statusPagesRouter.use(requireAuth);

// ─── Zod schemas ─────────────────────────────────────────────

// Slug rules: lowercase letters, digits, hyphens; 3-32 chars
const slugRegex = /^[a-z0-9-]+$/;

const createSchema = z.object({
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .max(32, "Slug must be at most 32 characters")
    .regex(slugRegex, "Slug can only contain lowercase letters, numbers, and hyphens"),
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
});

const updateSchema = z.object({
  slug: z.string().min(3).max(32).regex(slugRegex).optional(),
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  isPublic: z.boolean().optional(),
});

const setMonitorsSchema = z.object({
  monitorIds: z.array(z.string()),
});

// ─── Routes ──────────────────────────────────────────────────

// GET /api/status-pages — list all status pages owned by user
statusPagesRouter.get("/", async (req: Request, res: Response) => {
  const pages = await prisma.statusPage.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" },
    include: {
      monitors: {
        include: { monitor: { select: { id: true, name: true } } },
        orderBy: { displayOrder: "asc" },
      },
    },
  });

  const shaped = pages.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    description: p.description,
    isPublic: p.isPublic,
    createdAt: p.createdAt,
    monitors: p.monitors.map((m) => ({
      id: m.monitor.id,
      name: m.monitor.name,
    })),
  }));

  return res.json({ statusPages: shaped });
});

// POST /api/status-pages — create
statusPagesRouter.post("/", async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid input",
      details: parsed.error.flatten(),
    });
  }

  // Check slug is not already taken (globally unique)
  const existing = await prisma.statusPage.findUnique({
    where: { slug: parsed.data.slug },
  });
  if (existing) {
    return res.status(409).json({ error: "Slug is already taken" });
  }

  const page = await prisma.statusPage.create({
    data: {
      ...parsed.data,
      userId: req.user!.id,
    },
  });

  return res.status(201).json({ statusPage: page });
});

// PATCH /api/status-pages/:id — update metadata
statusPagesRouter.patch("/:id", async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid input",
      details: parsed.error.flatten(),
    });
  }

  const existing = await prisma.statusPage.findFirst({
    where: { id, userId: req.user!.id },
  });
  if (!existing) {
    return res.status(404).json({ error: "Status page not found" });
  }

  // If changing slug, verify not taken
  if (parsed.data.slug && parsed.data.slug !== existing.slug) {
    const slugTaken = await prisma.statusPage.findUnique({
      where: { slug: parsed.data.slug },
    });
    if (slugTaken) {
      return res.status(409).json({ error: "Slug is already taken" });
    }
  }

  const updated = await prisma.statusPage.update({
    where: { id },
    data: parsed.data,
  });

  return res.json({ statusPage: updated });
});

// DELETE /api/status-pages/:id — delete (cascades StatusPageMonitor rows)
statusPagesRouter.delete("/:id", async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const existing = await prisma.statusPage.findFirst({
    where: { id, userId: req.user!.id },
  });
  if (!existing) {
    return res.status(404).json({ error: "Status page not found" });
  }

  await prisma.statusPage.delete({ where: { id } });

  return res.status(204).send();
});

// PUT /api/status-pages/:id/monitors — replace the set of monitors on a status page
// Body: { monitorIds: string[] } in the desired display order
statusPagesRouter.put("/:id/monitors", async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const parsed = setMonitorsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid input",
      details: parsed.error.flatten(),
    });
  }

  // Ownership check on the status page
  const page = await prisma.statusPage.findFirst({
    where: { id, userId: req.user!.id },
  });
  if (!page) {
    return res.status(404).json({ error: "Status page not found" });
  }

  // Ownership check: every monitorId in the body must belong to this user
  if (parsed.data.monitorIds.length > 0) {
    const ownedMonitors = await prisma.monitor.findMany({
      where: {
        id: { in: parsed.data.monitorIds },
        userId: req.user!.id,
      },
      select: { id: true },
    });
    if (ownedMonitors.length !== parsed.data.monitorIds.length) {
      return res.status(403).json({ error: "One or more monitors don't belong to you" });
    }
  }

  // Replace-set pattern: delete existing links, insert new ones
  await prisma.$transaction([
    prisma.statusPageMonitor.deleteMany({ where: { statusPageId: id } }),
    prisma.statusPageMonitor.createMany({
      data: parsed.data.monitorIds.map((monitorId, index) => ({
        statusPageId: id,
        monitorId,
        displayOrder: index,
      })),
    }),
  ]);

  return res.json({ ok: true });
});
