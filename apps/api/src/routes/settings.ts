import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { prisma } from "@pharos/db";
import { requireAuth } from "../middleware/requireAuth.js";

export const settingsRouter = Router();
settingsRouter.use(requireAuth);

// GET /api/settings — returns user + current notification email
settingsRouter.get("/", async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      notificationChannels: {
        where: { type: "EMAIL" },
        take: 1,
      },
    },
  });

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const emailChannel = user.notificationChannels[0];
  const notificationEmail = emailChannel
    ? (emailChannel.config as { email?: string }).email ?? user.email
    : user.email;

  return res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    notificationEmail,
    hasChannel: !!emailChannel,
  });
});

// PATCH /api/settings — update notification email (upsert EMAIL channel)
const updateSchema = z.object({
  notificationEmail: z.string().email(),
});

settingsRouter.patch("/", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid input",
      details: parsed.error.flatten(),
    });
  }

  const existing = await prisma.notificationChannel.findFirst({
    where: { userId, type: "EMAIL" },
  });

  if (existing) {
    await prisma.notificationChannel.update({
      where: { id: existing.id },
      data: {
        config: { email: parsed.data.notificationEmail },
      },
    });
  } else {
    await prisma.notificationChannel.create({
      data: {
        userId,
        type: "EMAIL",
        name: "Default email",
        config: { email: parsed.data.notificationEmail },
        isVerified: true, // V1: skip verification
      },
    });
  }

  return res.json({
    ok: true,
    notificationEmail: parsed.data.notificationEmail,
  });
});